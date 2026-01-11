const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffId: { type:String, required: true },

  closingReading: { type: Number, required: true },

  photo: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
rejectionReason: { type: String, default: "" },
  month: { type: String, required: true },
  dateKey: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('Reading', ReadingSchema);

