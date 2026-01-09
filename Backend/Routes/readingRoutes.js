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
    
    const newReading = new Reading({
      tenantId, adminId, staffId,
      openingReading: 0,
      closingReading: Number(closingReading),
      photo: req.file.path,
      month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      status: 'Pending' 
    });
    await newReading.save();

    res.status(201).json({ msg: "Sent for Approval" });
  } catch (err) { res.status(500).json({ msg: err.message }); }
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





//abhi likha hai bss

// GET: /api/tenants/:adminId (स्टाफ के लिए अपडेटेड)
router.get('/:adminId', async (req, res) => {
  try {
    const tenants = await Tenant.find({ adminId: req.params.adminId });

    // आज की तारीख की शुरुआत और अंत
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const tenantsWithStatus = await Promise.all(tenants.map(async (t) => {
      // आज की रीडिंग ढूंढें
      const todayReading = await Reading.findOne({
        tenantId: t._id,
        createdAt: { $gte: start, $lte: end }
      });

      return {
        ...t._doc,
        todayStatus: todayReading ? todayReading.status : 'Ready', 
        rejectionReason: todayReading ? todayReading.rejectionReason : ""
      };
    }));

    res.json(tenantsWithStatus);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/pending/:adminId', async (req, res) => {
  const data = await Reading.find({ adminId: req.params.adminId, status: 'Pending' })
    .populate('tenantId', 'name meterId')
    .populate('staffId', 'name');
  res.json(data);
});

// 3. 🟢 APPROVE: यहाँ मास्टर डेटा अपडेट होगा
router.put('/approve/:id', async (req, res) => {
  try {
    const reading = await Reading.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
    
    // अब मास्टर टेनेंट टेबल में डेटा प्लस करो
    await Tenant.findByIdAndUpdate(reading.tenantId, {
      $inc: { currentClosing: reading.closingReading },
      lastUpdated: new Date()
    });
    res.json({ msg: "Approved & Data Locked" });
  } catch (err) { res.status(500).send(err.message); }
});

// 4. 🔴 REJECT: स्टाफ को दोबारा भरने के लिए भेजें
router.put('/reject/:id', async (req, res) => {
  const { reason } = req.body;
  await Reading.findByIdAndUpdate(req.params.id, { status: 'Rejected', rejectionReason: reason });
  res.json({ msg: "Rejected" });
});


module.exports = router;