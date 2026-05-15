// models/DisplayMedia.js — ข้อมูล media library สำหรับพื้นหลังหน้าจอสาธารณะ
const mongoose = require('mongoose');

const displayMediaSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeetingRoom',
    required: true,
    index: true
  },
  name: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], required: true },
  mimeType: { type: String, required: true },
  filename: { type: String, required: true },
  size: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DisplayMedia', displayMediaSchema);
