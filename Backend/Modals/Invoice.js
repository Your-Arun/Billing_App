const mongoose = require('mongoose');

const StatementSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true },

    tenantName: String,
    meterId: String,
    periodFrom: Date,
    periodTo: Date,
    month:String,
    opening: Number,
    closing: Number,
    units: Number,
    multiplierCT: Number,
    ratePerUnit: Number,
    fixed: Number,
    transLoss: Number,
    dgCharge: Number,
    totalAmount: Number,
    transformerLoss: Number,
    pdfUrl: String,
    htmlContent: String,


}, { timestamps: true });


module.exports = mongoose.model('Statement', StatementSchema);
