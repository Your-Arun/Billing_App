const mongoose = require('mongoose');

const DGSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dgName: { type: String, required: true },
  date: { type: Date, required: true },
  month: { type: String, required: true },
  unitsProduced: { type: Number, required: true },
  fuelCost: { type: Number, required: true },     
  connectedTenants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }] 
}, { timestamps: true });

module.exports = mongoose.model('DG', DGSchema);