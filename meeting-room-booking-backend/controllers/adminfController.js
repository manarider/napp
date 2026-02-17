const User = require('../models/User');
const Booking = require('../models/Booking');
const MeetingRoom = require('../models/MeetingRoom');

// 👨‍💼 ดูทุกคน
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // ไม่ส่ง password

    res.json({
      total: users.length,
      users
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 👤 ดูผู้ใช้คนเดี่ยว
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔧 แก้ไขสิทธิ์ผู้ใช้ (ให้เป็น Admin หรือ User)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// � เปลี่ยนรหัสผ่านผู้ใช้ (Admin)
exports.updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // อัพเดทรหัสผ่าน (จะถูก hash โดย pre-save middleware)
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password updated successfully',
      userId: id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔄 เปลี่ยนสถานะผู้ใช้ (active/inactive)
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive"' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User status updated successfully',
      user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// �🗑️ ลบผู้ใช้
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ✓ ตรวจสอบว่าผู้ใช้นี้มีการจองไหม
    const bookingCount = await Booking.countDocuments({ userId: id });

    if (bookingCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete user. User has ${bookingCount} bookings` 
      });
    }

    await User.findByIdAndDelete(id);

    res.json({ 
      message: 'User deleted successfully',
      deletedId: id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📊 ดูสถิติทั่วไป
exports.getDashboardStatistics = async (req, res) => {
  try {
    // ✓ นับข้อมูล
    const totalUsers = await User.countDocuments();
    const totalRooms = await MeetingRoom.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const approvedBookings = await Booking.countDocuments({ status: 'approved' });
    const rejectedBookings = await Booking.countDocuments({ status: 'rejected' });

    // ✓ ดูการจองเฉพาะวันนี้
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await Booking.countDocuments({
      bookingDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // ✓ ดูการจองเฉพาะสัปดาห์นี้
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const thisWeekBookings = await Booking.countDocuments({
      bookingDate: {
        $gte: weekAgo,
        $lt: tomorrow
      }
    });

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
        rejected: rejectedBookings,
        today: todayBookings,
        thisWeek: thisWeekBookings
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📋 ดูการจองทั้งหมด (Admin View)
exports.getAllBookingsAdmin = async (req, res) => {
  try {
    // ✓ สามารถ filter ได้
    let query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.userId) {
      query.userId = req.query.userId;
    }

    if (req.query.roomId) {
      query.roomId = req.query.roomId;
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'fullName email department role')
      .populate('roomId', 'roomNumber roomName capacity')
      .sort({ bookingDate: -1 });

    res.json({
      total: bookings.length,
      bookings
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✏️ อนุมัติ/ปฏิเสธการจอง (Admin only)
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        status,
        updatedAt: Date.now()
      },
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
};

// 🗑️ ลบการจอง (Admin only)
exports.deleteBookingAdmin = async (req, res) => {
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
};

// 📊 ดูรายงานการใช้ห้อง
exports.getRoomUsageReport = async (req, res) => {
  try {
    const rooms = await MeetingRoom.find();

    const report = await Promise.all(
      rooms.map(async (room) => {
        const bookings = await Booking.countDocuments({ roomId: room._id });
        const approvedBookings = await Booking.countDocuments({ 
          roomId: room._id, 
          status: 'approved' 
        });

        return {
          roomId: room._id,
          roomNumber: room.roomNumber,
          roomName: room.roomName,
          totalBookings: bookings,
          approvedBookings,
          pendingBookings: bookings - approvedBookings
        };
      })
    );

    res.json({
      total: report.length,
      report
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📊 ดูรายงานการใช้งานตามสังกัด
exports.getDepartmentUsageReport = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('userId', 'department');

    // ✓ จัดกลุ่มตามสังกัด
    const departmentReport = {};

    bookings.forEach(booking => {
      const dept = booking.department;
      if (!departmentReport[dept]) {
        departmentReport[dept] = {
          department: dept,
          totalBookings: 0,
          approvedBookings: 0,
          pendingBookings: 0
        };
      }

      departmentReport[dept].totalBookings++;
      if (booking.status === 'approved') {
        departmentReport[dept].approvedBookings++;
      } else if (booking.status === 'pending') {
        departmentReport[dept].pendingBookings++;
      }
    });

    const report = Object.values(departmentReport);

    res.json({
      total: report.length,
      report
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};