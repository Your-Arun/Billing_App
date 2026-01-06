const express = require('express');
const router = express.Router();
const Tenant = require('../Modals/Tenant');



router.post('/add', async (req, res) => {
  try {
    const tenant = new Tenant(req.body);
    await tenant.save();
    res.status(201).json(tenant);
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Tenant.findByIdAndDelete(req.params.id);
    res.json({ msg: "Deleted" });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.get('/:adminId', async (req, res) => {
  try {
    const tenants = await Tenant.find({ adminId: req.params.adminId }).sort({ updatedAt: -1 });
    res.json(tenants);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});







module.exports = router;