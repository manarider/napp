const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ตรวจสอบ Token ว่าถูกต้องหรือไม่
// [SEC-02] async เพื่อตรวจสถานะ user ใน DB — ป้องกัน inactive user ใช้ token เดิมได้
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token not found' });
    }
    
    // Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;

    // ตรวจสอบว่า local user ยังคง active อยู่หรือไม่
    // (UMS user ไม่มีใน DB จึงข้ามการตรวจ)
    if (!String(decoded.id).startsWith('ums_')) {
      const user = await User.findById(decoded.id).select('status').lean();
      if (!user || user.status === 'inactive') {
        return res.status(401).json({ error: 'Account is disabled or not found' });
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ตรวจสอบ Admin เท่านั้น
const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };