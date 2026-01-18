const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');

// Cloudinary Config
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'official_bills', resource_type: 'raw', format: 'pdf' },
});
const upload = multer({ storage: storage });

// 📥 ADD BILL (Manual Entry)
router.post('/add', upload.single('billFile'), async (req, res) => {
  try {
    const { adminId, month, totalUnits, energyCharges, fixedCharges, totalAmount } = req.body;

    const newBill = new Bill({
      adminId: new mongoose.Types.ObjectId(adminId),
      month,
      totalUnits: Number(totalUnits),
      energyCharges: Number(energyCharges),
      fixedCharges: Number(fixedCharges),
      totalAmount: Number(totalAmount), // User ne jo Total Amount dala wahi save hoga
      billUrl: req.file ? req.file.path : "" 
    });

    await newBill.save();
    res.status(201).json(newBill);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// 📜 FETCH HISTORY
router.get('/history/:adminId', async (req, res) => {
  try {
    const history = await Bill.find({ adminId: req.params.adminId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// 🗑️ DELETE BILL
router.delete('/delete/:id', async (req, res) => {
  try {
    await Bill.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ msg: "Delete failed" });
  }
});

module.exports = router;