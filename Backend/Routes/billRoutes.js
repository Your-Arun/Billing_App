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

// --- 🛠️ REGEX HELPER FUNCTION ---
const extractValue = (text, regex) => {
  const match = text.match(regex);
  if (match && match[1]) {
    return match[1].replace(/,/g, '').trim();
  }
  return "0.00";
};

// 🪄 EXTRACTION ROUTE
router.post('/extract', uploadMemory.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // 🛠️ HELPER: कोमा हटाकर नंबर निकालने के लिए
    const cleanNum = (val) => {
      if (!val) return "0.00";
      return val.replace(/,/g, '').trim();
    };

    // 🛠️ ULTRA FLEXIBLE REGEX: यह पॉइंट नंबर और नाम के बाद आने वाली पहली संख्या को पकड़ेगा
    const getPointVal = (pointNum, label) => {
      // यह Regex चेक करेगा: पॉइंट नंबर -> कुछ भी टेक्स्ट -> लेबल -> कुछ भी टेक्स्ट -> संख्या
      const regex = new RegExp(`${pointNum}\\s+${label}[\\s\\S]*?([\\d,.]+)`, 'i');
      const match = text.match(regex);
      return match ? cleanNum(match[1]) : "0.00";
    };

    // 🔍 1 से 18 पॉइंट्स का विस्तृत डेटा
    const points = {
      p1_energy: getPointVal(1, "Energy Charges"),
      p2_fixed: getPointVal(2, "Fixed Charges"),
      p3_fuel: getPointVal(3, "Fuel Surcharge"),
      p4_demand: getPointVal(4, "Demand surcharge"),
      p5_pf: getPointVal(5, "Power factor"),
      p6_unauth: getPointVal(6, "Unathourized"),
      p7_ctpt: getPointVal(7, "CT/PT Rent"),
      p8_trans: getPointVal(8, "Transformer Rent"),
      p11_nigam_dues: getPointVal(11, "Total Nigam Dues"),
      p12_duty: getPointVal(12, "Electricity Duty"),
      p13_wcc: getPointVal(13, "Water Conservation"),
      p14_uc: getPointVal(14, "Urban Cess"),
      p15_debit: getPointVal(15, "Other Debit"),
      p16_tcs: getPointVal(16, "Tax collected"),
      p17_adjust: getPointVal(17, "Amount Adjusted"),
      p18_total: getPointVal(18, "Total Amount"),
      
      // Top section details
      net_units: text.match(/Net Billed Units\s+([\d,.]+)/i)?.[1].replace(/,/g, '') || "0.00"
    };

    // 🧮 Taxes (12+13+14+16)
    const taxesTotal = (
      parseFloat(points.p12_duty) +
      parseFloat(points.p13_wcc) +
      parseFloat(points.p14_uc) +
      parseFloat(points.p16_tcs)
    ).toFixed(2);

    // रिपॉन्स भेजें
    res.json({
      units: points.net_units,
      energy: points.p1_energy,
      fixed: points.p2_fixed,
      taxes: taxesTotal,
      total_bill: points.p18_total,
      full_data: points // सभी 18 पॉइंट्स यहाँ भी हैं
    });

      console.log(points)

  } catch (err) {
    console.error("Extraction Error:", err.message);
    res.status(500).json({ msg: "Extraction failed: " + err.message });
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