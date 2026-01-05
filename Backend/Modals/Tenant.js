const mongoose = require('mongoose');

const TenantSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  meterId: {
    type: String,
    required: true,
    trim: true
  },

  openingMeter: { type: Number, required: true, min: 0 },
  multiplierCT: { type: Number, default: 1, min: 1 },
  ratePerUnit: { type: Number, required: true, min: 0 },
  transformerLoss: { type: Number, default: 0, min: 0 },
  fixedCharge: { type: Number, default: 0, min: 0 },

  currentClosing: { type: Number, default: 0, min: 0 },

  phone: { type: String, trim: true },
  connectedDG: { type: String, default: "None" },
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

TenantSchema.index({ adminId: 1, meterId: 1 }, { unique: true });

module.exports = mongoose.model('Tenant', TenantSchema);