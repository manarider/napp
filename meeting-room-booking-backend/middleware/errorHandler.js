// middleware/errorHandler.js

// ⚡ Async Handler Wrapper - จัดการ async errors อัตโนมัติ
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 🛡️ Global Error Handler - ป้องกันไม่ให้เปิดเผยข้อมูล sensitive
const errorHandler = (err, req, res, next) => {
  // Log error ใน server console (เพื่อ debugging)
  console.error('❌ Error:', err);

  // Default status code
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map(val => val.message)
      .join(', ');
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // ⚠️ ใน production ไม่เปิดเผย error stack
  const response = {
    success: false,
    error: message,
  };

  // เฉพาะ development ถึงจะส่ง stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// 🚫 Not Found Handler
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { asyncHandler, errorHandler, notFound };
