const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Reading = require('../Modals/Reading');
const Tenant = require('../Modals/Tenant');
const ExcelJS = require('exceljs');
require('dotenv').config(); 

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

    if (!tenantId || !adminId || !staffId || !closingReading) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    if (!req.file) {
      return res.status(400).json({ msg: "Photo is required" });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ msg: "Tenant not found" });
    }

    const closing = Number(closingReading);
    if (isNaN(closing)) {
      return res.status(400).json({ msg: "Invalid reading value" });
    }

    // 🔒 Prevent duplicate reading (per tenant per staff per day)
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const alreadyDone = await Reading.findOne({
      tenantId,
      staffId,
      createdAt: { $gte: start, $lte: end }
    });

    if (alreadyDone) {
      return res.status(400).json({
        msg: "Reading already submitted today"
      });
    }

    const now = new Date();
    const monthStr = now.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const newReading = new Reading({
      tenantId,
      adminId,
      staffId,
      openingReading: tenant.currentClosing || 0,
      closingReading: closing,
      photo: req.file.path,
      month: monthStr
    });

    await newReading.save();

    // 🔄 Update tenant
    tenant.currentClosing = closing;
    tenant.lastUpdated = now;
    await tenant.save();

    // ✅ populate for frontend instant display
    const populatedReading = await Reading.findById(newReading._id)
      .populate('tenantId', 'name')
      .populate('staffId', 'name');

    res.status(201).json({
      msg: "Reading Added Successfully ✅",
      data: populatedReading
    });

  } catch (err) {
    console.error("ADD READING ERROR:", err);
    res.status(500).json({ msg: err.message });
  }
});


//readingscreen pe
router.get('/all/:adminId', async (req, res) => {
  try {
    const data = await Reading.find({ adminId: req.params.adminId })
      .populate('tenantId', 'name meterId')     
      .sort({ createdAt: -1 }); 
    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});



//roughly wale
router.get('/range', async (req, res) => {
  try {
    const { adminId, startDate, endDate } = req.query;

    const data = await Reading.find({
      adminId,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
    .populate('tenantId', 'name meterId ratePerUnit')
    .populate('staffId', 'name')
    .sort({ createdAt: 1 });

    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/export/range', async (req, res) => {
  const { adminId, startDate, endDate } = req.query;

  const readings = await Reading.find({
    adminId,
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  })
  .populate('tenantId', 'name meterId ratePerUnit')
  .populate('staffId', 'name');

  const sheet = workbook.addWorksheet('Report');

  sheet.columns = [
    { header: 'Date', key: 'date' },
    { header: 'Tenant', key: 'tenant' },
    { header: 'Meter', key: 'meter' },
    { header: 'Opening', key: 'opening' },
    { header: 'Closing', key: 'closing' },
    { header: 'Units', key: 'units' },
    { header: 'Rate', key: 'rate' },
    { header: 'Amount', key: 'amount' },
    { header: 'Taken By', key: 'staff' }
  ];

  readings.forEach(r => {
    const units = r.closingReading - r.openingReading;
    sheet.addRow({
      date: r.createdAt.toLocaleDateString('en-IN'),
      tenant: r.tenantId.name,
      meter: r.tenantId.meterId,
      opening: r.openingReading,
      closing: r.closingReading,
      units,
      rate: r.tenantId.ratePerUnit,
      amount: units * r.tenantId.ratePerUnit,
      staff: r.staffId.name
    });
  });

  await workbook.xlsx.write(res);
  res.end();
});


router.get('/export/:adminId', async (req, res) => {
  try {
    const { from, to } = req.query;

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
      { header: 'Tenant Name', key: 'tenant', width: 20 },
      { header: 'Meter ID', key: 'meter', width: 15 },
      { header: 'Reading', key: 'reading', width: 12 },
      { header: 'Staff', key: 'staff', width: 18 },
      { header: 'Date & Time', key: 'time', width: 22 },
    ];

    readings.forEach((r) => {
      sheet.addRow({
        tenant: r.tenantId?.name,
        meter: r.tenantId?.meterId,
        reading: r.closingReading,
        staff: r.staffId,
        time: new Date(r.createdAt).toLocaleString(),
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Meter_Readings.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Excel export failed' });
  }
});


module.exports = router;