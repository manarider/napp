const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validators');
const umsAuthController = require('../controllers/umsAuthController');

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
      // [SEC-03] ใช้ข้อความเดียวกับ "invalid password" เพื่อป้องกัน username enumeration
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // ✓ ตรวจสอบ password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // [SEC-03] ใช้ข้อความเดียวกับ "user not found" เพื่อป้องกัน username enumeration
      return res.status(400).json({ error: 'Invalid credentials' });
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
    // ตรวจสอบว่าเป็น UMS user หรือไม่
    if (req.userId.startsWith('ums_')) {
      // UMS user - ส่ง user data จาก token
      return res.json({
        id: req.userId,
        role: req.userRole,
        source: 'ums',
        // ข้อมูลเพิ่มเติมอาจต้องดึงจาก UMS อีกครั้งหรือเก็บใน token
        // ในกรณีนี้เราจะให้ frontend เก็บ user data ไว้ใน localStorage
        message: 'UMS user - please use stored user data'
      });
    }

    // Local user - ดึงจาก database
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔐 UMS Authentication - แลก authorization code เป็น JWT token
router.post('/exchange-code', umsAuthController.exchangeCode);

module.exports = router;