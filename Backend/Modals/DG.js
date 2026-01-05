const mongoose = require('mongoose');
const DGSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true },
  unitsProduced: { type: Number, required: true },
  fuelCost: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
module.exports = mongoose.model('DG', DGSchema);