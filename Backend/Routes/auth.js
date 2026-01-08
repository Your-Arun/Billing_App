const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Modals/User');
const router = express.Router();

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, phone, password, role, companyName, adminCodeInput } = req.body;

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

module.exports = router;
