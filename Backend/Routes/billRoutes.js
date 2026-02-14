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
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // 🛠️ Helper: पूरी संख्या को बिना किसी डिजिट को छोड़े निकालना
    const getVal = (keyword) => {
      // यह Regex कीवर्ड ढूंढेगा, फिर बीच के गैप को पार करेगा, 
      // और फिर पूरी संख्या (चाहे कितनी भी बड़ी हो) को पकड़ेगा।
      const regex = new RegExp(`${keyword}[\\s\\S]*?(\\d[\\d,.]*\\.\\d{2})`, 'i');
      const match = text.match(regex);
      
      if (match && match[1]) {
        // कोमा हटाएं और शुद्ध नंबर दें
        return match[1].replace(/,/g, '').trim();
      }
      return "0.00";
    };

    // 🔍 सटीक मैपिंग (AVVNL बिल के हिसाब से)
    const points = {
      // Net Billed Units के लिए अलग पैटर्न (क्योंकि इसमें .00 नहीं हो सकता)
      units: (text.match(/Net\s+Billed\s+Units\s+([\d,.]+)/i)?.[1] || "0.00").replace(/,/g, ''),
      
      p1_energy: getVal("Energy Charges"),
      p2_fixed: getVal("Fixed Charges"),
      p3_fuel: getVal("Fuel Surcharge"),
      p4_demand: getVal("Demand surcharge"),
      p12_duty: getVal("Electricity Duty"),
      p13_wcc: getVal("Water Conservation Cess"),
      p14_uc: getVal("Urban Cess"),
      p16_tcs: getVal("Tax collected at source"),
      p18_total: getVal("Total Amount \\(S\\.No 11 to 17\\)")
    };

    // 🧮 Taxes का जोड़ (12+13+14+16)
    const taxesCalc = (
      parseFloat(points.p12_duty || 0) +
      parseFloat(points.p13_wcc || 0) +
      parseFloat(points.p14_uc || 0) +
      parseFloat(points.p16_tcs || 0)
    ).toFixed(2);

    res.json({
      units: points.units,
      energy: points.p1_energy,
      fixed: points.p2_fixed,
      taxes: taxesCalc,
      total: points.p18_total,
      all_points: points // फॉर वेरिफिकेशन
    });

  } catch (err) {
    console.error("Extraction Error:", err.message);
    res.status(500).json({ msg: "PDF extraction failed" });
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