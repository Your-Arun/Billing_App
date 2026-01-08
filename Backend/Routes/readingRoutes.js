const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Reading = require('../Modals/Reading');
const Tenant = require('../Modals/Tenant');

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
      currentClosing: Number(closingReading),
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


module.exports = router;