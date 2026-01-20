const mongoose = require('mongoose');

const StatementSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Tenant"
  },
  tenantName: String,
  meterId: String,
  periodFrom: String,
  periodTo: String,
  units: Number,
  totalAmount: Number,

  htmlContent: {
    type: String,     // ✅ SAME HTML
    required: true
  },

  pdfUrl: String
}, { timestamps: true });


module.exports = mongoose.model('Statement', StatementSchema);
