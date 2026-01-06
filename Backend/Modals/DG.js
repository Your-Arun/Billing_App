const mongoose = require('mongoose');

const DGLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  dgName: { type: String, required: true },

  unitsProduced: { type: Number, required: true, min: 0 },
  fuelCost: { type: Number, required: true, min: 0 },

  date: { type: Date, required: true },

  month: { type: String, required: true },
  monthKey: { type: String, required: true }

}, { timestamps: true });

DGLogSchema.index(
  { adminId: 1, dgName: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model('DGLog', DGLogSchema);
