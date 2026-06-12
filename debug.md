# 🐛 Debug Log — Meeting Room Booking System
> บันทึกปัญหาที่ตรวจพบจากการ Code Review วันที่ 17 พ.ค. 2569

---

## 🔴 ปัญหาความปลอดภัย (Security)

### [SEC-01] JWT_SECRET ยังเป็น Placeholder
- **ไฟล์**: `meeting-room-booking-backend/.env`
- **บรรทัด**: `JWT_SECRET=your_super_secret_key_12345_change_this_to_something_secure`
- **ผลกระทบ**: หาก deploy production ด้วยค่านี้ ผู้โจมตีสามารถ forge token ได้ทุกใบ
- **การแก้ไข**: ⚠️ **ต้องทำด้วยตนเอง** — เปลี่ยนเป็นค่าสุ่มที่ปลอดภัย เช่น:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- **สถานะ**: ✅ แก้ไขแล้ว (17 พ.ค. 2569) — เปลี่ยนเป็น random 512-bit hex key แล้ว

---

### [SEC-02] authMiddleware ไม่ตรวจ `status: inactive`
- **ไฟล์**: `middleware/auth.js`
- **ปัญหา**: Middleware ตรวจแค่ JWT signature แต่ไม่ตรวจว่า user ถูก disable แล้วหรือยัง
  ผู้ใช้ที่ถูก admin set เป็น `inactive` ยังสามารถใช้ Token เดิมได้นานถึง 8 ชั่วโมง
- **การแก้ไข**: เพิ่ม DB lookup สำหรับ local user เพื่อตรวจ `status === 'active'`
- **สถานะ**: ✅ แก้ไขแล้ว — commit: auth-inactive-check

---

### [SEC-03] Username Enumeration ใน Login
- **ไฟล์**: `routes/auth.js`
- **ปัญหา**: Login endpoint ตอบ `"User not found"` และ `"Invalid password"` แยกกัน
  ทำให้ผู้โจมตีรู้ว่า email มีอยู่ในระบบหรือไม่ (OWASP A07)
- **การแก้ไข**: เปลี่ยนทั้งสองกรณีให้ตอบ `"Invalid credentials"` เหมือนกัน; อัปเดต `Login.jsx` ให้ handle `"Invalid credentials"` แล้วแสดงข้อความภาษาไทย
- **สถานะ**: ✅ แก้ไขแล้ว (ทั้ง backend routes/auth.js และ frontend Login.jsx)

---

### [SEC-04] `REACT_APP_USER_SECRET_EDIT` — Client-side Security
- **ไฟล์**: `src/components/Admin/AdminDashboard.jsx` บรรทัด 43
- **ปัญหา**: รหัสลับ client-side สำหรับเปิดหน้า User Management ถูก compile อยู่ใน JS bundle
  ใครก็ตามสามารถเปิด DevTools → Application → Sources เพื่อดูค่าได้
- **การแก้ไข**: ✅ Backend มี `adminMiddleware` กั้นอยู่แล้ว ดังนั้นเป็นแค่ UX lock ไม่ใช่ security
  แนะนำเพิ่มระยะเวลา lock (re-auth) หรือ confirm dialog แทน
- **สถานะ**: 📝 รับทราบ / ยังไม่แก้ (ไม่ blocking)

---

### [SEC-05] `req.query.status` ผ่านตรงไป MongoDB ไม่ผ่าน Whitelist
- **ไฟล์**: `routes/bookings.js` บรรทัด 87, `routes/admin.js` บรรทัด 89
- **ปัญหา**: `query.status = req.query.status` โดยไม่ตรวจ enum ที่อนุญาต
  อาจถูกใช้ส่งค่าที่ไม่คาดคิดเข้า MongoDB query
- **การแก้ไข**: เพิ่ม whitelist validation ก่อน assign
- **สถานะ**: ✅ แก้ไขแล้ว

---

### [SEC-06] Password Policy ไม่สอดคล้องกัน (Admin เปลี่ยนรหัสผ่าน)
- **ไฟล์**: `controllers/adminfController.js` → `updateUserPassword`
- **ปัญหา**: Admin เปลี่ยนรหัสผ่านให้ user ต้องการแค่ `>= 6` ตัวอักษร
  แต่การ Register ต้องการ `>= 8` ตัวพร้อม uppercase/lowercase/number/special
