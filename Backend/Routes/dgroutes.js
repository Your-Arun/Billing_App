const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); 
const { DGSet, DGLog } = require('../Modals/DG');
const Tenant = require('../Modals/Tenant'); 

// 1. नया DG सेट रजिस्टर करना
router.post('/dg/create-set', async (req, res) => {
    try {
        const { adminId, dgName } = req.body;
        const newSet = new DGSet({ adminId, dgName });
        await newSet.save();
        res.status(201).json(newSet);
    } catch (err) { res.status(400).json({ msg: err.message }); }
});

// 2. सभी DG सेट्स की लिस्ट मंगवाना
router.get('/dg/list/:adminId', async (req, res) => {
    try {
        const sets = await DGSet.find({ adminId: req.params.adminId });
        res.json(sets);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

// 3. किसी तारीख और DG का पुराना डेटा फेच करना
router.get('/dg/fetch-log', async (req, res) => {
    try {
        const { adminId, dgName, date } = req.query;
        const searchDate = new Date(date);
        searchDate.setHours(0, 0, 0, 0);

        const log = await DGLog.findOne({ adminId, dgName, date: searchDate });
        res.json(log);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/dg/add-log', async (req, res) => {
    try {
        const { adminId, dgName, date, unitsProduced, fuelCost, month, connectedTenants } = req.body;
        const logDate = new Date(date);
        logDate.setHours(0,0,0,0);

        // 1. DG Log सेव या अपडेट करें
        const updatedLog = await DGLog.findOneAndUpdate(
            { adminId, dgName, date: logDate },
            { adminId, dgName, date: logDate, month, unitsProduced, fuelCost, connectedTenants },
            { upsert: true, new: true }
        );

        if (connectedTenants && connectedTenants.length > 0) {
            await Tenant.updateMany(
                { _id: { $in: connectedTenants } },
                { $set: { connectedDG: dgName } }
            );
        }

        res.json(updatedLog);
    } catch (err) { res.status(400).json({ msg: err.message }); }
});

router.get('/dg/monthly-total', async (req, res) => {
    try {
        const { adminId, month } = req.query;
        const totals = await DGLog.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(adminId), month: month } },
            { $group: { 
                _id: "$dgName", 
                totalUnits: { $sum: "$unitsProduced" }, 
                totalCost: { $sum: "$fuelCost" } 
            }}
        ]);
        res.json(totals);
    } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;