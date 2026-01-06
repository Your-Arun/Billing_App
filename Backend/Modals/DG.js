const mongoose = require('mongoose');

const DGSetSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dgName: { type: String, required: true }
});

const DGLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dgName: { type: String, required: true },
    date: { type: Date, required: true },
    month: { type: String, required: true }, 
    unitsProduced: { type: Number, default: 0 },
    fuelCost: { type: Number, default: 0 }
}, { timestamps: true });

const DGSet = mongoose.model('DGSet', DGSetSchema);
const DGLog = mongoose.model('DGLog', DGLogSchema);

module.exports = { DGSet, DGLog };