const Booking = require('../models/Booking');
const MeetingRoom = require('../models/MeetingRoom');
const mongoose = require('mongoose');

// ➕ สร้างการจอง (รองรับหลายวัน - ใช้ transaction)
exports.createBooking = async (req, res) => {
  try {
    const { roomId, fullName, department, startDate, endDate, bookingDate, startTime, endTime, purpose, bookingImage } = req.body;

    // ✓ รองรับทั้ง startDate/endDate (จองหลายวัน) และ bookingDate (แก้ไข)
    const isMultiDay = startDate && endDate;
    const isSingleDay = bookingDate;

    if (!roomId || !fullName || !department || (!isMultiDay && !isSingleDay) || !startTime || !endTime || !purpose) {
      return res.status(400).json({ 
        error: 'All fields are required',
        missing: {
          roomId: !roomId,
          fullName: !fullName,
          department: !department,
          dates: !isMultiDay && !isSingleDay,
          startTime: !startTime,
          endTime: !endTime,
          purpose: !purpose
        }
      });
    }

    // ✓ ตรวจสอบว่า room มีอยู่ไหม
    const room = await MeetingRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Meeting room not found' });
    }

    // ✓ แปลงเวลาเป็น format ที่สามารถเปรียบเทียบได้
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMin;
    const endTimeInMinutes = endHour * 60 + endMin;

    // ✓ ตรวจสอบว่า startTime ต้องน้อยกว่า endTime
    if (startTimeInMinutes >= endTimeInMinutes) {
      return res.status(400).json({ 
        error: 'Start time must be before end time' 
      });
    }

    // ✓ สร้าง array ของวันที่ที่ต้องการจอง
    let bookingDates = [];
    
    if (isMultiDay) {
      // จองหลายวัน
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        return res.status(400).json({ error: 'End date must be after or equal to start date' });
      }
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        bookingDates.push(new Date(d));
      }
    } else {
      // จองวันเดียว (กรณีแก้ไข)
      bookingDates.push(new Date(bookingDate));
    }

    // ✓ ตรวจสอบ conflict สำหรับทุกวัน
    const conflicts = [];
    
    for (const date of bookingDates) {
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const existingBookings = await Booking.find({
        roomId: roomId,
        bookingDate: {
          $gte: dayStart,
          $lt: dayEnd
        }
      });

      const hasConflict = existingBookings.some(booking => {
        const [existingStartHour, existingStartMin] = booking.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = booking.endTime.split(':').map(Number);
        
        const existingStartTime = existingStartHour * 60 + existingStartMin;
        const existingEndTime = existingEndHour * 60 + existingEndMin;

        return startTimeInMinutes < existingEndTime && endTimeInMinutes > existingStartTime;
      });

      if (hasConflict) {
        conflicts.push(date.toISOString().split('T')[0]);
      }
    }

    if (conflicts.length > 0) {
      return res.status(400).json({ 
        error: `Time slot already booked on these dates: ${conflicts.join(', ')}. Please choose another time or room.` 
      });
    }

    // ✓ สร้าง booking สำหรับทุกวัน (ใช้ transaction เพื่อความปลอดภัย)
    let createdBookings = [];
    
    // ⚡ ถ้าจองหลายวัน ใช้ transaction
    if (bookingDates.length > 1) {
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        for (const date of bookingDates) {
          const booking = new Booking({
            userId: req.userId,
            roomId,
            fullName,
            department,
            bookingDate: date,
            startTime,
            endTime,
            purpose,
            status: 'pending',
            bookingImage: bookingImage || undefined
          });

          await booking.save({ session });
          await booking.populate('roomId');
          createdBookings.push(booking);
        }

        // ✓ Commit transaction
        await session.commitTransaction();
        session.endSession();
        
      } catch (error) {
        // ❌ Rollback ถ้าเกิด error
        await session.abortTransaction();
        session.endSession();
        throw error;
      }
    } else {
      // จองวันเดียว ไม่ต้องใช้ transaction
      const booking = new Booking({
        userId: req.userId,
        roomId,
        fullName,
        department,
        bookingDate: bookingDates[0],
        startTime,
        endTime,
        purpose,
        status: 'pending',
        bookingImage: bookingImage || undefined
      });

      await booking.save();
      await booking.populate('roomId');
      createdBookings.push(booking);
    }

    res.status(201).json({
      message: `${createdBookings.length} booking(s) created successfully`,
      bookings: createdBookings,
      count: createdBookings.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📖 ดูการจองของตัวเอง
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.userId })
      .populate('roomId', 'roomNumber roomName capacity')
      .sort({ bookingDate: -1 }); // ล่าสุดมาก่อน

    res.json(bookings);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📖 ดูการจองทั้งหมด (คนอื่นสามารถเห็นได้)
exports.getAllBookings = async (req, res) => {
  try {
    // เพิ่ม filter ถ้ามี query parameter
    let query = {};

    if (req.query.roomId) {
      query.roomId = req.query.roomId;
    }

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
};

// ✏️ แก้ไขการจอง
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomId, fullName, department, bookingDate, startTime, endTime, purpose } = req.body;

    // ✓ หา booking ว่ามีอยู่ไหม
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // ✓ ตรวจสอบสิทธิ์ (เจ้าของหรือ admin)
    if (booking.userId.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own bookings' });
    }

    // ✓ ใช้ค่าเดิมถ้าไม่มีการเปลี่ยนแปลง
    const newRoomId = roomId || booking.roomId;
    const newBookingDate = bookingDate ? new Date(bookingDate) : booking.bookingDate;
    const newStartTime = startTime || booking.startTime;
    const newEndTime = endTime || booking.endTime;

    // ✓ ตรวจสอบว่า startTime ต้องน้อยกว่า endTime
    const [newStartHour, newStartMin] = newStartTime.split(':').map(Number);
    const [newEndHour, newEndMin] = newEndTime.split(':').map(Number);
    const newStartTimeInMinutes = newStartHour * 60 + newStartMin;
    const newEndTimeInMinutes = newEndHour * 60 + newEndMin;

    if (newStartTimeInMinutes >= newEndTimeInMinutes) {
      return res.status(400).json({ 
        error: 'Start time must be before end time' 
      });
    }

    // ✓ ถ้าเปลี่ยนห้อง หรือ วันที่ หรือ เวลา ต้องตรวจสอบการซ้อนใหม่
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
        _id: { $ne: id }, // ยกเว้น booking ตัวเอง
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
        return res.status(400).json({ 
          error: 'Time slot already booked in this room. Please choose another time or room.' 
        });
      }
    }

    // ✓ อัปเดตข้อมูล
    booking.roomId = newRoomId;
    booking.fullName = fullName || booking.fullName;
    booking.department = department || booking.department;
    booking.bookingDate = newBookingDate;
    booking.startTime = newStartTime;
    booking.endTime = newEndTime;
    booking.purpose = purpose || booking.purpose;
    booking.updatedAt = Date.now();

    await booking.save();
    await booking.populate('roomId');

    res.json({
      message: 'Booking updated successfully',
      booking
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🗑️ ลบการจอง
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // ✓ หา booking ว่ามีอยู่ไหม
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // ✓ ตรวจสอบสิทธิ์
    if (booking.userId.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own bookings' });
    }

    await Booking.findByIdAndDelete(id);

    res.json({ 
      message: 'Booking deleted successfully',
      deletedId: id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 📊 ดูการจองในแต่ละห้อง
exports.getBookingsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const bookings = await Booking.find({ roomId })
      .populate('userId', 'fullName department')
      .sort({ bookingDate: -1 });

    res.json({
      total: bookings.length,
      bookings
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};