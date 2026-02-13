// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ============================================
// 🔍 CHECK ENV VARIABLES
// ============================================
if (!process.env.MONGODB_URI) {
  console.error('❌ FATAL ERROR: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// ============================================
// 🔧 MIDDLEWARE
// ============================================

// ✅ CORS Configuration - เฉพาะ domain ที่อนุญาต
const allowedOrigins = [
  'https://nssv.nsm.go.th',
  'http://nssv.nsm.go.th',
  'http://localhost:3000', // สำหรับ Development
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // อนุญาตให้ request ที่ไม่มี origin (เช่น Postman, curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ⭐ เพิ่ม limit สำหรับรองรับ Base64 รูปภาพ (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// 🛡️ RATE LIMITING
// ============================================

// Rate limit สำหรับ Login (ป้องกัน Brute Force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 5, // จำกัด 5 ครั้งต่อ IP
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit สำหรับ Register
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 3, // จำกัด 3 ครั้งต่อ IP
  message: 'Too many accounts created from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit ทั่วไป (ป้องกัน DDoS)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 นาที
  max: 100, // จำกัด 100 requests ต่อนาที
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter); // ใช้กับทุก routes

// Logger Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] 📝 ${req.method} ${req.path}`);
  if (Object.keys(req.query).length > 0) {
    console.log('   Query:', req.query);
  }
  next();
});

// ============================================
// 📡 DATABASE CONNECTION
// ============================================

const connectDB = async () => {
  try {
    // Mongoose 6+ ไม่จำเป็นต้องใส่ useNewUrlParser/useUnifiedTopology แล้ว
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ MongoDB Connected Successfully');
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// ============================================
// 🛣️ ROUTES IMPORTS
// ============================================

// ตรวจสอบให้แน่ใจว่าไฟล์เหล่านี้มีอยู่จริงใน folder routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const roomRoutes = require('./routes/rooms');
const departmentRoutes = require('./routes/departments');
const adminRoutes = require('./routes/admin');
const adminStatsRoutes = require('./routes/adminStats');

// ============================================
// ✅ USE ROUTES
// ============================================

// Health Check Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Meeting Room API is running 🚀',
    version: '1.0.0',
    status: 'OK',
    serverTime: new Date()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API Working! ✅',
    timestamp: new Date()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Application Routes
app.use('/api/auth/login', loginLimiter); // Rate limit เฉพาะ login
app.use('/api/auth/register', registerLimiter); // Rate limit เฉพาะ register
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/stats', adminStatsRoutes);

// ============================================
// ⚠️ ERROR HANDLING
// ============================================

// 404 Not Found
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  // CORS Error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'Access denied by CORS policy',
      message: 'Your domain is not allowed to access this API'
    });
  }
  
  // Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  // MongoDB Error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate entry',
      field: Object.keys(err.keyPattern)[0]
    });
  }
  
  // Default Error
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// 🚀 START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🚀 Server Started Successfully!      ║
╠═══════════════════════════════════════╣
║  Port: ${PORT}                           ║
║  Host: 0.0.0.0 (Public Access)        ║
║  Time: ${new Date().toLocaleString()}     ║
║  JSON Limit: 10MB (Images Supported)  ║
╚═══════════════════════════════════════╝
  `);
});

// ============================================
// 🔌 GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = (signal) => {
  console.log(`\n🔌 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('✅ HTTP Server closed');
    try {
      // รอให้ MongoDB ปิดการเชื่อมต่อเสร็จก่อน
      await mongoose.connection.close(false);
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during database disconnection', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
