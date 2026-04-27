// middleware/validators.js
const { body, param, query, validationResult } = require('express-validator');

// ฟังก์ชันตรวจสอบผลลัพธ์จาก validator
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// ============================================
// 🔐 AUTH VALIDATORS
// ============================================

const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('กรุณากรอกชื่อ-นามสกุล')
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อต้องมีความยาว 2-100 ตัวอักษร'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('กรุณากรอกอีเมล')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่าน')
    .isLength({ min: 8 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('รหัสผ่านต้องมี: ตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่, ตัวเลข, และอักขระพิเศษ (!@#$%^&* เป็นต้น)'),
  
  body('department')
    .trim()
    .notEmpty().withMessage('กรุณาเลือกแผนก'),
  
  validate
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('กรุณากรอกอีเมล')
    .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
  
  body('password')
    .notEmpty().withMessage('กรุณากรอกรหัสผ่าน'),
  
  validate
];

// ============================================
// 📅 BOOKING VALIDATORS
// ============================================

const createBookingValidator = [
  body('roomId')
    .notEmpty().withMessage('กรุณาเลือกห้องประชุม')
    .isMongoId().withMessage('รหัสห้องไม่ถูกต้อง'),
  
  body('fullName')
    .trim()
    .notEmpty().withMessage('กรุณากรอกชื่อผู้จอง')
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อต้องมีความยาว 2-100 ตัวอักษร'),
  
  body('department')
    .trim()
    .notEmpty().withMessage('กรุณากรอกแผนก'),
  
  body('bookingDate')
    .notEmpty().withMessage('กรุณาเลือกวันที่จอง')
    .isISO8601().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('ไม่สามารถจองย้อนหลังได้');
      }
      return true;
    }),
  
  body('startTime')
    .notEmpty().withMessage('กรุณาเลือกเวลาเริ่มต้น')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('รูปแบบเวลาไม่ถูกต้อง (ต้องเป็น HH:MM)'),
  
  body('endTime')
    .notEmpty().withMessage('กรุณาเลือกเวลาสิ้นสุด')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('รูปแบบเวลาไม่ถูกต้อง (ต้องเป็น HH:MM)')
    .custom((endTime, { req }) => {
      const start = req.body.startTime;
      if (start && endTime <= start) {
        throw new Error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      }
      return true;
    }),
  
  body('purpose')
    .trim()
    .notEmpty().withMessage('กรุณากรอกวัตถุประสงค์')
    .isLength({ min: 5, max: 500 }).withMessage('วัตถุประสงค์ต้องมีความยาว 5-500 ตัวอักษร'),
  
  validate
];

// Validator สำหรับจองหลายวัน
const createMultiDayBookingValidator = [
  body('roomId')
    .notEmpty().withMessage('กรุณาเลือกห้องประชุม')
    .isMongoId().withMessage('รหัสห้องไม่ถูกต้อง'),
  
  body('fullName')
    .trim()
    .notEmpty().withMessage('กรุณากรอกชื่อผู้จอง')
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อต้องมีความยาว 2-100 ตัวอักษร'),
  
  body('department')
    .trim()
    .notEmpty().withMessage('กรุณากรอกแผนก'),
  
  body('startDate')
    .notEmpty().withMessage('กรุณาเลือกวันที่เริ่มต้น')
    .isISO8601().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        throw new Error('ไม่สามารถจองย้อนหลังได้');
      }
      return true;
    }),
  
  body('endDate')
    .notEmpty().withMessage('กรุณาเลือกวันที่สิ้นสุด')
    .isISO8601().withMessage('รูปแบบวันที่ไม่ถูกต้อง')
    .custom((endDate, { req }) => {
      const start = new Date(req.body.startDate);
      const end = new Date(endDate);
      if (end <= start) {
        throw new Error('วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น (ไม่สามารถเลือกวันเดียวกันได้)');
      }
      return true;
    }),
  
  body('startTime')
    .notEmpty().withMessage('กรุณาเลือกเวลาเริ่มต้น')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('รูปแบบเวลาไม่ถูกต้อง (ต้องเป็น HH:MM)'),
  
  body('endTime')
    .notEmpty().withMessage('กรุณาเลือกเวลาสิ้นสุด')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('รูปแบบเวลาไม่ถูกต้อง (ต้องเป็น HH:MM)')
    .custom((endTime, { req }) => {
      const start = req.body.startTime;
      if (start && endTime <= start) {
        throw new Error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      }
      return true;
    }),
  
  body('purpose')
    .trim()
    .notEmpty().withMessage('กรุณากรอกวัตถุประสงค์')
    .isLength({ min: 5, max: 500 }).withMessage('วัตถุประสงค์ต้องมีความยาว 5-500 ตัวอักษร'),
  
  validate
];

