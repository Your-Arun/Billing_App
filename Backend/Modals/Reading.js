const mongoose = require('mongoose');
  
  const ReadingSchema = new mongoose.Schema({ 
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    month: String,
    opening: Number,
    closing: Number,
    units: Number,
    status: { type: String, default: 'Pending' }    
});

module.exports = mongoose.model('Reading', ReadingSchema);