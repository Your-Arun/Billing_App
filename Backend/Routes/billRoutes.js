const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse'); 
const axios = require('axios');

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { 
    folder: 'official_bills', 
    resource_type: 'raw', 
    format: 'pdf',
  },
});

// const upload = multer({ storage: storage , limits: { fileSize: 10 * 1024 * 1024 } }); 


const storageMemory = multer.memoryStorage();
const uploadMemory = multer({ 
  storage: storageMemory,
  limits: { fileSize: 10 * 1024 * 1024 } 
});



// 🪄 EXTRACTION ROUTE FIX
router.post('/extract', uploadMemory.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const dataBuffer = req.file.buffer;

    // 🔍 DEBUG: Terminal mein check karne ke liye ki library ka type kya hai
    console.log("PDF Library Type:", typeof pdfParse);

    // 🟢 Seedha call karein, Render par standard require chalna chahiye
    let pdfData;
    try {
      // Agar pdfParse function hai toh theek, warna error handle karein
      pdfData = await pdfParse(dataBuffer);
    } catch (parseErr) {
      console.error("PDF Parsing Step Error:", parseErr.message);
      return res.status(500).json({ msg: "Error parsing PDF structure" });
    }

    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ msg: "PDF contains no readable text." });
    }

    // 🛠️ Regex Helper
    const getVal = (regex) => {
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].replace(/,/g, '').trim();
      }
      return "0.00";
    };

    // AVVNL Bill Specific Patterns
    const extracted = {
      units: getVal(/Net Billed Units\s+([\d,.]+)/i),
      energy: getVal(/1\s+Energy Charges\s+([\d,.]+)/i),
      fixed: getVal(/2\s+Fixed Charges\s+([\d,.]+)/i),
      duty: getVal(/12\s+Electricity Duty\s+([\d,.]+)/i),
      wcc: getVal(/13\s+Water Conservation Cess.*?([\d,.]+)/i),
      uc: getVal(/14\s+Urban Cess.*?([\d,.]+)/i),
      tcs: getVal(/16\s+Tax collected at source.*?([\d,.]+)/i)
    };

    const totalTaxes = (
      parseFloat(extracted.duty || 0) +
      parseFloat(extracted.wcc || 0) +
      parseFloat(extracted.uc || 0) +
      parseFloat(extracted.tcs || 0)
    ).toFixed(2);

    res.json({
      units: extracted.units,
      energy: extracted.energy,
      fixed: extracted.fixed,
      taxes: totalTaxes
    });

  } catch (err) {
    console.error("Global Extraction Error:", err.message);
    res.status(500).json({ msg: "Extraction failed: " + err.message });
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