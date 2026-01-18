const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js'); // For Scanned PDF

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

// Storage for Extraction (Memory)
const storageMemory = multer.memoryStorage();
const uploadMemory = multer({ storage: storageMemory });


router.post('/extract', uploadMemory.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    let extractedText = "";

    // 1️⃣ अगर फाइल PDF है
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      extractedText = data.text;
    } 
    // 2️⃣ अगर फाइल फोटो (Image) है - असली "Scan" यहीं होगा
    else {
      const result = await Tesseract.recognize(req.file.buffer, 'eng');
      extractedText = result.data.text;
    }

    // 🛠️ टेक्स्ट को साफ़ करें (कोमा हटाएं और सब एक लाइन में करें)
    let cleanText = extractedText.replace(/,/g, '').replace(/\n/g, ' ');

    // 🛠️ Smart Extraction Function
    const findValue = (keyword) => {
      // कीवर्ड के बाद 1 से 60 कैरेक्टर के अंदर जो भी नंबर मिले उसे उठा लो
      const regex = new RegExp(`${keyword}[\\s\\S]{1,60}?([\\d.]+)`, 'i');
      const match = cleanText.match(regex);
      return (match && match[1] && parseFloat(match[1]) > 0) ? match[1] : "0.00";
    };

    // 🔍 AVVNL स्पेसिफिक डेटा निकालें
    const results = {
      units: findValue("Net Billed Units"),
      energy: findValue("Energy Charges"),
      fixed: findValue("Fixed Charges"),
      duty: findValue("Electricity Duty"),
      wcc: findValue("Water Conservation"),
      uc: findValue("Urban Cess"),
      tcs: findValue("Tax collected at source"),
    };

    // 🧮 Taxes का जोड़ (Duty + WCC + UC + TCS)
    const totalTaxes = (
      parseFloat(results.duty) +
      parseFloat(results.wcc) +
      parseFloat(results.uc) +
      parseFloat(results.tcs)
    ).toFixed(2);

    res.json({
      units: results.units,
      energy: results.energy,
      fixed: results.fixed,
      taxes: totalTaxes,
      msg: "Scan Successful! ✅"
    });

  } catch (err) {
    console.error("OCR Error:", err.message);
    res.status(500).json({ msg: "Failed to scan image. Please enter manually." });
  }
});

// 💾 SAVE RECORD ROUTE (Now un-commented and fixed)
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
        totalAmount: total.toFixed(2),
        billUrl: req.file ? req.file.path : "" 
      });
  
      await newBill.save();
      res.status(201).json(newBill);
    } catch (err) {
      res.status(400).json({ msg: err.message });
    }
});


// BAAKI ROUTES (Add/Delete/History)
// router.post('/add', upload.single('billFile'), async (req, res) => {
//     try {
//       const { adminId, month, totalUnits, energyCharges, fixedCharges, taxes } = req.body;
//       const total = Number(energyCharges) + Number(fixedCharges) + Number(taxes);
  
//       const newBill = new Bill({
//         adminId: new mongoose.Types.ObjectId(adminId),
//         month,
//         totalUnits: Number(totalUnits),
//         energyCharges: Number(energyCharges),
//         fixedCharges: Number(fixedCharges),
//         taxes: Number(taxes),
//         totalAmount: total.toFixed(2),
//         billUrl: req.file ? req.file.path : "" 
//       });
  
//       await newBill.save();
//       res.status(201).json(newBill);
//     } catch (err) {
//       res.status(400).json({ msg: err.message });
//     }
// });

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