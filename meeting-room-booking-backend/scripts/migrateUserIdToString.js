/**
 * Migration: แปลง Booking.userId จาก ObjectId → String
 * เรียกใช้: node scripts/migrateUserIdToString.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
  console.log('🔄 กำลังเชื่อมต่อ MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ เชื่อมต่อสำเร็จ\n');

  const db = mongoose.connection.db;
  const collection = db.collection('bookings');

  const total = await collection.countDocuments();
  console.log(`📊 พบ booking ทั้งหมด: ${total} รายการ`);

  // ดึงเฉพาะ booking ที่ userId ยังเป็น ObjectId (ไม่ใช่ string)
  const docs = await collection.find({ userId: { $type: 'objectId' } }).toArray();
  console.log(`🔍 userId ที่ยังเป็น ObjectId: ${docs.length} รายการ`);

  if (docs.length === 0) {
    console.log('✅ ไม่มีข้อมูลที่ต้อง migrate แล้ว');
    await mongoose.disconnect();
    return;
  }

  let success = 0;
  let failed = 0;

  for (const doc of docs) {
    try {
      const stringId = doc.userId.toString();
      await collection.updateOne(
        { _id: doc._id },
        { $set: { userId: stringId } }
      );
      success++;
    } catch (err) {
      console.error(`❌ ล้มเหลว _id=${doc._id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n✅ migrate สำเร็จ: ${success} รายการ`);
  if (failed > 0) console.log(`❌ ล้มเหลว: ${failed} รายการ`);

  // ตรวจสอบผล
  const remaining = await collection.countDocuments({ userId: { $type: 'objectId' } });
  console.log(`🔍 ObjectId ที่เหลือหลัง migrate: ${remaining} รายการ`);

  await mongoose.disconnect();
  console.log('\n✅ เสร็จสิ้น');
}

migrate().catch(err => {
  console.error('❌ Migration ล้มเหลว:', err);
  process.exit(1);
});
