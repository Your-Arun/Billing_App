const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// सभी मॉडल्स को इम्पोर्ट करें
const Reading = require('../Modals/Reading');
const Tenant = require('../Modals/Tenant');
const Invoice = require('../Modals/Invoice');


router.get('/range-summary/:adminId', async (req, res) => {
  try {
    const { from, to } = req.query;
    const adminId = new mongoose.Types.ObjectId(req.params.adminId);

    if (!from || !to) {
      return res.status(400).json({ msg: 'From & To date required' });
    }

    const fromDateEnd = new Date(from);
    fromDateEnd.setHours(23, 59, 59, 999);

      const toDateEnd = new Date(to);
    toDateEnd.setHours(23, 59, 59, 999);

    // 🔹 All tenants
    const tenants = await Tenant.find({ adminId }).lean();

    const result = [];

    for (const tenant of tenants) {

      // ✅ OPENING = last reading BEFORE fromDate
      const openingReading = await Reading.findOne({
        tenantId: tenant._id,
        adminId,
        status: 'Approved',
        createdAt: { $lte: fromDateEnd }
      }).sort({ createdAt: -1 });

      // ✅ CLOSING = last reading WITHIN range
      const closingReading = await Reading.findOne({
        tenantId: tenant._id,
        adminId,
        status: 'Approved',
        createdAt: { $lte: toDateEnd } 
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
        multiplierCT: tenant.multiplierCT,
        ratePerUnit: tenant.ratePerUnit,
        transformerLoss: tenant.transformerLoss,
        fixedCharge: tenant.fixedCharge,
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



// POST /api/invoices/add
router.post('invoices/add', async (req, res) => {
    try {
        const newInvoice = new Invoice(req.body);
        await newInvoice.save();
        res.status(201).json({ success: true, data: newInvoice });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// 📜 2. FETCH HISTORY BY ADMIN
router.get('invoices/:adminId', async (req, res) => {
    try {
        const invoices = await Invoice.find({ adminId: req.params.adminId }).sort({ createdAt: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});


module.exports = router;