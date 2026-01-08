const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Reading = require('../Modals/Reading');
const Tenant = require('../Modals/Tenant');
const ExcelJS = require('exceljs');

cloudinary.config({
  cloud_name: 'dvgzuzzsn',
  api_key: '294445521664239',
  api_secret: 'uwOnDRFxsFQKDJK-2g3yNBVTPkQ'
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
    
    if (!req.file) return res.status(400).json({ msg: "Photo is required" });

    const now = new Date();
    const monthStr = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const newReading = new Reading({
      tenantId,
      adminId,
      staffId,
      closingReading: Number(closingReading),
      photo: req.file.path,
      month: monthStr
    });
    await newReading.save();

    
   await Tenant.findByIdAndUpdate(tenantId, {
      $inc: { currentClosing: Number(closingReading) },
      lastUpdated: now
    });

    res.status(201).json({ 
      msg: "Reading Added & Tenant Updated ✅", 
      data: newReading 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});


router.get('/history/:tenantId', async (req, res) => {
  try {
    const history = await Reading.find({ tenantId: req.params.tenantId }).sort({ createdAt: -1 }); 
    res.json(history);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/all/:adminId', async (req, res) => {
  try {
    const data = await Reading.find({ adminId: req.params.adminId })
      .populate('tenantId', 'name meterId openingMeter') // नाम, मीटर और ओपनिंग मंगवाई
      .populate('staffId', 'name')
      .sort({ createdAt: -1 }); // नई रीडिंग सबसे ऊपर
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/export/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const readings = await Reading.find({ adminId })
      .populate('tenantId') 
      .populate('staffId', 'name')
      .sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Electricity Log');

    worksheet.columns = [
      { header: 'Date & Time', key: 'timestamp', width: 25 },
      { header: 'Staff Name', key: 'staff', width: 20 },
      { header: 'Shop Name', key: 'tenant', width: 20 },
      { header: 'Meter ID', key: 'meter', width: 15 },
      { header: 'Base Opening (kWh)', key: 'opening', width: 20 },
      { header: 'Added Reading (Today)', key: 'added', width: 20 },
      { header: 'New Total (Closing)', key: 'total', width: 20 },
    ];

    readings.forEach((r) => {
      const baseOpening = r.tenantId ? r.tenantId.openingMeter : 0;
      // नोट: चूंकि आप $inc (plus) कर रहे हैं, तो 'closingReading' यहाँ वो 'Daily Addon' है
      worksheet.addRow({
        timestamp: new Date(r.createdAt).toLocaleString('en-IN'),
        staff: r.staffId?.name || 'N/A',
        tenant: r.tenantId?.name || 'N/A',
        meter: r.tenantId?.meterId || 'N/A',
        opening: baseOpening,
        added: r.closingReading,
        total: baseOpening + r.closingReading // या जो भी आपका कैलकुलेशन लॉजिक है
      });
    });

    worksheet.getRow(1).font = { bold: true };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Readings_Report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;