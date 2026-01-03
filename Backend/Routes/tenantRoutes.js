const express = require('express');
const router = express.Router();
const Tenant = require('../Modals/Tenant');


router.post('/add', async (req, res) => {
  try {
    const tenant = new Tenant(req.body);
    await tenant.save();
    res.status(201).json(tenant);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});


router.get('/:adminId', async (req, res) => {
  try {
    const tenants = await Tenant.find({ adminId: req.params.adminId });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;