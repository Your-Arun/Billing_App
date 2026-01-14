const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// सभी मॉडल्स को इम्पोर्ट करें
const Reading = require('../Modals/Reading');
const Tenant = require('../Modals/Tenant');


router.get('/range-summary/:adminId', async (req, res) => {
  try {
    const { from, to } = req.query;
    const adminId = new mongoose.Types.ObjectId(req.params.adminId);

    if (!from || !to) {
      return res.status(400).json({ msg: 'From & To date required' });
    }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // 🔹 All tenants
    const tenants = await Tenant.find({ adminId }).lean();

    const result = [];

    for (const tenant of tenants) {

      // ✅ OPENING = last reading BEFORE fromDate
      const openingReading = await Reading.findOne({
        tenantId: tenant._id,
        adminId,
        createdAt: { $lt: fromDate }
      }).sort({ createdAt: -1 });

      // ✅ CLOSING = last reading WITHIN range
      const closingReading = await Reading.findOne({
        tenantId: tenant._id,
        adminId,
        createdAt: { $gte: fromDate, $lte: toDate }
      }).sort({ createdAt: -1 });

      const opening =
        openingReading?.closingReading ??
        tenant.openingMeter ??
        0;

      const closing =
        closingReading?.closingReading ??
        opening;

      result.push({
        tenantId: tenant._id,
        tenantName: tenant.name,
        meterId: tenant.meterId,
        connectedDG: tenant.connectedDG,
        opening,
        closing,
        spike: closing - opening
      });
    }

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message });
  }
});



module.exports = router;