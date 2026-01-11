const mongoose = require('mongoose');

// 1. DG के नामों की लिस्ट
const DGSetSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dgName: { type: String, required: true }
});

// 2. रोज़ का डेटा (Daily Logs)
const DGLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dgName: { type: String, required: true },
  date: { type: Date, required: true },
  month: { type: String, required: true },
  monthKey: { type: String, required: true }, // "2026-01"
  unitsProduced: { type: Number, required: true, min: 0 },
  fuelCost: { type: Number, required: true, min: 0 }
}, { timestamps: true });

// एक दिन की एक ही एंट्री हो
DGLogSchema.index({ adminId: 1, dgName: 1, date: 1 }, { unique: true });

const DGSet = mongoose.model('DGSet', DGSetSchema);
const DGLog = mongoose.model('DGLog', DGLogSchema);

module.exports = { DGSet, DGLog };