const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  meterId: { type: String, required: true },
  openingMeter: { type: Number, required: true },
  multiplierCT: { type: Number, default: 1 },
  ratePerUnit: { type: Number, required: true },
  transformerLoss: { type: Number, default: 0 },
  fixedCharge: { type: Number, default: 0 },
  currentClosing: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tenant', TenantSchema);