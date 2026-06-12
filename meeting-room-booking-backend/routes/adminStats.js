const express = require('express');
const Booking = require('../models/Booking');
const MeetingRoom = require('../models/MeetingRoom');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// 📊 กราฟแนวโน้มการจอง (7 วันล่าสุด)
router.get('/bookings-trend', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // จัดกลุ่มตามวัน
    const trendData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trendData[dateStr] = { date: dateStr, total: 0, approved: 0, pending: 0, rejected: 0 };
    }

    bookings.forEach(booking => {
      const dateStr = booking.createdAt.toISOString().split('T')[0];
      if (trendData[dateStr]) {
        trendData[dateStr].total++;
        if (booking.status === 'approved') trendData[dateStr].approved++;
        if (booking.status === 'pending') trendData[dateStr].pending++;
        if (booking.status === 'rejected') trendData[dateStr].rejected++;
      }
    });

    const result = Object.values(trendData).reverse();

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🏨 ห้องที่ถูกจองมากที่สุด
// [PERF-03] เปลี่ยนจาก N+1 countDocuments เป็น aggregation pipeline ครั้งเดียว
 router.get('/popular-rooms', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // 1 aggregation query แทน N rooms × 2 countDocuments
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$roomId',
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
        }
      }
    ]);

    // สร้าง map roomId → stats
    const statsMap = {};
    bookingStats.forEach(s => { statsMap[s._id?.toString()] = s; });

    const rooms = await MeetingRoom.find();
    const roomStats = rooms.map(room => {
      const stat = statsMap[room._id.toString()] || { total: 0, approved: 0 };
      return {
        name: `${room.roomNumber} - ${room.roomName}`,
        total: stat.total,
        approved: stat.approved,
        capacity: room.capacity
      };
    });

    roomStats.sort((a, b) => b.total - a.total);
    res.json(roomStats.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🏢 Department ที่จองมากที่สุด
// [PERF-03] เปลี่ยนจาก Booking.find() + JS groupBy เป็น aggregation
router.get('/department-usage', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deptStats = await Booking.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pending:  { $sum: { $cond: [{ $eq: ['$status', 'pending']  }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const result = deptStats.map(d => ({
      name:     d._id || 'ไม่ระบุ',
      total:    d.total,
      approved: d.approved,
      pending:  d.pending
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📈 สถิติรายเดือน
// [PERF-03] เปลี่ยนจาก 6×2 countDocuments loop เป็น aggregation ครั้งเดียว
router.get('/monthly-stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const months = 6;
    const now = new Date();

    // คำนวณวันเริ่มต้นของเดือนแรกที่ต้องการ
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    // 1 aggregation แทน 12 countDocuments queries
    const aggResult = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total:    { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
        }
      }
    ]);

    // สร้าง map: 'YYYY-M' → stats
    const statsMap = {};
    aggResult.forEach(r => { statsMap[`${r._id.year}-${r._id.month}`] = r; });

    // สร้าง array 6 เดือน (มีค่า 0 ถ้าไม่มีข้อมูล)
    const monthlyData = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const stat = statsMap[key] || { total: 0, approved: 0 };
      monthlyData.push({
        month: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
        total:    stat.total,
        approved: stat.approved
      });
    }

    res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;