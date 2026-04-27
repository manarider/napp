// routes/admin.js
const express = require('express');
const User = require('../models/User');
const Booking = require('../models/Booking');
const MeetingRoom = require('../models/MeetingRoom');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const adminController = require('../controllers/adminfController');

const router = express.Router();

// 👨‍💼 ดูทุกคน (มี pagination)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // ⭐ Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      User.find().select('-password').skip(skip).limit(limit),
      User.countDocuments()
    ]);

    res.json({
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👤 ดูผู้ใช้คนเดี่ยว
router.get('/users/:id', authMiddleware, adminMiddleware, adminController.getUserById);

// 🔐 เปลี่ยนรหัสผ่านผู้ใช้
router.patch('/users/:id/password', authMiddleware, adminMiddleware, adminController.updateUserPassword);

// 🔄 เปลี่ยนสถานะผู้ใช้ (active/inactive)
router.patch('/users/:id/status', authMiddleware, adminMiddleware, adminController.updateUserStatus);

// 🔧 แก้ไขสิทธิ์ผู้ใช้ (Admin/User role)
router.patch('/users/:id/role', authMiddleware, adminMiddleware, adminController.updateUserRole);

// 🗑️ ลบผู้ใช้
router.delete('/users/:id', authMiddleware, adminMiddleware, adminController.deleteUser);

// 📊 ดูสถิติทั่วไป
router.get('/dashboard/statistics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalRooms = await MeetingRoom.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const approvedBookings = await Booking.countDocuments({ status: 'approved' });
    const rejectedBookings = await Booking.countDocuments({ status: 'rejected' });

    res.json({
      users: {
        total: totalUsers,
        admins: await User.countDocuments({ role: 'admin' }),
        regularUsers: await User.countDocuments({ role: 'user' })
      },
      rooms: {
        total: totalRooms
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        approved: approvedBookings,
        rejected: rejectedBookings
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📋 ดูการจองทั้งหมด (Admin View - มี pagination)
router.get('/bookings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    let query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    // ⭐ Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [bookings, totalCount] = await Promise.all([
      Booking.find(query)
        .populate('userId', 'fullName email department')
        .populate('roomId', 'roomNumber roomName capacity')
        .sort({ bookingDate: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query)
    ]);

    res.json({
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      bookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✏️ อนุมัติ/ปฏิเสธการจอง
router.put('/bookings/:bookingId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status, updatedAt: Date.now() },
      { new: true }
    ).populate('roomId').populate('userId', 'fullName email');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      message: `Booking ${status} successfully`,
      booking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ ลบการจอง (Admin only) - ⭐ เพิ่มส่วนนี้
router.delete('/bookings/:bookingId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await Booking.findByIdAndDelete(bookingId);

    res.json({ 
      message: 'Booking deleted successfully by admin',
      deletedId: bookingId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;