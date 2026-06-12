// routes/display.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const DisplayConfig = require('../models/DisplayConfig');
const DisplayMedia = require('../models/DisplayMedia');
const MeetingRoom = require('../models/MeetingRoom');
const Booking = require('../models/Booking');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// ที่เก็บไฟล์ media
const UPLOAD_DIR = path.join(__dirname, '../uploads/display');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================
// ฟังก์ชันช่วย: หากลุ่มวันที่ติดต่อกันที่รวม targetDate
// ============================================
function findConsecutiveGroup(sortedDates, targetDate) {
  if (!sortedDates.length) return [];

  const targetTime = new Date(targetDate).setHours(0, 0, 0, 0);
  const normalized = sortedDates.map(d => ({
    original: d,
    norm: new Date(d).setHours(0, 0, 0, 0)
  }));

  // หาตำแหน่งของ targetDate
  const targetIdx = normalized.findIndex(d => d.norm === targetTime);
  if (targetIdx === -1) return [targetDate];

  // ขยายไปหน้าและหลัง
  let start = targetIdx;
  let end = targetIdx;

  while (start > 0 && normalized[start].norm - normalized[start - 1].norm === 86400000) {
    start--;
  }
  while (end < normalized.length - 1 && normalized[end + 1].norm - normalized[end].norm === 86400000) {
    end++;
  }

  return normalized.slice(start, end + 1).map(d => d.original);
}

