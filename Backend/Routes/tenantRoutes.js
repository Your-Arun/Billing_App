const express = require('express');
const router = express.Router();
const Tenant = require('../Modals/Tenant');
const Reading = require('../Modals/Reading');
const DGLog = require('../Modals/DG');


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
    const tenantId = req.params.id;

    // 1. Check karein ki ID sahi format mein hai ya nahi
    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ msg: "Invalid Tenant ID format" });
    }

    const id = new mongoose.Types.ObjectId(tenantId);

    // 2. Pehle us tenant ki saari readings delete karein
    await Reading.deleteMany({ tenantId: id });

    // 3. Agar DGLog mein tenantId store hoti hai toh use bhi delete karein
    // Note: Agar aapka DGLog sirf generic hai toh ise skip kar sakte hain
    try {
        await DGLog.deleteMany({ tenantId: id });
    } catch (dgErr) {
        console.log("DGLog delete skip: Field might not exist");
    }

    // 4. Main Tenant delete karein
    const deletedTenant = await Tenant.findByIdAndDelete(id);

    if (!deletedTenant) {
      return res.status(404).json({ msg: "Tenant not found in database" });
    }

    res.json({ success: true, msg: "Tenant & all related readings deleted ✅" });

  } catch (err) {
    console.error("Delete Error Backend:", err.message);
    res.status(500).json({ msg: err.message });
  }
});


router.get('/:adminId', async (req, res) => {
  try {
    const tenants = await Tenant.find({ adminId: req.params.adminId }).sort({ updatedAt: -1 });
    res.json(tenants);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});








module.exports = router;