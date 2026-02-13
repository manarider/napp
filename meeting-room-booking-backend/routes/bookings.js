// routes/bookings.js
const express = require('express');
const Booking = require('../models/Booking');
const { authMiddleware } = require('../middleware/auth');
const { createBookingValidator } = require('../middleware/validators');

const router = express.Router();

// ➕ สร้างการจอง
router.post('/', authMiddleware, createBookingValidator, async (req, res) => {
  try {
    const { roomId, fullName, department, bookingDate, startTime, endTime, purpose, bookingImage } = req.body;

    // ✓ Validator ตรวจสอบแล้ว
    // ✓ แปลงเวลาเป็นนาที
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMin;
    const endTimeInMinutes = endHour * 60 + endMin;

    // ✓ ตรวจสอบ startTime ต้องน้อยกว่า endTime
    if (startTimeInMinutes >= endTimeInMinutes) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    // ✓ สร้างวันที่เริ่มต้นและสิ้นสุดของวันที่จอง
    const bookingDateObj = new Date(bookingDate);
    const dayStart = new Date(bookingDateObj.getFullYear(), bookingDateObj.getMonth(), bookingDateObj.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // ✓ ค้นหาการจองในห้องเดียวกัน วันเดียวกัน
    const existingBookings = await Booking.find({
      roomId,
      bookingDate: {
        $gte: dayStart,
        $lt: dayEnd
      }
    });

    // ✓ ตรวจสอบการซ้อนเวลา
    const hasConflict = existingBookings.some(booking => {
      const [existingStartHour, existingStartMin] = booking.startTime.split(':').map(Number);
      const [existingEndHour, existingEndMin] = booking.endTime.split(':').map(Number);
      
      const existingStartTime = existingStartHour * 60 + existingStartMin;
      const existingEndTime = existingEndHour * 60 + existingEndMin;

      // ตรวจสอบการซ้อน
      return startTimeInMinutes < existingEndTime && endTimeInMinutes > existingStartTime;
    });

    if (hasConflict) {
      return res.status(400).json({ error: 'Time slot already booked in this room. Please choose another time or room.' });
    }

    // ⭐ สร้าง booking object
    const booking = new Booking({
      userId: req.userId,
      roomId,
      fullName,
      department,
      bookingDate: bookingDateObj,
      startTime,
      endTime,
      purpose
    });

    // ⭐ เพิ่มรูปภาพถ้ามี
    if (bookingImage && bookingImage.data) {
      booking.bookingImage = {
        data: bookingImage.data,
        contentType: bookingImage.contentType || 'image/jpeg',
        fileName: bookingImage.fileName || 'booking-image.jpg'
      };
    }

    await booking.save();
    await booking.populate('roomId');

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📖 ดูการจองของตัวเอง
router.get('/my-bookings', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.userId })
      .populate('roomId', 'roomNumber roomName capacity')
      .sort({ bookingDate: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📖 ดูการจองเดี่ยว (สำหรับแก้ไข)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('roomId', 'roomNumber roomName capacity')
      .populate('userId', 'fullName email');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📖 ดูทั้งหมด (สามารถ filter ตามห้อง วันที่ สถานะ)
router.get('/', async (req, res) => {
  try {
    let query = {};

    // ✓ Filter ตามห้อง
    if (req.query.roomId) {
      query.roomId = req.query.roomId;
    }

    // ✓ Filter ตามวันที่ (เฉพาะวันนั้นเท่านั้น)
    if (req.query.date) {
      const selectedDate = new Date(req.query.date);
      
      // สร้างเวลาเริ่มต้นและสิ้นสุดของวันที่กำหนด
      const dayStart = new Date(
        selectedDate.getFullYear(), 
        selectedDate.getMonth(), 
        selectedDate.getDate(), 
        0, 0, 0, 0
      );
      
      const dayEnd = new Date(
        selectedDate.getFullYear(), 
        selectedDate.getMonth(), 
        selectedDate.getDate() + 1, 
        0, 0, 0, 0
      );

      query.bookingDate = {
        $gte: dayStart,
        $lt: dayEnd
      };
    }

    // ✓ Filter ตามสถานะ
    if (req.query.status) {
      query.status = req.query.status;
    }

    const bookings = await Booking.find(query)
      .populate('userId', 'fullName email department')
      .populate('roomId', 'roomNumber roomName capacity')
      .sort({ bookingDate: -1 });

    res.json({
      total: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✏️ แก้ไข
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { roomId, bookingDate, startTime, endTime, fullName, department, purpose, bookingImage, removeImage } = req.body;

    // ✓ ใช้ค่าเดิมถ้าไม่มีการเปลี่ยนแปลง
    const newRoomId = roomId || booking.roomId;
    const newBookingDate = bookingDate ? new Date(bookingDate) : booking.bookingDate;
    const newStartTime = startTime || booking.startTime;
    const newEndTime = endTime || booking.endTime;

    // ✓ แปลงเวลาเป็นนาที
    const [newStartHour, newStartMin] = newStartTime.split(':').map(Number);
    const [newEndHour, newEndMin] = newEndTime.split(':').map(Number);
    const newStartTimeInMinutes = newStartHour * 60 + newStartMin;
    const newEndTimeInMinutes = newEndHour * 60 + newEndMin;

    // ✓ ตรวจสอบ startTime ต้องน้อยกว่า endTime
    if (newStartTimeInMinutes >= newEndTimeInMinutes) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    // ✓ ถ้าเปลี่ยนห้อง วันที่ หรือเวลา ต้องตรวจสอบการซ้อนใหม่
    const needsConflictCheck = 
      newRoomId.toString() !== booking.roomId.toString() || 
      newBookingDate.getTime() !== booking.bookingDate.getTime() ||
      newStartTime !== booking.startTime || 
      newEndTime !== booking.endTime;

    if (needsConflictCheck) {
      const dayStart = new Date(newBookingDate.getFullYear(), newBookingDate.getMonth(), newBookingDate.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const existingBookings = await Booking.find({
        _id: { $ne: req.params.id }, // ยกเว้น booking ตัวเอง
        roomId: newRoomId,
        bookingDate: {
          $gte: dayStart,
          $lt: dayEnd
        }
      });

      const hasConflict = existingBookings.some(existingBooking => {
        const [existingStartHour, existingStartMin] = existingBooking.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = existingBooking.endTime.split(':').map(Number);
        
        const existingStartTime = existingStartHour * 60 + existingStartMin;
        const existingEndTime = existingEndHour * 60 + existingEndMin;

        return newStartTimeInMinutes < existingEndTime && newEndTimeInMinutes > existingStartTime;
      });

      if (hasConflict) {
        return res.status(400).json({ error: 'Time slot already booked in this room. Please choose another time or room.' });
      }
    }

    // ✓ อัปเดตข้อมูลทั่วไป
    booking.roomId = newRoomId;
    booking.bookingDate = newBookingDate;
    booking.startTime = newStartTime;
    booking.endTime = newEndTime;
    booking.fullName = fullName || booking.fullName;
    booking.department = department || booking.department;
    booking.purpose = purpose || booking.purpose;
    booking.updatedAt = Date.now();
    
    // ⭐ จัดการรูปภาพ
    if (removeImage === true) {
      // ลบรูปภาพ
      booking.bookingImage = undefined;
    } else if (bookingImage && bookingImage.data) {
      // อัปเดตรูปภาพใหม่
      booking.bookingImage = {
        data: bookingImage.data,
        contentType: bookingImage.contentType || 'image/jpeg',
        fileName: bookingImage.fileName || 'booking-image.jpg'
      };
    }
    // ถ้าไม่มี removeImage และไม่มี bookingImage ใหม่ = เก็บรูปเดิม

    await booking.save();
    await booking.populate('roomId');
    
    res.json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ ลบ
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;