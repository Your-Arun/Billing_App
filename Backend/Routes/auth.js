const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Modals/User');
const router = express.Router();
const twilio = require('twilio')
const dotenv = require('dotenv')
const Otp = require('../Modals/Otp');
const crypto = require('crypto'); // Built-in Node module
const nodemailer = require('nodemailer');


dotenv.config();


// 📧 Nodemailer Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Aapka Gmail
    pass: process.env.EMAIL_PASS, // Aapka Gmail "App Password"
  },
});



// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, phone, password, role, companyName, email,adminCodeInput } = req.body;

    if (!name || !phone || !password || !role)
      return res.status(400).json({ msg: 'Missing required fields' });

    const exists = await User.findOne({ phone });
    if (exists) return res.status(400).json({ msg: 'User already exists' });

    let finalCompanyName = companyName;
    let belongsToAdmin = null;
    let adminCode = null;

    if (role === 'Admin') {
      if (!companyName) return res.status(400).json({ msg: 'Company name required' });
      adminCode = 'COMP' + Math.floor(100000 + Math.random() * 900000);
    }

    if (role === 'Reading Taker') {
      const admin = await User.findOne({ adminCode: adminCodeInput, role: 'Admin' });
      if (!admin) return res.status(400).json({ msg: 'Invalid Admin Code' });
      finalCompanyName = admin.companyName;
      belongsToAdmin = admin._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      phone,
      password: hashedPassword,
      role,
      email,
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
      { id: user._id, role: user.role },
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


// 📧 1. FORGET PASSWORD - SEND OTP
router.post('/forget-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "Is email ke sath koi user nahi mila." });
    }

    // 🔢 6-Digit OTP Generate karein
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    // OTP ko token ki jagah save karein (Valid for 10 minutes)
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = Date.now() + 600000; // 10 mins expiry
    await user.save();

    // ✉️ Email Content
    const mailOptions = {
      to: user.email,
      from: `Property Manager Admin <${process.env.EMAIL_USER}>`,
      subject: 'Your Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #333399;">Password Reset Request</h2>
          <p>Aapne password reset ke liye request ki hai. Aapka verification code niche diya gaya hai:</p>
          <div style="background: #F0F2FF; padding: 20px; text-align: center; border-radius: 10px;">
            <h1 style="letter-spacing: 5px; color: #333399; margin: 0;">${otp}</h1>
          </div>
          <p style="margin-top: 20px;">Yeh OTP 10 minute tak valid rahega.</p>
          <p>Agar aapne yeh request nahi ki hai, toh kripya is email ko ignore karein.</p>
          <hr style="border: none; border-top: 1px solid #EEE;" />
          <small>Property Manager System Admin</small>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ msg: "Aapke email par 6-digit OTP bhej diya gaya hai." });

  } catch (err) {
    console.error("Mail Error:", err);
    res.status(500).json({ msg: "OTP bhejne mein dikkat aayi." });
  }
});


// 🔐 2. RESET PASSWORD - VERIFY OTP & UPDATE
router.post('/reset-password-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1. User dhoondein jiska email aur OTP match kare aur expiry bachi ho
    const user = await User.findOne({
      email: email,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: "OTP galat hai ya expire ho chuka hai." });
    }

    // 2. Naya Password set karein
    user.password = newPassword; // Agar model mein hashing hai toh wo auto-hash ho jayega
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ success: true, msg: "Password kamyabi se badal diya gaya hai! ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Password reset nahi ho paya." });
  }
});

module.exports = router;