- **การแก้ไข**: เพิ่ม minimum เป็น 8 ตัวอักษรให้ตรงกัน
- **สถานะ**: ✅ แก้ไขแล้ว

---

## 🟠 Dead Code และไฟล์ที่ไม่ได้ใช้งาน

### [DEAD-01] `controllers/roomController.js` — ไม่ถูกใช้เลย
- **ไฟล์**: `controllers/roomController.js`
- **ปัญหา**: มี CRUD functions ครบแต่ `routes/rooms.js` เขียน logic inline ทั้งหมด ไม่ได้ import file นี้เลย
- **สถานะ**: ✅ ลบแล้ว (17 พ.ค. 2569)

### [DEAD-02] `adminfController.js` — ใช้บางส่วน และชื่อ typo
- **ไฟล์**: `controllers/adminfController.js` → เปลี่ยนเป็น `controllers/adminController.js`
- **ปัญหา**:
  - ชื่อไฟล์มี typo ตัว `f` เกิน (`adminfController` → ควรเป็น `adminController`)
  - `getAllUsers` และ `getDashboardStatistics` ไม่ถูกใช้ (routes/admin.js มี inline แทน)
- **สถานะ**: ✅ แก้ไขแล้ว (17 พ.ค. 2569) — rename ไฟล์, อัปเดต require() ใน admin.js, ลบ dead functions แล้ว

### [DEAD-03] `asyncHandler` ใน `errorHandler.js` — ไม่ถูกใช้
- **ไฟล์**: `middleware/errorHandler.js` บรรทัด 4
- **ปัญหา**: Export แต่ไม่มีที่ไหน import ไปใช้
- **สถานะ**: ✅ ลบแล้ว (17 พ.ค. 2569) — ลบ function definition และ export ออกจาก errorHandler.js

### [DEAD-04] โฟลเดอร์ `scripts/` มี Schema ซ้ำซ้อน
- **ไฟล์**: `scripts/User.js`, `scripts/Booking.js`, `scripts/MeetingRoom.js`, `scripts/Department.js`
- **ปัญหา**: เป็น copy ของ models แยกสำหรับ seed scripts อาจ drift จาก models จริง
- **สถานะ**: 📝 รับทราบ / แนะนำให้ใช้ models จริงแทนใน scripts

---

## 🟡 ความซ้ำซ้อน (Redundancy)

### [DUP-01] Booking Conflict Check Logic ซ้ำ 3 ที่
- **ไฟล์**: `bookingController.js#createBooking`, `bookingController.js#updateBooking`, `routes/bookings.js#PUT/:id`
- **ปัญหา**: Logic เหมือนกันทุกประการ แก้ที่เดียวต้องแก้อีก 2 ที่
- **สถานะ**: 📝 รับทราบ / ยังไม่ refactor (risky to change core booking logic)

### [DUP-02] Dashboard Statistics ซ้ำ 2 ที่
- `adminfController.js#getDashboardStatistics` (ไม่ได้ใช้)
- `routes/admin.js#/dashboard/statistics` (ใช้งานจริง)
- **สถานะ**: ✅ แก้ไขแล้ว (17 พ.ค. 2569) — ลบ dead function ออกพร้อมกับ DEAD-02

### [DUP-03] `getApiBaseUrl()` ซ้ำใน PublicDisplay.jsx
- **ไฟล์**: `src/pages/PublicDisplay.jsx` บรรทัด 27
- **ปัญหา**: สร้างฟังก์ชันซ้ำแทนที่จะ import จาก `services/api.js`
- **สถานะ**: 📝 รับทราบ / ยังไม่แก้

---

## 🟡 ปัญหาเสถียรภาพและประสิทธิภาพ

### [PERF-01] Race Condition ใน Single-Day Booking
- **ไฟล์**: `controllers/bookingController.js` บรรทัด 60
- **ปัญหา**: ขั้นตอน "ตรวจ conflict → บันทึก" ไม่ใช่ atomic — concurrent requests อาจผ่าน check พร้อมกันได้
  Multi-day booking ใช้ Transaction แต่ single-day ไม่ได้ใช้
