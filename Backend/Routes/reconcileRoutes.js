const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Tenant = require('../Modals/Tenant');
const Reading = require('../Modals/Reading');
const Bill = require('../Modals/Bill');
const DGLog = require('../Modals/DG'); // या जो भी आपका DG मॉडल है
const SolarLog = require('../Modals/Solar');

// 🟢 GET: /api/reconcile/:adminId
router.get('/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const monthStr = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // 1. सरकारी बिल का डेटा लाएं (Latest Bill)
    const mainBill = await Bill.findOne({ adminId }).sort({ createdAt: -1 });

    // 2. सोलर का टोटल (Total Units)
    const solarData = await SolarLog.aggregate([
      { $match: { adminId: new mongoose.Types.ObjectId(adminId), month: monthStr } },
      { $group: { _id: null, total: { $sum: "$unitsGenerated" } } }
    ]);

    // 3. DG का टोटल (Total Units)
    const dgData = await DGLog.aggregate([
      { $match: { adminId: new mongoose.Types.ObjectId(adminId), month: monthStr } },
      { $group: { _id: null, total: { $sum: "$unitsProduced" } } }
    ]);

    // 4. सभी किरायेदारों की कुल यूनिट्स (Current Total)
    const tenants = await Tenant.find({ adminId });
    const totalTenantUnits = tenants.reduce((sum, t) => sum + (t.currentClosing || 0), 0);

    // 🧮 गणना (Math Logic - Slide 14)
    const billUnits = mainBill ? mainBill.totalUnits : 0;
    const solarCredit = solarData[0] ? solarData[0].total : 0;
    const dgUnits = dgData[0] ? dgData[0].total : 0;

    // नेट यूनिट्स जो किरायेदारों में बंटनी चाहिए
    const netToAllocate = billUnits - solarCredit + dgUnits;
    const commonLoss = netToAllocate - totalTenantUnits;
    const lossPercent = (commonLoss / (billUnits || 1)) * 100;

    res.json({
      mainBill: mainBill || {},
      solarCredit,
      dgUnits,
      totalTenantUnits,
      netToAllocate,
      commonLoss,
      lossPercent: lossPercent.toFixed(2)
    });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;