const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Modals/User');
const router = express.Router();
const twilio = require('twilio')
const dotenv = require('dotenv')
const Otp = require('../Modals/Otp');
const crypto = require('crypto');
const { sendOtpMail } = "../utils/sendOtpMail";
dotenv.config();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, phone, password, role, companyName, email, adminCodeInput } = req.body;

    if (!name || !phone || !password || !role)
      return res.status(400).json({ msg: 'Missing required fields' });

    // ✅ CLEAN EMAIL FIRST
    const cleanEmail = email?.trim().toLowerCase();

    const exists = await User.findOne({ phone });
    if (exists) return res.status(400).json({ msg: 'User already exists' });

    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists)
      return res.status(400).json({ msg: 'Email already registered' });

    let finalCompanyName = companyName;
    let belongsToAdmin = null;
    let adminCode = null;

    if (role === 'Admin') {
      if (!companyName)
        return res.status(400).json({ msg: 'Company name required' });

      adminCode = 'COMP' + Math.floor(100000 + Math.random() * 900000);
    }

    if (role === 'Reading Taker') {
      const admin = await User.findOne({ adminCode: adminCodeInput, role: 'Admin' });
      if (!admin)
        return res.status(400).json({ msg: 'Invalid Admin Code' });

      finalCompanyName = admin.companyName;
      belongsToAdmin = admin._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      phone,
      password: hashedPassword,
      role,
      email: cleanEmail,
      companyName: finalCompanyName,
      adminCode,
      belongsToAdmin
    });

    await user.save();

    return res.status(201).json({ msg: 'Account created', adminCode });

  } catch (err) {
    console.error('SIGNUP ERROR:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});


// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ msg: 'Phone & password required' });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ msg: 'Invalid phone or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid phone or password' });

    const token = jwt.sign(
      { id: user._id, role: user.role, },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    return res.json({ token, user });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
});


// const client = twilio(
//   process.env.TWILIO_SID,
//   process.env.TWILIO_AUTH
// );

// router.post('/login/send-otp', async (req, res) => {
//   try {
//     const { phone } = req.body;
//     if (!phone) return res.status(400).json({ msg: 'Phone required' });

//     const user = await User.findOne({ phone });
//     if (!user) return res.status(400).json({ msg: 'User not found' });

//     const otp = Math.floor(1000 + Math.random() * 9000).toString();

//     // 🔥 ONLY OTP delete, NOT USER
//     await Otp.deleteMany({ phone });

//     await Otp.create({
//       phone,
//       otp,
//       expiresAt: new Date(Date.now() + 2 * 60 * 1000)
//     });

//     await client.messages.create({
//       from: process.env.TWILIO_WHATSAPP_FROM,
//       to: `whatsapp:+91${phone}`,
//       body: `Your login OTP is ${otp}. Valid for 2 minutes.`
//     });

//     return res.json({ msg: 'OTP sent on WhatsApp' });

//   } catch (err) {
//     console.error('SEND OTP ERROR:', err);
//     return res.status(500).json({ msg: 'Server error' });
//   }
// });


// router.post('/login/verify-otp', async (req, res) => {
//   try {
//     const { phone, otp } = req.body;
//     if (!phone || !otp)
//       return res.status(400).json({ msg: 'Phone & OTP required' });

//     const otpRecord = await Otp.findOne({ phone, otp });
//     if (!otpRecord)
//       return res.status(400).json({ msg: 'Invalid OTP' });

//     if (otpRecord.expiresAt < Date.now())
//       return res.status(400).json({ msg: 'OTP expired' });

//     const user = await User.findOne({ phone });
//     if (!user)
//       return res.status(400).json({ msg: 'User not found' });

//     // OTP used → delete
//     await Otp.deleteMany({ phone });

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET || 'fallback_secret',
//       { expiresIn: '1d' }
//     );

//     return res.json({ token, user });

//   } catch (err) {
//     console.error('VERIFY OTP ERROR:', err);
//     return res.status(500).json({ msg: 'Server error' });
//   }
// });

router.post("/forgot-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email) return res.status(400).json({ message: "Email is required" });

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) return res.status(404).json({ message: "Is email ke sath koi user nahi mila." });

    // ========= STEP 1: SEND OTP =========
    if (!otp && !newPassword) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // OTP ko hash karke DB mein save karein
      const hashedOtp = await bcrypt.hash(generatedOtp, 10);
      user.resetOtp = hashedOtp;
      user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
      await user.save();

      // Mail bhejein
      await sendOtpMail(user.email, generatedOtp);

      return res.status(200).json({ message: "OTP bhej diya gaya hai ✅" });
    }

    // ========= STEP 2: VERIFY & RESET =========
    if (otp && newPassword) {
      // Expiry check
      if (!user.resetOtp || !user.resetOtpExpires || user.resetOtpExpires < Date.now()) {
        return res.status(400).json({ message: "OTP expire ho gaya hai" });
      }

      // Match check
      const isValid = await bcrypt.compare(otp, user.resetOtp);
      if (!isValid) return res.status(400).json({ message: "Invalid OTP code" });

      // Password hash karke save karein
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      
      // Clear reset fields
      user.resetOtp = null;
      user.resetOtpExpires = null;
      await user.save();

      return res.status(200).json({ message: "Password reset successful 🎉" });
    }

    return res.status(400).json({ message: "Invalid Request" });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Email service failed. Domain verified?" });
  }
});


module.exports = router;
