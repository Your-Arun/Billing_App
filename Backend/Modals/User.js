const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  companyName: { type: String },
  role: { type: String, enum: ['Admin', 'Reading Taker'], required: true },
  adminCode: { type: String, unique: true, sparse: true },
  belongsToAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  otp:{ type:String},
  expiresAt: {type:Date},
  resetPasswordToken:{ type:String},
  resetPasswordExpires:{type:Date},
});

module.exports = mongoose.model('User', UserSchema);
