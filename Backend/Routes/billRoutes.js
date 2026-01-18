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

    // कोमा हटाने और क्लीन नंबर देने के लिए फंक्शन
    const cleanNum = (val) => {
      if (!val) return "0.00";
      // कोमा हटाएं और अगर माइनस है तो उसे संभालें
      let cleaned = val.replace(/,/g, '').trim();
      return isNaN(parseFloat(cleaned)) ? "0.00" : cleaned;
    };

    // 🛠️ AVVNL स्पेसिफिक स्ट्रॉन्ग Regex हेल्पर
    // यह पॉइंट नंबर और उसके लेबल के बाद आने वाली पहली संख्या को पकड़ेगा
    const getVal = (pointNum, labelKeywords) => {
      // पैटर्न: "पॉइंट नंबर" फिर "कीवर्ड्स" फिर "कुछ भी" फिर "संख्या"
      // उदाहरण: 1\s+Energy\s+Charges[\s\S]*?([\d,.]+)
      const regex = new RegExp(`${pointNum}\\s+${labelKeywords}[\\s\\S]*?([\\d,.]+)`, 'i');
      const match = text.match(regex);
      return match ? cleanNum(match[1]) : "0.00";
    };

    // 🔍 सभी 1 से 18 पॉइंट्स का डेटा (AVVNL फॉर्मेट के हिसाब से)
    const points = {
      p1_energy: getVal(1, "Energy\\s+Charges"),
      p2_fixed: getVal(2, "Fixed\\s+Charges"),
      p3_fuel: getVal(3, "Fuel\\s+Surcharge"),
      p4_demand: getVal(4, "Demand\\s+surcharge"),
      p5_pf: getVal(5, "Power\\s+factor"),
      p6_unauth: getVal(6, "Unathourized\\s+Use"),
      p7_ctpt: getVal(7, "CT/PT\\s+Rent"),
      p8_trans: getVal(8, "Transformer\\s+Rent"),
      p9_others: getVal(9, "Others\\s+if\\s+any"),
      p10_rebate: getVal(10, "Voltage\\s+Rebate"),
      p11_nigam_dues: getVal(11, "Total\\s+Nigam\\s+Dues"),
      p12_duty: getVal(12, "Electricity\\s+Duty"),
      p13_wcc: getVal(13, "Water\\s+Conservation"),
      p14_uc: getVal(14, "Urban\\s+Cess"),
      p15_debit: getVal(15, "Other\\s+Debit"),
      p16_tcs: getVal(16, "Tax\\s+collected"),
      p17_adjust: getVal(17, "Amount\\s+Adjusted"),
      p18_total: getVal(18, "Total\\s+Amount"),
      
      // Top section unique match
      net_units: text.match(/Net\s+Billed\s+Units\s+([\d,.]+)/i)?.[1].replace(/,/g, '') || "0.00"
    };

    // 🧮 Taxes (12+13+14+16) का जोड़
    const taxesTotal = (
      parseFloat(points.p12_duty) +
      parseFloat(points.p13_wcc) +
      parseFloat(points.p14_uc) +
      parseFloat(points.p16_tcs)
    ).toFixed(2);

    // रिपॉन्स भेजें जो फ्रंटएंड के फॉर्म से मैच करे
    res.json({
      units: points.net_units,
      energy: points.p1_energy,
      fixed: points.p2_fixed,
      taxes: taxesTotal,
      total_amount_18: points.p18_total,
      full_breakdown: points // टेस्टिंग के लिए पूरा डेटा भी भेज रहे हैं
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