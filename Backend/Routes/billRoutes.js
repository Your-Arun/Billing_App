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

    // 1. Cloudinary URL se PDF ko Buffer mein download karein
    const response = await axios.get(req.file.path, { responseType: 'arraybuffer' });
    const dataBuffer = Buffer.from(response.data);
    
    const data = await pdf(dataBuffer);
    const text = data.text;

    // 🛠️ Helper function: Regex se number nikalne ke liye aur comma (,) hatane ke liye
    const getVal = (regex) => {
      const match = text.match(regex);
      if (match && match[1]) {
        // Comma hatana zaroori hai (e.g. 2,28,352.50 -> 228352.50)
        return match[1].replace(/,/g, '').trim();
      }
      return "0.00";
    };

    // 🛠️ AVVNL Bill Specific Regex Patterns
    const fullDetails = {
      billed_units: getVal(/Net Billed Units\s+([\d,.]+)/i),
      energy_charges_1: getVal(/1\s+Energy Charges\s+([\d,.]+)/i),
      fixed_charges_2: getVal(/2\s+Fixed Charges\s+([\d,.]+)/i),
      fuel_surcharge_3: getVal(/3\s+Fuel Surcharge.*?\s+([\d,.]+)/i),
      demand_surcharge_4: getVal(/4\s+Demand surcharge\s+([\d,.]+)/i),
      power_factor_5: getVal(/5\s+Power factor surcharge\/Incentive.*?\s+([-\d,.]+)/i),
      electricity_duty_12: getVal(/12\s+Electricity Duty\s+([\d,.]+)/i),
      water_cess_13: getVal(/13\s+Water Conservation Cess.*?([\d,.]+)/i),
      urban_cess_14: getVal(/14\s+Urban Cess.*?([\d,.]+)/i),
      tcs_tds_16: getVal(/16\s+Tax collected at source.*?([\d,.]+)/i),
      total_amount_18: getVal(/18\s+Total Amount \(S\.No 11 to 17\)\s+([\d,.]+)/i)
    };

    // 🧮 Frontend form ke liye calculation
    const units = fullDetails.billed_units;
    const energy = fullDetails.energy_charges_1;
    const fixed = fullDetails.fixed_charges_2;

    // Taxes = Duty + Water Cess + Urban Cess + TCS
    const taxesCalc = (
        parseFloat(fullDetails.electricity_duty_12 || 0) +
        parseFloat(fullDetails.water_cess_13 || 0) +
        parseFloat(fullDetails.urban_cess_14 || 0) +
        parseFloat(fullDetails.tcs_tds_16 || 0)
    ).toFixed(2);

    res.json({
      units: units,
      energy: energy,
      fixed: fixed,
      taxes: taxesCalc,
      totalAmount: fullDetails.total_amount_18,
      all_points: fullDetails // Detail debugging ke liye
    });

  } catch (err) {
    console.error("Extraction Error:", err.message);
    res.status(500).json({ msg: "PDF parsing failed. Check bill format." });
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