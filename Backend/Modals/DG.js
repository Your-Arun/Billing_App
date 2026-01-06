const mongoose = require('mongoose');

// 1. DG Master - सिर्फ नाम स्टोर करने के लिए
const DGSetSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dgName: { type: String, required: true }
});

// 2. DG Logs - रोज़ का डेटा स्टोर करने के लिए
const DGLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dgName: { type: String, required: true },
    date: { type: Date, required: true },
    month: { type: String, required: true }, // e.g. "January 2026"
    unitsProduced: { type: Number, default: 0 },
    fuelCost: { type: Number, default: 0 }
}, { timestamps: true });

const DGSet = mongoose.model('DGSet', DGSetSchema);
const DGLog = mongoose.model('DGLog', DGLogSchema);

module.exports = { DGSet, DGLog };