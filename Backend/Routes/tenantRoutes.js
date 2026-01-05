const express = require('express');
const router = express.Router();
const Tenant = require('../Modals/Tenant');
const Solar = require('../Modals/Solar');
const DG = require('../Modals/DG');

router.post('/solar/add', async (req, res) => {
  try {
    const data = new Solar(req.body);
    await data.save();
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ msg: "Solar save failed: " + err.message });
  }
});

router.post('/dg/add', async (req, res) => {
  try {
    const { adminId, dgName, connectedTenants, unitsProduced, fuelCost, date, month } = req.body;

    const dgEntry = new DG(req.body);
    await dgEntry.save();

    
    await Tenant.updateMany(
      { _id: { $in: connectedTenants } }, 
      { $set: { connectedDG: dgName } }
    );

    res.status(201).json({ msg: "DG Data and Tenant Mapping Updated Successfully" });
  } catch (err) { 
    res.status(400).json({ msg: "Error: " + err.message }); 
  }
});


router.post('/add', async (req, res) => {
  try {
    const tenant = new Tenant(req.body);
    await tenant.save();
    res.status(201).json(tenant);
  } catch (err) {
    res.status(400).json({ msg: "Tenant save failed: " + err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      name, meterId, openingMeter, ratePerUnit,
      multiplierCT, transformerLoss, fixedCharge
    } = req.body;

    const updatedData = {
      name,
      meterId,
      openingMeter: Number(openingMeter),
      ratePerUnit: Number(ratePerUnit),
      multiplierCT: Number(multiplierCT) || 1,
      transformerLoss: Number(transformerLoss) || 0,
      fixedCharge: Number(fixedCharge) || 0
    };

    const updatedTenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedTenant) return res.status(404).json({ msg: "Tenant not found" });
    res.json(updatedTenant);
  } catch (err) {
    console.error(err.message);
    res.status(400).json({ msg: "Update failed: " + err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Tenant.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: "Tenant not found" });
    res.json({ msg: "Tenant Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Delete failed: " + err.message });
  }
});

router.get('/:adminId', async (req, res) => {
  try {
    const tenants = await Tenant.find({ adminId: req.params.adminId }).sort({ lastUpdated: -1 });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ msg: "Fetch failed: " + err.message });
  }
});

module.exports = router;