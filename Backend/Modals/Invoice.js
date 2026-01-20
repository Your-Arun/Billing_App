const mongoose = require('mongoose');

const StatementSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },

  tenantName: String,
  meterId: String,

  periodFrom: Date,
  periodTo: Date,

  units: Number,
  totalAmount: Number,

  htmlContent: String,   // ✅ ADD THIS
  pdfUrl: String,
}, { timestamps: true });


module.exports = mongoose.model('Statement', StatementSchema);
