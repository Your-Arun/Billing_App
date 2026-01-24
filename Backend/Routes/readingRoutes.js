const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Reading = require('../Modals/Reading');
const Tenant = require('../Modals/Tenant');
const ExcelJS = require('exceljs');
require('dotenv').config(); 
const mongoose = require('mongoose');

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'meter_readings', 
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage: storage });

router.post('/add', upload.single('photo'), async (req, res) => {
  try {
    const { tenantId, adminId, staffId, closingReading } = req.body;
    
    // 🟢 सुधार 1: आज की शुद्ध तारीख (बिना समय के)
    const now = new Date();
    const logDate = new Date(now);
    logDate.setHours(0, 0, 0, 0); 

    const dateKey = now.toISOString().split('T')[0]; 

    const monthStr = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    // 🟢 सुधार 2: चेक करें कि आज के लिए पहले से रीडिंग तो नहीं है
    const alreadyExists = await Reading.findOne({
      tenantId,
      dateKey
    });

    if (alreadyExists) {
      return res.status(409).json({
        msg: 'Today reading already submitted for this tenant'
      });
    }

    const newReading = new Reading({
      tenantId,
      adminId,
      staffId,
      closingReading: Number(closingReading),
      photo: req.file.path,
      month: monthStr,
      status: 'Pending',
      dateKey, 
      createdAt: now 
    });

    await newReading.save();

    res.status(201).json({ msg: "Sent for Approval" });
  } catch (err) {
    console.error("Save Error:", err.message);
    res.status(500).json({ msg: err.message });
  }
});


//fecth krne ke lie
router.get('/all/:adminId', async (req, res) => {
  try {
    const adminId = new mongoose.Types.ObjectId(req.params.adminId);

    const data = await Reading.find({ adminId })
      .populate('tenantId', 'name meterId')
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: err.message });
  }
});
//excelsheet download wali
router.get('/export/:adminId', async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ msg: 'From & To date required' });
    }

    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const readings = await Reading.find({
      adminId: req.params.adminId,
      createdAt: { $gte: start, $lte: end },
    })
      .populate('tenantId', 'name meterId')
      .sort({ createdAt: 1 }); 

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Readings');

    sheet.columns = [
      { header: 'S No.', key: 'sno', width: 8 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Time', key: 'time', width: 14 },
      { header: 'Tenant Name', key: 'tenant', width: 22 },
      { header: 'Meter ID', key: 'meter', width: 16 },
      { header: 'Reading (kWh)', key: 'reading', width: 15 },
      { header: 'Entered By', key: 'staff', width: 20 },
    ];

    let i = 1;

    readings.forEach((r) => {
      const dt = new Date(r.createdAt);

      sheet.addRow({
        sno: i++, // ✅ SERIAL NUMBER
        date: dt.toLocaleDateString('en-IN'),
        time: dt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        tenant: r.tenantId?.name || '',
        meter: r.tenantId?.meterId || '',
        reading: r.closingReading,
        staff: r.staffId || 'User Deleted',
      });
    });

    // ✅ HEADER BOLD
    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Meter_Readings_Daywise.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('EXPORT ERROR:', err);
    res.status(500).json({ msg: 'Excel export failed' });
  }
});
//iske upar reading screen ke hai ......






//sequence of approval and rejection

router.get('/pending/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const mongoose = require('mongoose'); 
    
    const data = await Reading.find({ 
      adminId: new mongoose.Types.ObjectId(adminId), 
      status: 'Pending' 
    })
    .populate('tenantId', 'name meterId') 
    .sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// GET /tenants/:adminId
router.put('/approve/:id', async (req, res) => {
  try {
    const reading = await Reading.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
    if (!reading) return res.status(404).json({ msg: "Reading not found" });

    // 🟢 सुधार: यहाँ $inc इस्तेमाल करें ताकि रीडिंग प्लस (+) होती रहे
    await Tenant.findByIdAndUpdate(reading.tenantId, {
       currentClosing: reading.closingReading , 
      lastUpdated: new Date()
    });

    res.json({ msg: "Approved and Units Added ✅" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// 🔴 2. REJECT: रिजेक्शन की वजह के साथ
router.put('/reject/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    const reading = await Reading.findByIdAndUpdate(req.params.id, { 
      status: 'Rejected', 
      rejectionReason: reason || "Photo is not clear / Wrong data" 
    });
    if (!reading) return res.status(404).json({ msg: "Reading not found" });
    
    res.json({ msg: "Rejected Successfully ❌" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/:adminId', async (req, res) => {
  try {
    // lean() बहुत ज़रूरी है ताकि todayStatus जुड़ सके
    const tenants = await Tenant.find({ adminId: req.params.adminId }).lean();

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const tenantsWithStatus = await Promise.all(tenants.map(async (tenant) => {
      const todayReading = await Reading.findOne({
        tenantId: tenant._id,
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: -1 });

      return {
        ...tenant,
        todayStatus: todayReading ? todayReading.status : 'Ready', 
        rejectionReason: todayReading ? todayReading.rejectionReason : ""
      };
    }));

    res.json(tenantsWithStatus);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});


// 🟢 पेंडिंग के अलावा बाकी सारी रीडिंग्स (Approved/Rejected)
router.get('/history-all/:adminId', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const history = await Reading.find({ 
      adminId: new mongoose.Types.ObjectId(req.params.adminId), 
      status: { $ne: 'Pending' } 
    })
    .populate('tenantId', 'name meterId')
    .sort({ updatedAt: -1 }); // ताज़ा फैसला सबसे ऊपर

    res.json(history);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});



router.get('/opening/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const firstApproved = await Reading.findOne({
      tenantId,
      status: 'Approved',
      createdAt: { $gte: startOfMonth }
    }).sort({ createdAt: 1 }); // 👈 first of month

    if (!firstApproved) {
      return res.json({ openingReading: 0 });
    }

    res.json({
      openingReading: firstApproved.closingReading
    });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// 🗑️ DELETE Specific Reading (History cleanup)
router.delete('/:id', async (req, res) => {
  try {
    const reading = await Reading.findByIdAndDelete(req.params.id);
    if (!reading) return res.status(404).json({ msg: "Reading not found" });
    
    res.json({ success: true, msg: "Record deleted successfully 🗑️" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

//nhh hua 
router.put('/update-reading/:readingId', async (req, res) => {
    try {
        const { readingId } = req.params;
        const { newReading } = req.body;

        // 1. ID Validation
        if (!readingId || readingId === "null" || !mongoose.Types.ObjectId.isValid(readingId)) {
            return res.status(400).json({ msg: "No record found to update for this date range" });
        }

        const updatedVal = Number(newReading);

        // 2. Update the Reading log
        const reading = await Reading.findByIdAndUpdate(
            readingId,
            { closingReading: updatedVal, status: 'Approved' },
            { new: true }
        );

        if (!reading) return res.status(404).json({ msg: "Reading record not found" });

        // 3. Sync with Tenant Profile (Important for Dashboard)
        await Tenant.findByIdAndUpdate(reading.tenantId, {
            currentClosing: updatedVal,
            lastUpdated: new Date()
        });

        res.json({ success: true, msg: "Updated successfully ✅" });

    } catch (err) {
        console.error("Update Error:", err.message);
        res.status(500).json({ msg: "Server error: " + err.message });
    }
});

module.exports = router;