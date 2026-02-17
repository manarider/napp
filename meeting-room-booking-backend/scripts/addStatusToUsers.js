// scripts/addStatusToUsers.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const addStatusToUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // อัพเดท users ทั้งหมดที่ไม่มี status field ให้มี status = 'active'
    const result = await User.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with status field`);
    
    // แสดงจำนวน users ทั้งหมด
    const allUsers = await User.find().select('fullName email status');
    console.log('\n📋 All Users:');
    allUsers.forEach(user => {
      console.log(`  - ${user.fullName} (${user.email}): ${user.status || 'NO STATUS'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

addStatusToUsers();
