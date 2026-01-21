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

    htmlContent: String,
    pdfUrl: String,

    gridUnits: Number,
    gridAmount: Number,
    gridFixedPrice: Number,
    solarUnits: Number,
    totalTenantUnitsSum: Number,
    totalTenantAmountSum: Number,
    commonLoss: Number,
    lossPercent: Number,
    profit: Number,

}, { timestamps: true });


module.exports = mongoose.model('Statement', StatementSchema);
