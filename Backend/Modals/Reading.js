const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closingReading: { type: Number, required: true },
 photo: { type: String, required: true }, 
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  month: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Reading', ReadingSchema);