// const mongoose = require('mongoose');

// const SolarLogSchema = new mongoose.Schema({
//   adminId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },

//   unitsGenerated: {
//     type: Number,
//     required: true
//   },

//   // Date without time
//   date: {
//     type: Date,
//     required: true
//   },

//   // "January 2026"
//   month: {
//     type: String,
//     required: true
//   }
// }, { timestamps: true });

// // One admin + one date = one record (overwrite allowed)
// SolarLogSchema.index({ adminId: 1, date: 1 }, { unique: true });

// module.exports = mongoose.model('SolarLog', SolarLogSchema);



// models/Solar.js
const mongoose = require('mongoose');

const SolarSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  unitsGenerated: { type: Number, required: true }
}, { timestamps: true });

SolarSchema.index({ adminId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Solar', SolarSchema);
