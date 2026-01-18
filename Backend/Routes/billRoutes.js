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

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    
    // 1. पूरे टेक्स्ट को एक लाइन में कर दें और कोमा (,) हटा दें
    let text = data.text.replace(/,/g, ''); 

    // 🛠️ नया "Smart Search" फंक्शन
    const findValue = (keyword) => {
      // यह लॉजिक कीवर्ड ढूंढेगा और उसके बाद आने वाली पहली संख्या (जैसे 123.45) को उठाएगा
      const regex = new RegExp(`${keyword}[\\s\\S]{1,60}?([\\d.]+)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        // चेक करें कि निकाली गई वैल्यू सिर्फ एक बिंदी तो नहीं (जैसे "." या "0.")
        return parseFloat(match[1]) > 0 ? match[1] : "0.00";
      }
      return "0.00";
    };

    // 🔍 कीवर्ड्स के आधार पर डेटा निकालें (AVVNL स्पेसिफिक)
    const extracted = {
      // Net Billed Units (बिल के टॉप में होता है)
      units: findValue("Net Billed Units"),
      
      // Point 1: Energy Charges
      energy: findValue("Energy Charges"),
      
      // Point 2: Fixed Charges
      fixed: findValue("Fixed Charges"),
      
      // Taxes (अलग-अलग पॉइंट्स)
      duty: findValue("Electricity Duty"),
      wcc: findValue("Water Conservation Cess"),
      uc: findValue("Urban Cess"),
      tcs: findValue("Tax collected at source"),
      
      // Point 18: Total Amount
      total_18: findValue("Total Amount")
    };

    // 🧮 Taxes का जोड़ (Duty + WCC + UC + TCS)
    const totalTaxes = (
      parseFloat(extracted.duty) +
      parseFloat(extracted.wcc) +
      parseFloat(extracted.uc) +
      parseFloat(extracted.tcs)
    ).toFixed(2);

    // रिस्पॉन्स भेजें
    res.json({
      units: extracted.units !== "0.00" ? extracted.units : "0.00",
      energy: extracted.energy !== "0.00" ? extracted.energy : "0.00",
      fixed: extracted.fixed !== "0.00" ? extracted.fixed : "0.00",
      taxes: totalTaxes,
      total_amount_18: extracted.total_18
    });

    console.log(extracted)
  } catch (err) {
    console.error("Extraction Error:", err.message);
    res.status(500).json({ msg: "Extraction failed. Server Error." });
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