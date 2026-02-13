// routes/departments.js
const express = require('express');
const Department = require('../models/Department');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { createDepartmentValidator } = require('../middleware/validators');

const router = express.Router();

// 📋 ดูทั้งหมด
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ➕ เพิ่มสังกัดใหม่ (Admin only)
router.post('/', authMiddleware, adminMiddleware, createDepartmentValidator, async (req, res) => {
  try {
    const { name, code } = req.body;
    
    // ✓ Validator ตรวจสอบแล้ว
    const department = new Department({ name, code });
    await department.save();
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;