const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');
const pdf = require('pdf-parse');
const fs = require('fs');

// Cloudinary Config (Check .env)
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
      totalAmount: total,
      billUrl: req.file ? req.file.path : "" 
    });

    await newBill.save();
    res.status(201).json(newBill);
  } catch (err) {
    console.error("Save Error:", err.message);
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



// 🗑️ DELETE BILL ROUTE
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Invalid Bill ID format" });
    }

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ msg: "Bill record not found" });
    }

    await Bill.findByIdAndDelete(id);

    res.json({ success: true, msg: "Bill deleted from database ✅" });
  } catch (err) {
    console.error("Delete Error Backend:", err.message);
    res.status(500).json({ msg: "Server Error: Could not delete" });
  }
});


router.post('/extract', upload.single('billFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    // Cloudinary की जगह लोकल फाइल पाथ से डेटा पढ़ें (अगर आपने diskStorage यूज़ किया है)
    // या अगर मेमोरी यूज़ की है तो req.file.buffer लें।
    const dataBuffer = fs.readFileSync(req.file.path); 
    const data = await pdf(dataBuffer);
    const text = data.text;

    // --- REGEX LOGIC (बिल के हिसाब से) ---
    const extractValue = (pattern) => {
      const match = text.match(pattern);
      return match ? match[1].trim() : "0";
    };

    // आपके द्वारा दिए गए इमेज के हिसाब से डेटा पॉइंट्स:
    const extractedData = {
      // 1. Net Billed Units (Top Section)
      units: extractValue(/Net Billed Units\s+([\d.]+)/i),
      
      // 2. Energy Charges (S.No 1)
      energy: extractValue(/Energy Charges\s+([\d.]+)/i),
      
      // 3. Fixed Charges (S.No 2)
      fixed: extractValue(/Fixed Charges\s+([\d.]+)/i),
      
      // 4. Taxes (S.No 12 + 13 + 14 का जोड़ - Electricity Duty, WCC, UC)
      // आप इसे इंडिविजुअल भी निकाल सकते हैं
      duty: extractValue(/Electricity Duty\s+([\d.]+)/i),
      wcc: extractValue(/Water Conservation Cess \(WCC\)\s+([\d.]+)/i),
      urbanCess: extractValue(/Urban Cess \(UC\)\s+([\d.]+)/i),
      
      // 18. Total Amount (S.No 11 to 17)
      totalBill: extractValue(/Total Amount \(S\.No 11 to 17\)\s+([\d.]+)/i)
    };

    // टैक्सेज का टोटल कैलकुलेट करें
    extractedData.taxes = (
        parseFloat(extractedData.duty) + 
        parseFloat(extractedData.wcc) + 
        parseFloat(extractedData.urbanCess)
    ).toFixed(2);

    res.json(extractedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to extract data from PDF" });
  }
});

module.exports = router;