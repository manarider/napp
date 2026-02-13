// routes/rooms.js
const express = require('express');
const MeetingRoom = require('../models/MeetingRoom');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { createRoomValidator, updateRoomValidator, mongoIdValidator } = require('../middleware/validators');

const router = express.Router();

// 📋 ดูห้องทั้งหมด
router.get('/', async (req, res) => {
  try {
    const rooms = await MeetingRoom.find();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔍 ดูห้องแบบเดี่ยว
router.get('/:id', mongoIdValidator, async (req, res) => {
  try {
    const room = await MeetingRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ➕ เพิ่มห้องใหม่ (Admin only)
router.post('/', authMiddleware, adminMiddleware, createRoomValidator, async (req, res) => {
  try {
    const { roomNumber, roomName, capacity, facilities } = req.body;

    // ✓ Validator ตรวจสอบแล้ว
    const existingRoom = await MeetingRoom.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room number already exists' });
    }

    const room = new MeetingRoom({
      roomNumber,
      roomName,
      capacity,
      facilities: facilities || []
    });

    await room.save();

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✏️ แก้ไขห้อง (Admin only)
router.put('/:id', authMiddleware, adminMiddleware, updateRoomValidator, async (req, res) => {
  try {
    const room = await MeetingRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const { roomNumber, roomName, capacity, facilities } = req.body;

    if (roomNumber && roomNumber !== room.roomNumber) {
      const existingRoom = await MeetingRoom.findOne({ roomNumber });
      if (existingRoom) {
        return res.status(400).json({ error: 'Room number already exists' });
      }
    }

    if (roomNumber) room.roomNumber = roomNumber;
    if (roomName) room.roomName = roomName;
    if (capacity) room.capacity = capacity;
    if (facilities) room.facilities = facilities;

    await room.save();

    res.json({
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🗑️ ลบห้อง (Admin only)
router.delete('/:id', authMiddleware, adminMiddleware, mongoIdValidator, async (req, res) => {
  try {
    const room = await MeetingRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // ✓ ตรวจสอบการจองที่ยังมีผล (pending, approved หรือในอนาคต)
    const Booking = require('../models/Booking');
    const now = new Date();
    
    // หาการจองที่ยังไม่หมดอายุ
    const activeBookings = await Booking.find({
      roomId: req.params.id,
      $or: [
        { bookingDate: { $gte: now } }, // วันจองในอนาคต
        { status: { $in: ['pending', 'approved'] } } // หรือสถานะยังค้างอยู่
      ]
    });

    if (activeBookings.length > 0) {
      const pendingCount = activeBookings.filter(b => b.status === 'pending').length;
      const approvedCount = activeBookings.filter(b => b.status === 'approved').length;
      
      let errorMsg = `ไม่สามารถลบห้องได้ เนื่องจากมีการจอง ${activeBookings.length} รายการ`;
      if (pendingCount > 0) errorMsg += ` (รออนุมัติ: ${pendingCount})`;
      if (approvedCount > 0) errorMsg += ` (อนุมัติแล้ว: ${approvedCount})`;
      
      return res.status(400).json({ 
        error: errorMsg,
        bookingCount: activeBookings.length,
        details: { pending: pendingCount, approved: approvedCount }
      });
    }

    await MeetingRoom.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Room deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;