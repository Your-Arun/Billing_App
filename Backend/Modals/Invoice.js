const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    tenantName: String,
    meterId: String,
    amount: Number,
    units: Number,
    opening: Number,
    closing: Number,
    multiplier: Number,
    month: String, // e.g. "Jan 2026"
    dateRange: String, // e.g. "01/01/2026 - 15/01/2026"
    pdfUrl: String, // Future use ke liye
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);