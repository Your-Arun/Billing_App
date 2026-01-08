const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // e.g., "January 2026"
  totalUnits: { type: Number, required: true },
  energyCharges: { type: Number, required: true },
  fixedCharges: { type: Number, required: true },
  taxes: { type: Number, default: 0 },
  billUrl: { type: String }, // Cloudinary PDF/Image link
  totalAmount: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);