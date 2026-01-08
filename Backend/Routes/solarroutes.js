const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // 🟢 ज़रूरी है
const SolarLog = require('../Modals/Solar');

// 1. डेटा सेव या अपडेट करना
router.post('/add', async (req, res) => {
  try {
    const { adminId, unitsGenerated, date } = req.body;

    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0); // समय हटाकर शुद्ध तारीख

    const monthStr = logDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const solar = await SolarLog.findOneAndUpdate(
      { adminId, date: logDate },
      { 
        adminId, 
        unitsGenerated: Number(unitsGenerated), 
        date: logDate, 
        month: monthStr 
      },
      { upsert: true, new: true }
    );
    res.status(201).json(solar);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// 2. 🟢 नया रूट: किसी खास तारीख का डेटा देखने के लिए (फ्रंटएंड के लिए)
router.get('/by-date', async (req, res) => {
  try {
    const { adminId, date } = req.query;
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    const log = await SolarLog.findOne({ adminId, date: logDate });
    res.json(log);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// 3. रिपोर्ट निकालना (दो तारीखों के बीच)
router.get('/report', async (req, res) => {
  try {
    const { adminId, startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const data = await SolarLog.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: '$unitsGenerated' },
          daysRecorded: { $sum: 1 }
        }
      }
    ]);
    res.json(data[0] || { totalUnits: 0, daysRecorded: 0 });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;