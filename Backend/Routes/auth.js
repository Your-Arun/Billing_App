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


const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Port 587 ke liye false hota hai
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 16 digit App Password (bina space ke)
  },
  // 🟢 Timeout issues fix karne ke liye ye settings add karein
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false // Cloud hosting par certificate issues fix karta hai
  }
});

// Check connection
transporter.verify((error, success) => {
  if (error) {
    console.log("Nodemailer Error:", error.message);
  } else {
    console.log("Server is ready to take our messages ✅");
  }
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
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "Is email ke sath koi user nahi mila." });
    }

    // 🔢 4-Digit OTP (Aapne niche 4 digit logic use kiya hai)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    
    user.resetPasswordToken = otp;
    user.resetPasswordExpires = Date.now() + 600000; // 10 mins expiry
    await user.save();

    const mailOptions = {
      from: `"Property Manager" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #333399;">Password Reset Request</h2>
          <p>Aapka verification code niche diya gaya hai:</p>
          <div style="background: #f4f4f9; padding: 15px; text-align: center; border-radius: 8px;">
            <h1 style="letter-spacing: 5px; color: #333; margin: 0;">${otp}</h1>
          </div>
          <p>Yeh OTP 10 minute tak valid rahega.</p>
          <p>Agar aapne yeh request nahi ki hai, toh kripya is email ko ignore karein.</p>
        </div>
      `
    };

    // ⚠️ Mail bhejne ka wait karein
    await transporter.sendMail(mailOptions);
    
    return res.json({ msg: "OTP bhej diya gaya hai. Inbox check karein." });

  } catch (err) {
    console.error("MAIL SENDING ERROR:", err);
    return res.status(500).json({ msg: "OTP bhejne mein dikkat aayi. Check server logs." });
  }
});


router.post('/reset-password-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email: email,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: "OTP galat hai ya expire ho chuka hai." });
    }

    // 🔐 Naya password hash karein
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.json({ success: true, msg: "Password badal diya gaya hai! ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