const updateBookingStatusValidator = [
  param('bookingId')
    .isMongoId().withMessage('รหัสการจองไม่ถูกต้อง'),
  
  body('status')
    .isIn(['pending', 'approved', 'rejected']).withMessage('สถานะไม่ถูกต้อง'),
  
  validate
];

// ============================================
// 🏨 ROOM VALIDATORS
// ============================================

const createRoomValidator = [
  body('roomNumber')
    .trim()
    .notEmpty().withMessage('กรุณากรอกหมายเลขห้อง')
    .isLength({ min: 1, max: 20 }).withMessage('หมายเลขห้องต้องมีความยาว 1-20 ตัวอักษร'),
  
  body('roomName')
    .trim()
    .notEmpty().withMessage('กรุณากรอกชื่อห้อง')
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อห้องต้องมีความยาว 2-100 ตัวอักษร'),
  
  body('capacity')
    .notEmpty().withMessage('กรุณากรอกจำนวนที่นั่ง')
    .isInt({ min: 1, max: 1000 }).withMessage('จำนวนที่นั่งต้องเป็นตัวเลข 1-1000'),
  
  body('facilities')
    .optional()
    .isArray().withMessage('สิ่งอำนวยความสะดวกต้องเป็น Array'),
  
  validate
];

const updateRoomValidator = [
  param('id')
    .isMongoId().withMessage('รหัสห้องไม่ถูกต้อง'),
  
  body('roomNumber')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 }).withMessage('หมายเลขห้องต้องมีความยาว 1-20 ตัวอักษร'),
  
  body('roomName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อห้องต้องมีความยาว 2-100 ตัวอักษร'),
  
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('จำนวนที่นั่งต้องเป็นตัวเลข 1-1000'),
  
  validate
];

const mongoIdValidator = [
  param('id')
    .isMongoId().withMessage('รหัสไม่ถูกต้อง'),
  
  validate
];

// ============================================
// 🏢 DEPARTMENT VALIDATORS
// ============================================

const createDepartmentValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('กรุณากรอกชื่อแผนก')
    .isLength({ min: 2, max: 100 }).withMessage('ชื่อแผนกต้องมีความยาว 2-100 ตัวอักษร'),
  
  body('code')
    .trim()
    .notEmpty().withMessage('กรุณากรอกรหัสแผนก')
    .isLength({ min: 2, max: 20 }).withMessage('รหัสแผนกต้องมีความยาว 2-20 ตัวอักษร')
    .matches(/^[A-Z0-9_]+$/).withMessage('รหัสแผนกต้องเป็นตัวพิมพ์ใหญ่และตัวเลขเท่านั้น'),
  
  validate
];

module.exports = {
  // Auth
  registerValidator,
  loginValidator,
  
  // Booking
  createBookingValidator,
  createMultiDayBookingValidator,
  updateBookingStatusValidator,
  
  // Room
  createRoomValidator,
  updateRoomValidator,
  mongoIdValidator,
  
  // Department
  createDepartmentValidator,
  
  // Helper
  validate
};