// ============================================
// 📡 PUBLIC: ดึงข้อมูลแสดงผลสำหรับห้อง
// GET /api/display/room/:roomId
// ============================================
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await MeetingRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const config = await DisplayConfig.findOne({ roomId });

    // หาการจองปัจจุบันหรือถัดไป
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1) หาการจองที่กำลังใช้งานอยู่ตอนนี้
    let booking = await Booking.findOne({
      roomId,
      bookingDate: { $gte: todayStart, $lt: todayEnd },
      status: 'approved',
      startTime: { $lte: currentTime },
      endTime: { $gt: currentTime }
    }).sort({ startTime: 1 });

    // 2) หาการจองถัดไปของวันนี้ (ยังไม่ถึงเวลา)
    if (!booking) {
      booking = await Booking.findOne({
        roomId,
        bookingDate: { $gte: todayStart, $lt: todayEnd },
        status: 'approved',
        startTime: { $gt: currentTime }
      }).sort({ startTime: 1 });
    }

    // *** ไม่ดึงการจองข้ามวัน — แสดงเฉพาะวันนี้เท่านั้น ***

    let bookingData = null;

    if (booking) {
      // ตรวจสอบว่าเป็นการจองหลายวันหรือไม่
      const windowStart = new Date(booking.bookingDate);
      windowStart.setDate(windowStart.getDate() - 14);
      const windowEnd = new Date(booking.bookingDate);
      windowEnd.setDate(windowEnd.getDate() + 14);

      const relatedBookings = await Booking.find({
        roomId,
        userId: booking.userId,
        purpose: booking.purpose,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: 'approved',
        bookingDate: { $gte: windowStart, $lte: windowEnd }
      }).sort({ bookingDate: 1 });

      let isMultiDay = false;
      let startDate = booking.bookingDate;
      let endDate = booking.bookingDate;

      if (relatedBookings.length > 1) {
        const group = findConsecutiveGroup(
          relatedBookings.map(b => b.bookingDate),
          booking.bookingDate
        );
        if (group.length > 1) {
          isMultiDay = true;
          startDate = group[0];
          endDate = group[group.length - 1];
        }
      }

      bookingData = {
        purpose: booking.purpose,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        isMultiDay,
        startDate,
        endDate,
        fullName: booking.fullName,
        department: booking.department
      };
    }

    res.json({
      room: {
        id: room._id,
        roomName: room.roomName,
        roomNumber: room.roomNumber
      },
      config: config || null,
      booking: bookingData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// � PUBLIC: ตารางการประชุมทุกห้องวันนี้
// GET /api/display/today-schedule
// ============================================
router.get('/today-schedule', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const rooms = await MeetingRoom.find().sort({ roomNumber: 1 });

    const bookings = await Booking.find({
      bookingDate: { $gte: todayStart, $lt: todayEnd },
      status: 'approved'
    }).sort({ startTime: 1 });

    // จัดกลุ่มการจองตามห้อง
    const bookingsByRoom = {};
    bookings.forEach(b => {
      const key = b.roomId.toString();
      if (!bookingsByRoom[key]) bookingsByRoom[key] = [];
      bookingsByRoom[key].push(b);
    });

    const result = rooms.map(room => {
      const roomBookings = (bookingsByRoom[room._id.toString()] || []).map(b => {
        let status = 'upcoming';
        if (b.endTime <= currentTime) status = 'past';
        else if (b.startTime <= currentTime) status = 'current';
        return {
          id: b._id,
          purpose: b.purpose,
          startTime: b.startTime,
          endTime: b.endTime,
          fullName: b.fullName,
          department: b.department,
          status
        };
      });
      return {
        roomId: room._id,
        roomNumber: room.roomNumber,
        roomName: room.roomName,
        bookings: roomBookings
      };
    });

    res.json({
      date: todayStart,
      currentTime,
      rooms: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// �🔒 ADMIN: ดึง config ของห้อง
// GET /api/display/config/:roomId
// ============================================
router.get('/config/:roomId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await MeetingRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const config = await DisplayConfig.findOne({ roomId });
    res.json({ config: config || null, room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🔒 ADMIN: บันทึก/อัพเดต config ของห้อง
// PUT /api/display/config/:roomId
// ============================================
router.put('/config/:roomId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { width, height, backgroundColor, backgroundImage, backgroundVideo, backgroundMediaType, elements } = req.body;

    const room = await MeetingRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const updateData = {
      updatedAt: new Date()
    };

    if (width !== undefined) updateData.width = width;
    if (height !== undefined) updateData.height = height;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage;
    if (backgroundVideo !== undefined) updateData.backgroundVideo = backgroundVideo;
    if (backgroundMediaType !== undefined) updateData.backgroundMediaType = backgroundMediaType;
    if (elements !== undefined) updateData.elements = elements;

    const config = await DisplayConfig.findOneAndUpdate(
      { roomId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: 'Display config saved', config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🔒 ADMIN: รายการห้องทั้งหมดพร้อม config status
// GET /api/display/rooms
// ============================================
router.get('/rooms', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rooms = await MeetingRoom.find().sort({ roomNumber: 1 });
    const configs = await DisplayConfig.find({}, 'roomId updatedAt');

    const configMap = {};
    configs.forEach(c => { configMap[c.roomId.toString()] = c; });

    const result = rooms.map(room => ({
      id: room._id,
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      hasConfig: !!configMap[room._id.toString()],
      configUpdatedAt: configMap[room._id.toString()]?.updatedAt || null
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🔒 ADMIN: อัพโหลด media สำหรับห้อง
// POST /api/display/media/:roomId
// ============================================
router.post('/media/:roomId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, mimeType, data } = req.body;

    const room = await MeetingRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // decode base64 data URL
    const base64Data = data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'ไฟล์ใหญ่เกิน 50MB' });
    }

    // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
    const safeMime = (mimeType || 'image/jpeg').split('/')[1]
      .replace('jpeg', 'jpg').replace('quicktime', 'mov').replace('+xml', '');
    const filename = `${roomId}_${Date.now()}.${safeMime}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // [PERF-02] เปลี่ยนเป็น async I/O ป้องกัน event loop blocking
    await fs.promises.writeFile(filepath, buffer);

    const mediaType = (mimeType || '').startsWith('video/') ? 'video' : 'image';

    const media = new DisplayMedia({
      roomId,
      name: name || filename,
      mediaType,
      mimeType,
      filename,
      size: buffer.length
    });
    await media.save();

    const url = `/napp/api/display/uploads/${filename}`;
    res.json({ id: media._id, filename, url, mediaType, name: media.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🔒 ADMIN: รายการ media ของห้อง
// GET /api/display/media/:roomId
// ============================================
router.get('/media/:roomId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const media = await DisplayMedia.find({ roomId: req.params.roomId }).sort({ createdAt: -1 });
    res.json(media.map(m => ({
      id: m._id,
      name: m.name,
      mediaType: m.mediaType,
      mimeType: m.mimeType,
      url: `/napp/api/display/uploads/${m.filename}`,
      size: m.size,
      createdAt: m.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// 🔒 ADMIN: ลบ media
// DELETE /api/display/media/:mediaId
// ============================================
router.delete('/media/:mediaId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const media = await DisplayMedia.findById(req.params.mediaId);
    if (!media) return res.status(404).json({ error: 'Media not found' });

    const filepath = path.join(UPLOAD_DIR, media.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    await media.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

