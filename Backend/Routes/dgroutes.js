const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const DGLog = require('../Modals/DG');
const Tenant = require('../Modals/Tenant');

/* ===============================
   1. DAILY ADD / UPDATE DG LOG
================================ */
router.post('/add-log', async (req, res) => {
  try {
    let { adminId, dgName, date, unitsProduced, fuelCost } = req.body;

    // 🔴 adminId fix
    adminId = new mongoose.Types.ObjectId(adminId);

    // 🔴 date fix (LOCAL midnight – safest)
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);

    // 🔴 month values
    const month = logDate.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const monthKey = `${logDate.getFullYear()}-${String(
      logDate.getMonth() + 1
    ).padStart(2, '0')}`;

    const log = await DGLog.findOneAndUpdate(
      { adminId, dgName, date: logDate },
      {
        $set: {
          unitsProduced: Number(unitsProduced),
          fuelCost: Number(fuelCost),
          month,
          monthKey
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: log
    });

  } catch (err) {
    console.error("DG SAVE ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* ===============================
   2. MONTHLY SUMMARY (MONTH END)
   /dg/monthly-summary/:adminId
================================ */
router.get('/monthly-summary/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { monthKey } = req.query;

    const data = await DGLog.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          monthKey
        }
      },
      {
        $group: {
          _id: '$dgName',
          totalUnits: { $sum: '$unitsProduced' },
          totalCost: { $sum: '$fuelCost' },
          daysRecorded: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

/* ===============================
   3. DATE RANGE REPORT
   /dg/report?adminId=&startDate=&endDate=
================================ */
router.get('/report', async (req, res) => {
  try {
    const { adminId, startDate, endDate } = req.query;

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const data = await DGLog.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$dgName',
          totalUnits: { $sum: '$unitsProduced' },
          totalCost: { $sum: '$fuelCost' },
          daysRecorded: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});



module.exports = router;
