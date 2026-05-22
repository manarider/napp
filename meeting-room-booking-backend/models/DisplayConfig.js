// models/DisplayConfig.js
const mongoose = require('mongoose');

const elementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['purpose', 'date', 'time'],
    required: true
  },
  x: { type: Number, default: 100 },   // px from left
  y: { type: Number, default: 100 },   // px from top
  fontSize: { type: Number, default: 64 },
  fontFamily: { type: String, default: 'Sarabun' },
  fontWeight: { type: String, default: 'bold' },
  fontStyle: { type: String, default: 'normal' },
  textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  color: { type: String, default: '#ffffff' },
  borderColor: { type: String, default: 'transparent' },
  borderWidth: { type: Number, default: 0 },
  borderRadius: { type: Number, default: 0 },
  shadowColor: { type: String, default: 'rgba(0,0,0,0.5)' },
  shadowBlur: { type: Number, default: 0 },
  shadowX: { type: Number, default: 0 },
  shadowY: { type: Number, default: 0 },
  padding: { type: String, default: '8px 16px' },
  backgroundColor: { type: String, default: 'transparent' },
  visible: { type: Boolean, default: true },
  customText: { type: String, default: '' }  // ข้อความที่กำหนดเอง (override อัตโนมัติ)
}, { _id: false });

const displayConfigSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeetingRoom',
    required: true,
    unique: true
  },
  width: { type: Number, default: 1920 },
  height: { type: Number, default: 1080 },
  backgroundColor: { type: String, default: '#1a1a2e' },
  backgroundImage: { type: String, default: null }, // URL ไฟล์ภาพหรือ Base64 (legacy)
  backgroundVideo: { type: String, default: null }, // URL ไฟล์วีดิโอ
  backgroundMediaType: { type: String, enum: ['image', 'video', null], default: null },
  elements: {
    type: [elementSchema],
    default: () => [
      {
        type: 'purpose',
        x: 100,
        y: 200,
        fontSize: 80,
        fontFamily: 'Sarabun',
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#ffffff',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 8,
        shadowX: 2,
        shadowY: 2,
        padding: '12px 24px',
        backgroundColor: 'transparent',
        visible: true
      },
      {
        type: 'date',
        x: 100,
        y: 380,
        fontSize: 56,
        fontFamily: 'Sarabun',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#f0c040',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 4,
        shadowX: 1,
        shadowY: 1,
        padding: '8px 16px',
        backgroundColor: 'transparent',
        visible: true
      },
      {
        type: 'time',
        x: 100,
        y: 500,
        fontSize: 56,
        fontFamily: 'Sarabun',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#7ecfff',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 4,
        shadowX: 1,
        shadowY: 1,
        padding: '8px 16px',
        backgroundColor: 'transparent',
        visible: true
      }
    ]
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DisplayConfig', displayConfigSchema);
