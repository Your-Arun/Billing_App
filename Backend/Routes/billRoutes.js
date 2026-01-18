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

    let text = "";
    const dataBuffer = req.file.buffer;

    // 1️⃣ पहले PDF-Parse से टेक्स्ट निकालने की कोशिश करें (Digital PDF के लिए)
    const pdfData = await pdfParse(dataBuffer);
    text = pdfData.text;

    // 2️⃣ अगर टेक्स्ट बहुत कम है या खाली है, तो मान लें कि यह Scanned PDF है
    if (!text || text.trim().length < 50) {
      console.log("Digital Text failed, attempting OCR...");
      // नोट: OCR के लिए PDF को इमेज में बदलना पड़ता है, जो सर्वर पर भारी हो सकता है।
      // अभी के लिए हम Error देंगे, पर आप Tesseract यहाँ कन्फ़िगर कर सकते हैं।
      return res.status(400).json({ msg: "PDF is a scanned image. Please upload a digital PDF copy." });
    }

    // 🔍 1 से 18 तक के सटीक पैटर्न्स (Based on AVVNL Format)
    const points = {
      p1_energy_charges: extractValue(text, /1\s+Energy\s+Charges\s+([\d,.]+)/i),
      p2_fixed_charges: extractValue(text, /2\s+Fixed\s+Charges\s+([\d,.]+)/i),
      p3_fuel_surcharge: extractValue(text, /3\s+Fuel\s+Surcharge.*?\s+([\d,.]+)/i),
      p4_demand_surcharge: extractValue(text, /4\s+Demand\s+surcharge\s+([\d,.]+)/i),
      p5_pf_incentive: extractValue(text, /5\s+Power\s+factor\s+surcharge\/Incentive.*?\s+([-\d,.]+)/i),
      p6_unauth_charges: extractValue(text, /6\s+Unathourized\s+Use\s+Charges.*?\s+([\d,.]+)/i),
      p7_ct_pt_rent: extractValue(text, /7\s+CT\/PT\s+Rent\s+([\d,.]+)/i),
      p8_trans_rent: extractValue(text, /8\s+Transformer\s+Rent\s+([\d,.]+)/i),
      p9_others_tod: extractValue(text, /9\s+\(I\).*?\(II\)\s+TOD\s+Surcharge\s+([\d,.]+)/i),
      p10_voltage_rebate: extractValue(text, /10\s+\(I\).*?\s+([-\d,.]+)/i),
      p11_total_nigam_dues: extractValue(text, /11\s+Total\s+Nigam\s+Dues.*?([\d,.]+)/i),
      p12_electricity_duty: extractValue(text, /12\s+Electricity\s+Duty\s+([\d,.]+)/i),
      p13_wcc: extractValue(text, /13\s+Water\s+Conservation\s+Cess.*?([\d,.]+)/i),
      p14_urban_cess: extractValue(text, /14\s+Urban\s+Cess.*?([\d,.]+)/i),
      p15_other_debit: extractValue(text, /15\s+Other\s+Debit\/Credit\s+([\d,.]+)/i),
      p16_tcs_tds: extractValue(text, /16\s+Tax\s+collected\s+at\s+source.*?([\d,.]+)/i),
      p17_adjustment: extractValue(text, /17\s+Amount\s+Adjusted.*?([\d,.]+)/i),
      p18_total_amount: extractValue(text, /18\s+Total\s+Amount\s+\(S\.No\s+11\s+to\s+17\)\s+([\d,.]+)/i),
      
      // Extra Info
      billed_units: extractValue(text, /Net\s+Billed\s+Units\s+([\d,.]+)/i),
    };

    // 🧮 Frontend के लिए Taxes का जोड़ (12 + 13 + 14 + 16)
    const calculatedTaxes = (
      parseFloat(points.p12_electricity_duty) +
      parseFloat(points.p13_wcc) +
      parseFloat(points.p14_urban_cess) +
      parseFloat(points.p16_tcs_tds)
    ).toFixed(2);

    res.json({
      units: points.billed_units,
      energy: points.p1_energy_charges,
      fixed: points.p2_fixed_charges,
      taxes: calculatedTaxes,
      totalAmount: points.p18_total_amount,
      full_breakdown: points // सभी 18 पॉइंट्स यहाँ हैं
    });

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