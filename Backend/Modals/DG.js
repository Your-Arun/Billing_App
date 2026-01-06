const mongoose = require('mongoose');

const DGLogSchema = new mongoose.Schema({
  // किस कंपनी/एडमिन का डेटा है
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // DG का नाम (e.g., DG Set 1)
  dgName: { type: String, required: true },
  
  // आज की यूनिट्स और डीजल का खर्च
  unitsProduced: { type: Number, required: true },
  fuelCost: { type: Number, required: true },
  
  // तारीख (समय के बिना, ताकि सर्च आसान हो)
  date: { type: Date, required: true },
  
  // महीना और साल (ग्रुपिंग के लिए, e.g., "January 2026")
  month: { type: String, required: true } 
}, { timestamps: true });

// एक एडमिन, एक DG और एक तारीख के लिए केवल एक ही रिकॉर्ड हो (Duplicate रोकने के लिए)
DGLogSchema.index({ adminId: 1, dgName: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DGLog', DGLogSchema);