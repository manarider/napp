const MeetingRoom = require('../models/MeetingRoom');

// 📋 ดูห้องประชุมทั้งหมด
exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await MeetingRoom.find().sort({ roomNumber: 1 });

    res.json({
      total: rooms.length,
      rooms
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔍 ดูห้องประชุมแบบเดี่ยว
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await MeetingRoom.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    res.json(room);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ➕ เพิ่มห้องประชุมใหม่ (Admin only)
exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, roomName, capacity, facilities } = req.body;

    // ✓ ตรวจสอบข้อมูล
    if (!roomNumber || !roomName || !capacity) {
      return res.status(400).json({ error: 'roomNumber, roomName, and capacity are required' });
    }

    // ✓ ตรวจสอบว่า roomNumber ซ้ำไหม
    const existingRoom = await MeetingRoom.findOne({ roomNumber });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room number already exists' });
    }

    // ✓ สร้างห้องใหม่
    const room = new MeetingRoom({
      roomNumber,
      roomName,
      capacity,
      facilities: facilities || [] // ถ้าไม่มี ให้เป็น array ว่าง
    });

    await room.save();

    res.status(201).json({
      message: 'Meeting room created successfully',
      room
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✏️ แก้ไขห้องประชุม (Admin only)
exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomNumber, roomName, capacity, facilities } = req.body;

    // ✓ หาห้องว่ามีอยู่ไหม
    const room = await MeetingRoom.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    // ✓ ถ้าเปลี่ยน roomNumber ต้องตรวจสอบว่าไม่ซ้ำ
    if (roomNumber && roomNumber !== room.roomNumber) {
      const existingRoom = await MeetingRoom.findOne({ roomNumber });
      if (existingRoom) {
        return res.status(400).json({ error: 'Room number already exists' });
      }
    }

    // ✓ แก้ไข
    if (roomNumber) room.roomNumber = roomNumber;
    if (roomName) room.roomName = roomName;
    if (capacity) room.capacity = capacity;
    if (facilities) room.facilities = facilities;

    await room.save();

    res.json({
      message: 'Meeting room updated successfully',
      room
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🗑️ ลบห้องประชุม (Admin only)
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // ✓ หาห้องว่ามีอยู่ไหม
    const room = await MeetingRoom.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    // ✓ ตรวจสอบการจองที่ยังมีผล (pending, approved หรือในอนาคต)
    const Booking = require('../models/Booking');
    const now = new Date();
    
    // หาการจองที่ยังไม่หมดอายุ
    const activeBookings = await Booking.find({
      roomId: id,
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

    await MeetingRoom.findByIdAndDelete(id);

    res.json({ 
      message: 'Meeting room deleted successfully',
      deletedId: id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📅 ดูเวลาว่างของห้อง
exports.getAvailableSlots = async (req, res) => {
  try {
    const { roomId, date } = req.query;

    if (!roomId || !date) {
      return res.status(400).json({ error: 'roomId and date are required' });
    }

    const Booking = require('../models/Booking');

    // ✓ หา booking ในวันนั้น
    const selectedDate = new Date(date);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const bookings = await Booking.find({
      roomId,
      bookingDate: {
        $gte: selectedDate,
        $lt: nextDay
      }
    }).select('startTime endTime');

    // ✓ ตั้งเวลาทำงาน
    const workingHours = {
      start: 8,  // 8:00
      end: 18    // 18:00
    };

    // ✓ สร้างช่วงเวลาว่าง (ทุก 30 นาที)
    const allSlots = [];
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      allSlots.push(`${hour}:00`);
      allSlots.push(`${hour}:30`);
    }

    // ✓ ลบช่วงเวลาที่มีการจองแล้ว
    const bookedSlots = new Set();
    bookings.forEach(booking => {
      const [startHour, startMin] = booking.startTime.split(':').map(Number);
      const [endHour, endMin] = booking.endTime.split(':').map(Number);

      for (let hour = startHour; hour <= endHour; hour++) {
        for (let min = 0; min < 60; min += 30) {
          if (hour === startHour && min < startMin) continue;
          if (hour === endHour && min >= endMin) continue;

          bookedSlots.add(`${hour}:${min.toString().padStart(2, '0')}`);
        }
      }
    });

    const availableSlots = allSlots.filter(slot => !bookedSlots.has(slot));

    res.json({
      date,
      roomId,
      allSlots,
      bookedSlots: Array.from(bookedSlots),
      availableSlots
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