- **การแก้ไขที่เหมาะสม**: เพิ่ม unique compound index `{ roomId, bookingDate, startTime, endTime }`
  หรือใช้ optimistic locking — ซับซ้อน ระบุไว้สำหรับ future improvement
- **สถานะ**: 📝 Known limitation / ไม่ได้แก้ (low concurrency risk สำหรับ internal system)

### [PERF-02] `fs.writeFileSync` บน Event Loop (Blocking I/O)
- **ไฟล์**: `routes/display.js` บรรทัด 257
- **ปัญหา**: การเขียนไฟล์ media ใช้ blocking sync I/O บน main thread ทำให้ server ค้างระหว่างเขียนไฟล์ใหญ่
- **การแก้ไข**: เปลี่ยนเป็น `await fs.promises.writeFile()`
- **สถานะ**: ✅ แก้ไขแล้ว

### [PERF-03] N+1 Query ใน `adminStats.js`
- **ไฟล์**: `routes/adminStats.js`
- **ปัญหา**:
  - `popular-rooms`: วนลูป N ห้อง × 2 `countDocuments` = N×2 queries
  - `department-usage`: `Booking.find()` โหลดข้อมูลทุก record เข้า memory
  - `monthly-stats`: วนลูป 6 เดือน × 2 `countDocuments` = 12 queries
- **การแก้ไข**: เปลี่ยนเป็น MongoDB aggregation pipeline
- **สถานะ**: ✅ แก้ไขแล้ว

---

## 🟢 สิ่งที่ทำได้ดี (ไม่ต้องแก้)

| หัวข้อ | รายละเอียด |
|---|---|
| CORS | Whitelist origin ถูกต้อง |
| Rate Limiting | Login/Register/General ครบ |
| Mongoose Transaction | Multi-day booking ถูกต้อง |
| Indexes | Booking + User ครอบคลุม query patterns |
| bcrypt pre-save hook | ถูกต้อง |
| express-validator | ครบสำหรับ auth + booking |
| trust proxy:1 | ถูกต้องสำหรับ Nginx |
| errorHandler | ป้องกัน stack trace ออก production |
| Graceful Shutdown | มีอยู่แล้วใน server.js |
| UMSCallback StrictMode guard | ใช้ `useRef` ป้องกัน double-run ถูกต้อง |

---

## 📋 ตาราง Status สรุป

| ID | ปัญหา | ระดับ | สถานะ |
|---|---|---|---|
| SEC-01 | JWT_SECRET placeholder | 🔴 | ✅ แก้แล้ว |
| SEC-02 | Inactive user ใช้ token ได้ | 🔴 | ✅ แก้แล้ว |
| SEC-03 | Username enumeration | 🔴 | ✅ แก้แล้ว |
| SEC-04 | Client-side secret | 🟠 | 📝 รับทราบ (backend guard อยู่แล้ว) |
| SEC-05 | Status query injection | 🔴 | ✅ แก้แล้ว |
| SEC-06 | Password policy inconsistent | 🟡 | ✅ แก้แล้ว |
| DEAD-01 | roomController ไม่ถูกใช้ | 🟡 | ✅ ลบแล้ว |
| DEAD-02 | adminfController typo+dead | 🟡 | ✅ rename + ลบ dead functions แล้ว |
| DEAD-03 | asyncHandler ไม่ถูกใช้ | 🟢 | ✅ ลบแล้ว |
| DEAD-04 | scripts/ schema drift | 🟡 | 📝 รับทราบ (utility scripts ไม่กระทบ server) |
| DUP-01 | Conflict check logic ซ้ำ 3 ที่ | 🟡 | 📝 Known risk / ไม่ refactor |
| DUP-02 | Dashboard stats ซ้ำ | 🟢 | ✅ ลบ dead function แล้ว |
| DUP-03 | getApiBaseUrl ซ้ำ | 🟢 | 📝 รับทราบ (intentional — PublicDisplay ไม่ใช้ auth) |
| PERF-01 | Race condition booking | 🟡 | 📝 Known limitation |
| PERF-02 | writeFileSync blocking | 🟡 | ✅ แก้แล้ว |
| PERF-03 | N+1 queries adminStats | 🟡 | ✅ แก้แล้ว |
