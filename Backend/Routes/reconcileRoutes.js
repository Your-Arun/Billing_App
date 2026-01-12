const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// सभी मॉडल्स को इम्पोर्ट करें
const Tenant = require('../Modals/Tenant');
const Reading = require('../Modals/Reading');
const Bill = require('../Modals/Bill');
const Solar = require('../Modals/Solar');
const { DGLog } = require('../Modals/DG');


// 🟢 GET: /api/reconcile/master-report/:adminId?startDate=...&endDate=...
router.get('/master-report/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ msg: "Please select date range" });
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const objAdminId = new mongoose.Types.ObjectId(adminId);

    // 1. सरकारी बिल - रेंज के बीच की सबसे लेटेस्ट एंट्री उठाओ
    const mainBill = await Bill.findOne({
      adminId: objAdminId,
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 }).lean();

    // 2. सोलर डेटा - रेंज के बीच की सभी एंट्रीज़ का टोटल
    const solarTotal = await Solar.aggregate([
      { $match: { adminId: objAdminId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, totalUnits: { $sum: "$unitsGenerated" } } }
    ]);

    // 3. DG डेटा - रेंज के बीच की सभी एंट्रीज़ का टोटल (Units + Cost)
    const dgTotal = await DGLog.aggregate([
      { $match: { adminId: objAdminId, date: { $gte: start, $lte: end } } },
      { 
        $group: { 
          _id: null, 
          totalUnitsProduced: { $sum: "$unitsProduced" }, 
          totalFuelCost: { $sum: "$fuelCost" } 
        } 
      }
    ]);

    // 4. किरायेदारों की टेबल के लिए डेटा (Individual Calculation)
    const tenants = await Tenant.find({ adminId: objAdminId }).lean();
    
    const tableData = await Promise.all(tenants.map(async (tenant) => {
      // रेंज की सबसे पहली APPROVED रीडिंग (Opening)
      const firstLog = await Reading.findOne({
        tenantId: tenant._id,
        status: 'Approved',
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: 1 });

      // रेंज की सबसे आखिरी APPROVED रीडिंग (Closing)
      const lastLog = await Reading.findOne({
        tenantId: tenant._id,
        status: 'Approved',
        createdAt: { $gte: start, $lte: end }
      }).sort({ createdAt: -1 });

      // अगर रीडिंग नहीं मिली तो 0, वरना वैल्यू
      const opening = firstLog ? firstLog.closingReading : 0;
      const closing = lastLog ? lastLog.closingReading : 0;
      
      // 🧮 खपत कैलकुलेशन: (Closing - Opening) * CT Multiplier
      const rawConsumed = closing - opening;
      const netConsumed = (rawConsumed > 0 ? rawConsumed : 0) * (tenant.multiplierCT || 1);
      
      return {
        tenantId: tenant._id,
        name: tenant.name,
        meterSN: tenant.meterId,
        opening,
        closing,
        multiplier: tenant.multiplierCT,
        unitsConsumed: netConsumed,
        rate: tenant.ratePerUnit,
        fixedCharge: tenant.fixedCharge,
        amount: netConsumed * tenant.ratePerUnit
      };
    }));

    // 5. एग्रीगेट समरी
    const totalTenantsUnits = tableData.reduce((acc, curr) => acc + curr.unitsConsumed, 0);
    const solarUnits = solarTotal[0]?.totalUnits || 0;
    const dgUnits = dgTotal[0]?.totalUnitsProduced || 0;
    const dgCost = dgTotal[0]?.totalFuelCost || 0;
    const billUnits = mainBill?.totalUnits || 0;

    res.json({
      summary: {
        mainMeter: billUnits,
        solarGen: solarUnits,
        dgTotalUnits: dgUnits,
        dgTotalCost: dgCost,
        aggregateTenantUnits: Number(totalTenantsUnits.toFixed(2))
      },
      tableData
    });

  } catch (err) {
    console.error("Reconciliation Error:", err);
    res.status(500).json({ msg: "Fetch Error: " + err.message });
  }
});
module.exports = router;