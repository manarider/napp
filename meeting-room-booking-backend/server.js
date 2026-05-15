// server.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ⚙️ Trust proxy - สำหรับใช้งานหลัง Nginx
app.set('trust proxy', 1);

// ============================================
// 🔍 CHECK ENV VARIABLES
// ============================================
if (!process.env.MONGODB_URI) {
  console.error('❌ FATAL ERROR: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL ERROR: JWT_SECRET is not defined in .env file');
  console.error('   Please add JWT_SECRET to your .env file');
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

// ⭐ เพิ่ม limit สำหรับรองรับไฟล์ media (video/image base64 ~37MB ออก base64 ~49MB)
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

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
  // ✅ trust proxy: 1 (line 12) จัดการ X-Forwarded-For ให้แล้ว req.ip จึงถูกต้อง
});

// ✅ เปิด general limiter ป้องกัน DDoS
app.use(generalLimiter);

// Logger Middleware (Production: only errors)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 📝 ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// 📡 DATABASE CONNECTION
// ============================================

let retryCount = 0;
const MAX_RETRIES = 10;

const connectDB = async () => {
  try {
    // Mongoose 6+ ไม่จำเป็นต้องใส่ useNewUrlParser/useUnifiedTopology แล้ว
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB Connected Successfully');
    retryCount = 0; // Reset retry count on success
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    // จำกัดจำนวนครั้งในการ retry
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`⏳ Retrying connection (${retryCount}/${MAX_RETRIES}) in 5 seconds...`);
      setTimeout(connectDB, 5000);
    } else {
      console.error('❌ Max retries reached. Shutting down...');
      process.exit(1);
    }
  }
};

connectDB();

// ============================================
// 🛣️ ROUTES IMPORTS
// ============================================

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const roomRoutes = require('./routes/rooms');
const departmentRoutes = require('./routes/departments');
const adminRoutes = require('./routes/admin');
const adminStatsRoutes = require('./routes/adminStats');
const displayRoutes = require('./routes/display');

// ============================================
// 📁 STATIC FILES — Media uploads (public)
// ============================================
app.use('/api/display/uploads', express.static(path.join(__dirname, 'uploads/display')));

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

// ⚠️ Debug endpoints - เฉพาะ development mode
if (process.env.NODE_ENV === 'development') {
  app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods)
        });
      } else if (middleware.name === 'router' && middleware.regexp) {
        const basePath = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\/g, '');
        if (middleware.handle && middleware.handle.stack) {
          middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
              routes.push({
                path: basePath + handler.route.path,
                methods: Object.keys(handler.route.methods)
              });
            }
          });
        }
      }
    });
    res.json({ total: routes.length, routes });
  });
}

// Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin/stats', adminStatsRoutes); // ⭐ ต้องอยู่ก่อน /api/admin
app.use('/api/admin', adminRoutes);
app.use('/api/display', displayRoutes);

// ============================================
// ⚠️ ERROR HANDLING
// ============================================

const { errorHandler, notFound } = require('./middleware/errorHandler');

// 404 Not Found - ใช้ middleware
app.use(notFound);

// Global Error Handler - ใช้ middleware ที่ปลอดภัย
app.use(errorHandler);

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
