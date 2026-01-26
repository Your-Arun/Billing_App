const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Modals/User');
const router = express.Router();
const twilio = require('twilio')
const dotenv = require('dotenv')
const Otp = require('../Modals/Otp');
const crypto = require('crypto'); 
const nodemailer = require('nodemailer');


dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS use karega
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
  tls: {
    rejectUnauthorized: false // Cloud hosting connection fix
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
      { id: user._id, role: user.role , },
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
  const { identifier, otp, newPassword } = req.body;

  try {
    if (!identifier) return res.status(400).json({ msg: "Email is required." });

    const user = await User.findOne({ email: identifier.toLowerCase() });
    if (!user) return res.status(404).json({ msg: "User not found with this email." });

    // --- STEP 1: OTP Send Logic ---
    if (!otp && !newPassword) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(generatedOtp, 10);

      user.resetPasswordToken = hashedOtp; 
      user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins validity
      await user.save();

      await transporter.sendMail({
        from: `"Property Manager" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Password Reset Verification Code",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #333399;">Password Reset</h2>
            <p>Aapka 6-digit verification code niche diya gaya hai:</p>
            <h1 style="background: #f4f4f9; padding: 15px; text-align: center; letter-spacing: 5px; color: #333;">${generatedOtp}</h1>
            <p>Yeh code 10 minute tak valid hai.</p>
          </div>
        `,
      });

      return res.status(200).json({ msg: "OTP sent to your email." });
    }

    // --- STEP 2: Verify & Reset Logic ---
    if (otp && newPassword) {
      if (!user.resetPasswordToken || !user.resetPasswordExpires || new Date(user.resetPasswordExpires) < new Date()) {
        return res.status(400).json({ msg: "OTP expired. Request a new one." });
      }

      const isOtpValid = await bcrypt.compare(otp, user.resetPasswordToken);
      if (!isOtpValid) return res.status(400).json({ msg: "Invalid OTP code." });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      return res.status(200).json({ msg: "Password has been reset successfully! ✅" });
    }

    res.status(400).json({ msg: "Invalid request data." });

  } catch (error) {
    console.error("Forgot-password error:", error);
    res.status(500).json({ msg: "Server error. Try again later." });
  }
});




module.exports = router;
