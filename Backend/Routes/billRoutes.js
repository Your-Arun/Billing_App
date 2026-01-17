const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');


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
const uploadMemory = multer({ storage: storageMemory });


// 🪄 EXTRACTION ROUTE FIX
router.post('/extract', uploadMemory.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const dataBuffer = req.file.buffer;
    const data = await pdfParse(dataBuffer);
    const text = data.text;

    // --- DEBUGGING के लिए टर्मिनल में टेक्स्ट देखें ---
    // console.log(text); 

    // 🛠️ Super Flexible Regex Helper
    const getVal = (regex) => {
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].replace(/,/g, '').trim(); // कोमा हटाकर वैल्यू दें
      }
      return "0.00";
    };

    // 🔍 AVVNL Bill के लिए सटीक पैटर्न्स (Flexible version)
    const extracted = {
      // Net Billed Units: अक्सर "Units" और नंबर के बीच एक्स्ट्रा टेक्स्ट होता है
      units: getVal(/Net Billed Units\s+([\d,.]+)/i),
      
      // Energy Charges (Point 1): "1 Energy Charges" के बाद वाली संख्या
      energy: getVal(/1\s+Energy\s+Charges\s+([\d,.]+)/i),
      
      // Fixed Charges (Point 2): "2 Fixed Charges" के बाद वाली संख्या
      fixed: getVal(/2\s+Fixed\s+Charges\s+([\d,.]+)/i),
      
      // Taxes (12, 13, 14, 16) - इन सबको अलग-अलग निकालकर जोड़ेंगे
      duty: getVal(/12\s+Electricity\s+Duty\s+([\d,.]+)/i),
      wcc: getVal(/13\s+Water\s+Conservation\s+Cess.*?([\d,.]+)/i),
      uc: getVal(/14\s+Urban\s+Cess.*?([\d,.]+)/i),
      tcs: getVal(/16\s+Tax\s+collected\s+at\s+source.*?([\d,.]+)/i)
    };

    // 🧮 सब टैक्स को जोड़कर एक वैल्यू बनाएं
    const totalTaxes = (
      parseFloat(extracted.duty || 0) +
      parseFloat(extracted.wcc || 0) +
      parseFloat(extracted.uc || 0) +
      parseFloat(extracted.tcs || 0)
    ).toFixed(2);

    // अगर Energy या Fixed "0.00" आ रहा है, तो एक और बैकअप पैटर्न ट्राई करें
    let finalEnergy = extracted.energy !== "0.00" ? extracted.energy : getVal(/Energy\s+Charges\s+([\d,.]+)/i);
    let finalFixed = extracted.fixed !== "0.00" ? extracted.fixed : getVal(/Fixed\s+Charges\s+([\d,.]+)/i);

    res.json({
      units: extracted.units,
      energy: finalEnergy,
      fixed: finalFixed,
      taxes: totalTaxes
    });

  } catch (err) {
    console.error("Extraction Error:", err.message);
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