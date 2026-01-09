const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose'); 

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { 
    folder: 'official_bills', 
    allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'] 
  },
});
const upload = multer({ storage: storage });

router.post('/add', upload.single('billFile'), async (req, res) => {
  try {
    const { adminId, month, totalUnits, energyCharges, fixedCharges, taxes } = req.body;

    const total = Number(energyCharges) + Number(fixedCharges) + Number(taxes);

    const newBill = new Bill({
      adminId: new mongoose.Types.ObjectId(adminId),
      month,
      totalUnits: Number(totalUnits),
      energyCharges: Number(energyCharges),
      fixedCharges: Number(fixedCharges),
      taxes: Number(taxes),
      totalAmount: total,
      billUrl: req.file ? req.file.path : "" 
    });

    await newBill.save();
    res.status(201).json(newBill);
  } catch (err) {
    console.error("Bill Save Error:", err.message);
    res.status(400).json({ msg: err.message });
  }
});

router.get('/history/:adminId', async (req, res) => {
  try {
    const history = await Bill.find({ adminId: req.params.adminId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});



module.exports = router;