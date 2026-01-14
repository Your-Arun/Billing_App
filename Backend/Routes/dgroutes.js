const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { DGSet, DGLog } = require('../Modals/DG');

// 1. नया DG सेट नाम रजिस्टर करना
router.post('/create-set', async (req, res) => {
    try {
        const { adminId, dgName } = req.body;
        const exists = await DGSet.findOne({ adminId, dgName });
        if (exists) return res.status(400).json({ msg: "Name already exists" });
        const newSet = new DGSet({ adminId, dgName });
        await newSet.save();
        res.status(201).json(newSet);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 2. DG नामों की लिस्ट मंगवाना
router.get('/list-names/:adminId', async (req, res) => {
    try {
        const sets = await DGSet.find({ adminId: req.params.adminId });
        res.json(sets);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 3. डेली डेटा सेव/अपडेट (Upsert)
router.post('/add-log', async (req, res) => {
    try {
        let { adminId, dgName, date, unitsProduced, fuelCost } = req.body;
        const logDate = new Date(date);
        logDate.setUTCHours(0, 0, 0, 0); // 🟢 समय साफ़ करें

        const month = logDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;

        const log = await DGLog.findOneAndUpdate(
            { adminId: new mongoose.Types.ObjectId(adminId), dgName, date: logDate },
            { $set: { unitsProduced: Number(unitsProduced), fuelCost: Number(fuelCost), month, monthKey } },
            { upsert: true, new: true }
        );
        res.status(200).json(log);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 4. किसी तारीख का पुराना डेटा फेच करना
router.get('/fetch-log', async (req, res) => {
    try {
        const { adminId, dgName, date } = req.query;
        const logDate = new Date(date);
        logDate.setUTCHours(0,0,0,0);
        const log = await DGLog.findOne({ adminId, dgName, date: logDate });
        res.json(log);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 5. मंथली टोटल summary
router.get('/monthly-summary/:adminId', async (req, res) => {
    try {
        const { monthKey } = req.query;
        const data = await DGLog.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(req.params.adminId), monthKey } },
            { $group: { _id: '$dgName', totalUnits: { $sum: '$unitsProduced' }, totalCost: { $sum: '$fuelCost' } } },
            { $sort: { _id: 1 } }
        ]);
        res.json(data);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 🟢 सभी डेली लॉग्स मंगवाना (तारीख के साथ)
router.get('/logs/:adminId', async (req, res) => {
    try {
        const { monthKey } = req.query;
        const logs = await DGLog.find({ 
            adminId: new mongoose.Types.ObjectId(req.params.adminId), 
            monthKey 
        }).sort({ date: -1 }); // नई तारीख सबसे ऊपर
        res.json(logs);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

router.get('/list/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const dgs = await DGLog.distinct('dgName', { adminId });
    res.json(dgs);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});



router.get('/dgsummary/:adminId', async (req, res) => {
  try {
    const adminId = new mongoose.Types.ObjectId(req.params.adminId);

    const data = await DGLog.aggregate([
      { $match: { adminId } },
      {
        $group: {
          _id: '$dgName',
          totalUnits: { $sum: '$unitsProduced' },
          totalCost: { $sum: '$fuelCost' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalDGs: data.length,
      dgSummary: data
    });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});




module.exports = router;