const mongoose = require('mongoose');

const BusinessSummarySchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true }, // e.g., "Jan 2026"
    dateRange: String,
    gridUnits: Number,
    gridAmount: Number,
    gridFixedPrice: Number,
    solarUnits: Number,
    totalTenantUnitsSum: Number,
    totalTenantAmountSum: Number,
    commonLoss: Number,
    lossPercent: Number,
    profit: Number
}, { timestamps: true });

// Taki ek mahine ka data ek hi baar save ho (Duplicate na ho)
BusinessSummarySchema.index({ adminId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('BusinessSummary', BusinessSummarySchema);