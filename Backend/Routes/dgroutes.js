const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const DGLog = require('../Modals/DG');

// 1. डेली लॉग सेव या अपडेट करना (POST: /dg/add-log)
router.post('/add-log', async (req, res) => {
  try {
    const { adminId, dgName, date, unitsProduced, fuelCost } = req.body;

    // तारीख को शुद्ध करें (Time हटाकर 00:00:00 करें)
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    // महीना निकालें (e.g., "January 2026")
    const monthStr = logDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Upsert Logic: अगर इस तारीख का डेटा पहले से है तो अपडेट करें, वरना नया बनाएँ
    const log = await DGLog.findOneAndUpdate(
      { adminId, dgName, date: logDate },
      { 
        adminId, 
        dgName, 
        date: logDate, 
        unitsProduced: Number(unitsProduced), 
        fuelCost: Number(fuelCost), 
        month: monthStr 
      },
      { upsert: true, new: true }
    );

    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// 2. महीने का टोटल (Total) हिसाब निकालना (GET: /dg/monthly-summary/:adminId)
router.get('/monthly-summary/:adminId', async (req, res) => {
    try {
        const { month } = req.query; 
        const adminId = req.params.adminId;

        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return res.status(400).json({ msg: "Invalid Admin ID" });
        }

        const summary = await DGLog.aggregate([
            { 
                $match: { 
                    adminId: new mongoose.Types.ObjectId(adminId), 
                    month: month 
                } 
            },
            { 
                $group: { 
                    _id: "$dgName", 
                    totalUnits: { $sum: "$unitsProduced" }, 
                    totalCost: { $sum: "$fuelCost" }
                } 
            },
            { $sort: { _id: 1 } }
        ]);
        res.json(summary);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;