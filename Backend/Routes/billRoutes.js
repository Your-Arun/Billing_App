const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');
let pdfParse = require('pdf-parse');
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
  limits: { fileSize: 5 * 1024 * 1024 } 
});


// 🪄 EXTRACTION ROUTE FIX
router.post('/extract', uploadMemory.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const dataBuffer = req.file.buffer;

    // 🔍 DEBUG: Yeh terminal mein check karne ke liye hai
    console.log("PDF Library Raw:", pdfParse);
    console.log("PDF Library Type:", typeof pdfParse);

    let pdfData;
    try {
      // 🟢 STEP 2: Flexible Calling Logic
      // Agar direct function hai toh wo use karein, warna .default check karein
      if (typeof pdfParse === 'function') {
        pdfData = await pdfParse(dataBuffer);
      } else if (pdfParse.default && typeof pdfParse.default === 'function') {
        pdfData = await pdfParse.default(dataBuffer);
      } else {
        // Agar dono nahi hain, toh ho sakta hai library kisi aur naam se export ho rahi ho
        // Render par kabhi-kabhi yeh issue aata hai
        const alternativeParse = require('pdf-parse/lib/pdf-parse.js');
        pdfData = await alternativeParse(dataBuffer);
      }
    } catch (parseErr) {
      console.error("PDF Parsing Error detail:", parseErr);
      return res.status(500).json({ msg: "Failed to parse PDF structure" });
    }

    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ msg: "PDF is empty or scanned image." });
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
    res.status(500).json({ msg: "Server Error: " + err.message });
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