/**
 * populateBookingUser.js
 *
 * Mongoose 8 จะ throw CastError เมื่อพยายาม populate userId ที่เป็น UMS string
 * เช่น "ums_12345" ซึ่ง cast ไปเป็น ObjectId ไม่ได้
 *
 * utility นี้:
 *  - รับ array ของ lean booking objects
 *  - สำหรับ userId ที่เป็น valid ObjectId → query User collection
 *  - สำหรับ UMS user ("ums_xxx") → ใช้ fullName/department ที่เก็บไว้ใน booking
 *  - return bookings ที่มี userId เป็น object { _id, fullName, email, department }
 */

const mongoose = require('mongoose');
const User = require('../models/User');

async function enrichBookingsWithUser(bookings) {
  if (!bookings || bookings.length === 0) return bookings;

  // แยก userId ที่เป็น valid ObjectId (local users)
  const validIds = [
    ...new Set(
      bookings
        .map((b) => (b.userId ? b.userId.toString() : null))
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  // ดึง User records สำหรับ local users เท่านั้น
  let userMap = {};
  if (validIds.length > 0) {
    const users = await User.find({ _id: { $in: validIds } })
      .select('fullName email department')
      .lean();
    userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
  }

  // map กลับ – ถ้าหา user ไม่เจอ (UMS หรือ user ถูกลบ) ใช้ข้อมูลใน booking แทน
  return bookings.map((b) => {
    const id = b.userId ? b.userId.toString() : null;
    const populatedUser = (id && userMap[id]) || {
      _id: b.userId,
      fullName: b.fullName,
      email: '',
      department: b.department,
    };
    return { ...b, userId: populatedUser };
  });
}

module.exports = { enrichBookingsWithUser };
