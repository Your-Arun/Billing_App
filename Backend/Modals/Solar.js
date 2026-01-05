const mongoose = require('mongoose');
const SolarSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // e.g. "January 2026"
  unitsGenerated: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Solar', SolarSchema);