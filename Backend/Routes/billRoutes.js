const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');

const pdfParse = require('pdf-parse');

const storageMemory = multer.memoryStorage();
const uploadMemory = multer({ storage: storageMemory });

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

// Storage for Saving
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'official_bills', resource_type: 'raw', format: 'pdf' },
});
const upload = multer({ storage: storage });


router.post('/extract', uploadMemory.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "File missing" });

    const data = await pdfParse(req.file.buffer);
    
    // 1. Poore text ko saaf karein: Comma hatayein, New lines ko space banayein
    let cleanText = data.text.replace(/,/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ');

    // 🛠️ SMART SEARCH: Keyword ke baad aane wali numeric value dhundhna
    const findNumericValue = (keyword) => {
      // Yeh dhoondhega: Keyword -> 1 to 50 characters (kuch bhi) -> Number (123.45)
      const regex = new RegExp(`${keyword}.{1,50}?\\b(\\d+\\.\\d+|\\d+)\\b`, 'i');
      const match = cleanText.match(regex);
      return (match && match[1]) ? match[1] : "0.00";
    };

    // AVVNL Bill Specific Keywords
    const extractedData = {
      units: findNumericValue("Net Billed Units"),
      energy: findNumericValue("Energy Charges"),
      fixed: findNumericValue("Fixed Charges"),
      total: findNumericValue("Total Amount (S.No 11 to 17)") 
    };

    // Backup if Total Point 18 fails
    if (extractedData.total === "0.00") {
      extractedData.total = findNumericValue("Net Payable Amount");
    }

    res.json(extractedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to read PDF format" });
  }
});



// 💾 SAVE RECORD ROUTE (Now un-commented and fixed)
router.post('/add', upload.single('billFile'), async (req, res) => {
    try {
      const { adminId, month, totalUnits, energyCharges, fixedCharges, totalAmount } = req.body;
     
  
      const newBill = new Bill({
        adminId: new mongoose.Types.ObjectId(adminId),
        month,
        totalUnits: Number(totalUnits),
        energyCharges: Number(energyCharges),
        fixedCharges: Number(fixedCharges),
        totalAmount: Number(totalAmount),
        billUrl: req.file ? req.file.path : "" 
      });
  
      await newBill.save();
      res.status(201).json(newBill);
    } catch (err) {
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

router.delete('/delete/:id', async (req, res) => {
    try {
      await Bill.findByIdAndDelete(req.params.id);
      res.json({ success: true, msg: "Deleted ✅" });
    } catch (err) {
      res.status(500).json({ msg: "Delete failed" });
    }
});

module.exports = router;