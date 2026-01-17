const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Bill = require('../Modals/Bill');
const mongoose = require('mongoose');
const pdf = require('pdf-parse');
const axios = require('axios');

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

    // 1. Cloudinary URL से PDF को Buffer में लें
    const response = await axios.get(req.file.path, { responseType: 'arraybuffer' });
    const dataBuffer = Buffer.from(response.data, 'utf-8');
    
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Helper function to extract numbers correctly
    const getVal = (regex) => {
      const match = text.match(regex);
      return match ? match[1].trim() : "0.00";
    };

    // 2. सभी 1-18 पॉइंट्स का Extraction Logic
    const fullDetails = {
      energy_charges_1: getVal(/1\s+Energy Charges\s+([\d.]+)/i),
      fixed_charges_2: getVal(/2\s+Fixed Charges\s+([\d.]+)/i),
      fuel_surcharge_3: getVal(/3\s+Fuel Surcharge.*?\s+([\d.]+)/i),
      demand_surcharge_4: getVal(/4\s+Demand surcharge\s+([\d.]+)/i),
      power_factor_incentive_5: getVal(/5\s+Power factor surcharge\/Incentive\s+\(-\)\s+([\d.-]+)/i),
      unauthorized_use_6: getVal(/6\s+Unathourized Use Charges.*?\s+([\d.]+)/i),
      ct_pt_rent_7: getVal(/7\s+CT\/PT Rent\s+([\d.]+)/i),
      transformer_rent_8: getVal(/8\s+Transformer Rent\s+([\d.]+)/i),
      others_tod_9: getVal(/9\s+\(I\).*?\(II\) TOD Surcharge\s+([\d.]+)/i),
      rebates_10: getVal(/10\s+\(I\).*?\(II\).*?\s+([\d.-]+)/i),
      
      // 11. Total Nigam Dues (1 to 10)
      total_nigam_dues_11: getVal(/11\s+Total Nigam Dues.*?([\d.]+)/i),
      
      electricity_duty_12: getVal(/12\s+Electricity Duty\s+([\d.]+)/i),
      water_cess_13: getVal(/13\s+Water Conservation Cess.*?([\d.]+)/i),
      urban_cess_14: getVal(/14\s+Urban Cess.*?([\d.]+)/i),
      other_debit_15: getVal(/15\s+Other Debit\/Credit\s+([\d.]+)/i),
      tcs_tds_16: getVal(/16\s+Tax collected at source.*?([\d.]+)/i),
      adjustment_17: getVal(/17\s+Amount Adjusted.*?([\d.]+)/i),
      
      // 18. Total Amount (11 to 17)
      total_amount_18: getVal(/18\s+Total Amount \(S\.No 11 to 17\)\s+([\d.]+)/i),

      // Extra: Units (Top section of bill)
      billed_units: getVal(/Net Billed Units\s+([\d.]+)/i),
    };

    // आपके फॉर्म के हिसाब से डेटा मैप करें
    const responseData = {
      units: fullDetails.billed_units,
      energy: fullDetails.energy_charges_1,
      fixed: fullDetails.fixed_charges_2,
      taxes: (
        parseFloat(fullDetails.electricity_duty_12) +
        parseFloat(fullDetails.water_cess_13) +
        parseFloat(fullDetails.urban_cess_14) +
        parseFloat(fullDetails.tcs_tds_16)
      ).toFixed(2),
      all_points: fullDetails // इसमें 1-18 की पूरी लिस्ट है
    };

    res.json(responseData);

  } catch (err) {
    console.error("Extraction Error:", err);
    res.status(500).json({ msg: "PDF parsing failed" });
  }
});

module.exports = router;