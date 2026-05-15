// seedDB.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// นำเข้า Models จากไฟล์ที่คุณมี
const User = require('./User');
const Department = require('./Department');
const MeetingRoom = require('./MeetingRoom');
const Booking = require('./Booking');

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI ไม่ได้ตั้งค่าใน .env');
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');
};

const seedDatabase = async () => {
  try {
    // 1. เชื่อมต่อฐานข้อมูล
    await connectDB();

    // 2. ล้างข้อมูลเก่าเพื่อป้องกันข้อมูลซ้ำ (Unique Constraint)
    console.log('🗑️  กำลังล้างข้อมูลเก่า...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      MeetingRoom.deleteMany({}),
      Booking.deleteMany({})
    ]);

    // 3. ลงข้อมูลแผนก (Departments)
    console.log('📋 กำลังลงข้อมูลแผนก...');
    const departmentsData = [
      { name: 'สำนักปลัดเทศบาล', code: 'MAYOR' },
      { name: 'สำนักช่าง', code: 'ENGINEERING' },
      { name: 'สำนักคลัง', code: 'FINANCE' },
      { name: 'สำนักสาธารณสุขฯ', code: 'HEALTH' },
      { name: 'สำนักการศึกษา', code: 'EDUCATION' },
      { name: 'สำนักการประปา', code: 'WATER' },
      { name: 'กองยุทธศาสตร์ฯ', code: 'STRATEGY' },
      { name: 'กองสวัสดิการสังคม', code: 'SOCIAL' },
      { name: 'กองสารสนเทศภาษีฯ', code: 'IT_TAX' },
      { name: 'กองการเจ้าหน้าที่', code: 'HR' },
      { name: 'หน่วยตรวจสอบภายใน', code: 'AUDIT' }
    ];
    const depts = await Department.insertMany(departmentsData);
    console.log(`✅ เพิ่มแผนกสำเร็จ: ${depts.length} รายการ`);

    // 4. ลงข้อมูลผู้ใช้งาน (Users)
    // ส่ง password เป็น string ปกติ เพราะ User.js จะ Hash ให้เองอัตโนมัติ
    console.log('👥 กำลังลงข้อมูลผู้ใช้งาน...');
    const users = await User.create([
      { fullName: 'ผู้บริหารระบบ', email: 'admin@meeting.com', password: 'admin123', department: 'สำนักปลัดเทศบาล', role: 'admin' },
      { fullName: 'สมชาย ใจดี', email: 'somchai@mail.com', password: '123456', department: 'สำนักปลัดเทศบาล', role: 'user' },
      { fullName: 'สมหวัง งามวงศ์', email: 'somwang@mail.com', password: '123456', department: 'สำนักช่าง', role: 'user' },
      { fullName: 'จิตรา สวยงาม', email: 'chitra@mail.com', password: '123456', department: 'สำนักคลัง', role: 'user' },
      { fullName: 'สันติ ศรีสวัสดิ์', email: 'santi@mail.com', password: '123456', department: 'สำนักสาธารณสุขฯ', role: 'user' }
    ]);
    console.log(`✅ เพิ่มผู้ใช้สำเร็จ: ${users.length} รายการ`);

    // 5. ลงข้อมูลห้องประชุม (Meeting Rooms)
    console.log('🏨 กำลังลงข้อมูลห้องประชุม...');
    const rooms = await MeetingRoom.insertMany([
      { roomNumber: '101', roomName: 'ห้องประชุม A', capacity: 10, facilities: ['Projector', 'Whiteboard'] },
      { roomNumber: '102', roomName: 'ห้องประชุม B', capacity: 15, facilities: ['Projector', 'Screen', 'Wifi'] },
      { roomNumber: '103', roomName: 'ห้องประชุม C', capacity: 20, facilities: ['Sound System', 'Air Con'] }
    ]);
    console.log(`✅ เพิ่มห้องประชุมสำเร็จ: ${rooms.length} รายการ`);

    // 6. ลงข้อมูลการจอง (Bookings)
    console.log('🎫 กำลังลงข้อมูลการจอง...');
    const today = new Date();
    await Booking.create([
      {
        userId: users[0]._id, 
        roomId: rooms[0]._id, 
        fullName: users[0].fullName,
        department: users[0].department,
        bookingDate: today,
        startTime: '09:00',
        endTime: '10:30',
        purpose: 'ประชุมวางแผนประจำวัน',
        status: 'approved'
      },
      {
        userId: users[1]._id,
        roomId: rooms[1]._id,
        fullName: users[1].fullName,
        department: users[1].department,
        bookingDate: today,
        startTime: '13:00',
        endTime: '15:00',
        purpose: 'ประชุมแก้ไขงานระบบ',
        status: 'pending'
      }
    ]);
    console.log('✅ เพิ่มข้อมูลการจองตัวอย่างสำเร็จ');

    console.log('\n✨ === สรุปการติดตั้งฐานข้อมูล ===');
    console.log(`📊 แผนก: ${depts.length} | ผู้ใช้: ${users.length} | ห้อง: ${rooms.length}`);
    console.log('🚀 ติดตั้งข้อมูล NSMAPP เสร็จสมบูรณ์!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูล');
    process.exit(0);
  }
};

seedDatabase();