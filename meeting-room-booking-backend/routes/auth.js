const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validators');

const router = express.Router();

// 📝 Register - สมัครสมาชิก
router.post('/register', registerValidator, async (req, res) => {
  try {
    const { fullName, email, password, department } = req.body;

    // ✓ ตรวจสอบ input (ลบออก - validator ตรวจสอบแล้ว)
    // ✓ ตรวจสอบ email ซ้ำหรือไม่
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // ✓ สร้าง User ใหม่
    const user = new User({
      fullName,
      email,
      password,
      department
    });

    await user.save();

    res.status(201).json({ 
      message: 'User created successfully',
      userId: user._id 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔓 Login - เข้าระบบ
router.post('/login', loginValidator, async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✓ ตรวจสอบ input (ลบออก - validator ตรวจสอบแล้ว)
    // หา user จาก email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // ✓ ตรวจสอบ password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // ✓ สร้าง Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👤 Get Current User
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;