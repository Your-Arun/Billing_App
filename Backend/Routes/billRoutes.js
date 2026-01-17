const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');
const pdf = require('pdf-parse');
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

const upload = multer({ storage: storage , limits: { fileSize: 10 * 1024 * 1024 } }); 

// 🪄 EXTRACTION ROUTE FIX
router.post('/extract', upload.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    console.log("File uploaded to:", req.file.path);

    // 1. Cloudinary URL se file download karein
    const response = await axios.get(req.file.path, { 
      responseType: 'arraybuffer',
      timeout: 10000 // 10 second timeout
    });
    
    const dataBuffer = Buffer.from(response.data);
    
    // 2. PDF Parse karein
    const data = await pdf(dataBuffer);
    const text = data.text;

    // --- DEBUGGING: Terminal mein check karein text aa raha hai ya nahi ---
    if (!text || text.trim().length === 0) {
      console.log("OCR ERROR: PDF text is empty. Might be a scanned image.");
      return res.status(400).json({ msg: "This PDF looks like a scanned image. Cannot extract data." });
    }
    // console.log("--- EXTRACTED TEXT START ---");
    // console.log(text); // Is line ko uncomment karke pura text dekh sakte hain
    // console.log("--- EXTRACTED TEXT END ---");

    // 🛠️ Robust Regex Helper
    const getVal = (regex) => {
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].replace(/,/g, '').trim();
      }
      return "0.00";
    };

    // 🛠️ AVVNL patterns ko aur flexible banaya hai
    const extracted = {
      // Net Billed Units (Top right ke paas)
      units: getVal(/Net Billed Units\s+([\d,.]+)/i),
      
      // Point 1: Energy Charges
      energy: getVal(/1\s+Energy Charges\s+([\d,.]+)/i),
      
      // Point 2: Fixed Charges
      fixed: getVal(/2\s+Fixed Charges\s+([\d,.]+)/i),
      
      // Taxes calculation (Duty + WCC + Urban Cess + TCS)
      duty: getVal(/12\s+Electricity Duty\s+([\d,.]+)/i),
      wcc: getVal(/13\s+Water Conservation Cess.*?([\d,.]+)/i),
      uc: getVal(/14\s+Urban Cess.*?([\d,.]+)/i),
      tcs: getVal(/16\s+Tax collected at source.*?([\d,.]+)/i)
    };

    // Final Taxes calculation
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
      taxes: totalTaxes,
      msg: "Data extracted successfully"
    });

  } catch (err) {
    console.error("CRITICAL ERROR:", err.message);
    res.status(500).json({ msg: "Server failed to read PDF: " + err.message });
  }
});

// BAAKI ROUTES (Add/Delete/History)
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