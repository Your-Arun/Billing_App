const express = require('express');
const router = express.Router();
const User = require('../Modals/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role,companyName, adminCodeInput } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser;
    if (role === 'Admin') {
      const generatedCode = "COMP" + Math.floor(1000 + Math.random() * 9000);
      newUser = new User({ name, email, password: hashedPassword,companyName, role, adminCode: generatedCode });
    } else {
      const admin = await User.findOne({ adminCode: adminCodeInput, role: 'Admin' });
      if (!admin) return res.status(400).json({ msg: "Invalid Admin Code! Staff cannot join without a valid company code." });
      
      newUser = new User({ name, email, password: hashedPassword, companyName,role, belongsToAdmin: admin._id });
    }

    await newUser.save();
    res.status(201).json({ msg: "Success", adminCode: newUser.adminCode });

  } catch (err) {
    res.status(500).json({ msg: "Server Error: " + err.message });
  }
});


router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ msg: "User does not exist" });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
      const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET || 'fallback_secret', 
        { expiresIn: '1d' }
      );
      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          role: user.role, 
          email: user.email,
          companyName: user.companyName,
          adminCode: user.adminCode, 
          belongsToAdmin: user.belongsToAdmin 
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server Error: " + err.message });
    }
});

module.exports = router;