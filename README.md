# 🏢 Meeting Room Booking System

ระบบจองห้องประชุมออนไลน์ สำหรับองค์กร พัฒนาด้วย React และ Node.js/Express

![Status](https://img.shields.io/badge/status-production-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 สารบัญ

- [คุณสมบัติ](#-คุณสมบัติ)
- [เทคโนโลยี](#-เทคโนโลยี)
- [การติดตั้ง](#-การติดตั้ง)
- [การใช้งาน](#-การใช้งาน)
- [API Documentation](#-api-documentation)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [การ Deploy](#-การ-deploy)
- [Security](#-security)
- [License](#-license)

---

## ✨ คุณสมบัติ

### สำหรับผู้ใช้ทั่วไป
- 🔐 **ระบบ Login/Register** - ปลอดภัยด้วย JWT
- 📅 **จองห้องประชุม** - รองรับการจองวันเดียวและหลายวัน
- 🖼️ **อัปโหลดรูปภาพ** - แนบหลักฐานการจอง
- 📋 **ดูการจองของตัวเอง** - จัดการการจองได้สะดวก
- ✏️ **แก้ไข/ยกเลิกการจอง** - ก่อนวันที่จอง
- 📊 **ปฏิทินห้องประชุม** - ดูสถานะความว่างของห้อง

### สำหรับผู้ดูแลระบบ (Admin)
- 👥 **จัดการผู้ใช้** - เพิ่ม/ลบ/แก้ไข/เปลี่ยนสิทธิ์
- 🏨 **จัดการห้องประชุม** - เพิ่ม/ลบ/แก้ไขห้อง
- ✅ **อนุมัติ/ปฏิเสธการจอง** - ควบคุมการจอง
- 📈 **Dashboard & Statistics** - สถิติการใช้งาน
- 📊 **กราฟและรายงาน** - วิเคราะห์ข้อมูล

---

## 🛠️ เทคโนโลยี

### Frontend
- **React** 19.2.0 - UI Library
- **React Router** 7.9.6 - Client-side routing
- **Axios** 1.13.2 - HTTP Client
- **Recharts** 3.4.1 - Data visualization

### Backend
- **Node.js** - Runtime environment
- **Express** 5.1.0 - Web framework
- **MongoDB** - Database
- **Mongoose** 8.20.4 - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **express-rate-limit** - Rate limiting

### Infrastructure
- **Nginx** - Reverse proxy
- **PM2** - Process manager
- **Ubuntu** - Operating system

---

## 📦 การติดตั้ง

### ข้อกำหนดเบื้องต้น

- Node.js >= 18.x
- MongoDB >= 6.x
- Nginx (สำหรับ production)
- PM2 (แนะนำ)

### 1. Clone Repository

```bash
git clone https://github.com/manarider/napp.git
cd napp
```

### 2. ติดตั้ง Backend

```bash
cd meeting-room-booking-backend
npm install

# สร้างไฟล์ .env
cp .env.example .env

# แก้ไขไฟล์ .env
nano .env
```

**ไฟล์ .env ตัวอย่าง:**
```env
MONGODB_URI=mongodb://username:password@localhost:27017/meetingRoomDB
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=5000
NODE_ENV=production
```

### 3. ติดตั้ง Frontend

```bash
cd ../meeting-room-booking-frontend
npm install

# แก้ไข homepage ใน package.json (ถ้าจำเป็น)
# "homepage": "/napp"
```

### 4. Build Frontend

```bash
npm run build
```

---

## 🚀 การใช้งาน

### Development Mode

**Backend:**
```bash
cd meeting-room-booking-backend
npm start
# หรือใช้ nodemon
nodemon server.js
```

**Frontend:**
```bash
cd meeting-room-booking-frontend
npm start
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

### Production Mode

**ใช้ PM2 สำหรับ Backend:**
```bash
cd meeting-room-booking-backend
pm2 start server.js --name meeting-room-api
pm2 save
pm2 startup
```

**ตรวจสอบสถานะ:**
```bash
pm2 status
pm2 logs meeting-room-api
```

---

## 📚 API Documentation

### Base URL
- Development: `http://localhost:5000/api`
- Production: `https://nssv.nsm.go.th/napp/api`

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "นาย ทดสอบ ระบบ",
  "email": "test@example.com",
  "password": "Admin@123",
  "department": "IT"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "fullName": "นาย ทดสอบ ระบบ",
    "email": "test@example.com",
    "role": "user"
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Booking Endpoints

#### Create Booking (Single Day)
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "roomId": "...",
  "fullName": "นาย ทดสอบ",
  "department": "IT",
  "bookingDate": "2026-05-01",
  "startTime": "09:00",
  "endTime": "12:00",
  "purpose": "ประชุมทีม"
}
```

#### Create Multi-Day Booking
```http
POST /api/bookings/multi-day
Authorization: Bearer <token>
Content-Type: application/json

{
  "roomId": "...",
  "fullName": "นาย ทดสอบ",
  "department": "IT",
  "startDate": "2026-05-01",
  "endDate": "2026-05-03",
  "startTime": "09:00",
  "endTime": "17:00",
  "purpose": "อบรม"
}
```

#### Get All Bookings (with pagination)
```http
GET /api/bookings?page=1&limit=20&status=approved
Authorization: Bearer <token>
```

#### Get My Bookings
```http
GET /api/bookings/my-bookings
Authorization: Bearer <token>
```

#### Update Booking
```http
PUT /api/bookings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "startTime": "10:00",
  "endTime": "13:00"
}
```

#### Delete Booking
```http
DELETE /api/bookings/:id
Authorization: Bearer <token>
```

### Room Endpoints

#### Get All Rooms
```http
GET /api/rooms
```

#### Get Room by ID
```http
GET /api/rooms/:id
```

#### Create Room (Admin only)
```http
POST /api/rooms
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "roomNumber": "101",
  "roomName": "ห้องประชุมใหญ่",
  "capacity": 50,
  "facilities": ["Projector", "Whiteboard", "WiFi"]
}
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users?page=1&limit=50
Authorization: Bearer <admin-token>
```

#### Update User Role
```http
PATCH /api/admin/users/:id/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "admin"
}
```

#### Update Booking Status
```http
PUT /api/admin/bookings/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "approved"
}
```

#### Get Dashboard Statistics
```http
GET /api/admin/dashboard/statistics
Authorization: Bearer <admin-token>
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "mongodb": "Connected"
}
```

---

## 📁 โครงสร้างโปรเจกต์

```
napp/
├── meeting-room-booking-backend/
│   ├── controllers/           # Business logic
│   │   ├── adminfController.js
│   │   ├── authController.js
│   │   └── bookingController.js
│   ├── middleware/            # Middleware functions
│   │   ├── auth.js           # JWT authentication
│   │   ├── errorHandler.js   # Error handling
│   │   └── validators.js     # Input validation
│   ├── models/                # Mongoose models
│   │   ├── User.js
│   │   ├── Booking.js
│   │   ├── MeetingRoom.js
│   │   └── Department.js
│   ├── routes/                # API routes
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── rooms.js
│   │   ├── departments.js
│   │   ├── admin.js
│   │   └── adminStats.js
│   ├── scripts/               # Database scripts
│   │   └── seedDB.js
│   ├── utils/                 # Utility functions
│   │   └── timezone.js
│   ├── .env                   # Environment variables
│   ├── package.json
│   └── server.js              # Entry point
│
└── meeting-room-booking-frontend/
    ├── public/
    ├── src/
    │   ├── components/        # React components
    │   │   ├── Admin/
    │   │   ├── Auth/
    │   │   ├── Booking/
    │   │   ├── Layout/
    │   │   └── common/
    │   ├── context/           # React Context
    │   │   ├── AuthContext.jsx
    │   │   └── AlertContext.jsx
    │   ├── pages/             # Page components
    │   ├── services/          # API services
    │   │   └── api.js
    │   ├── App.js
    │   └── index.js
    ├── build/                 # Production build
    └── package.json
```

---

## 🌐 การ Deploy

### Nginx Configuration

**Location:** `/etc/nginx/sites-available/my-apps`

```nginx
server {
    listen 80;
    server_name nssv.nsm.go.th;

    client_max_body_size 50M;

    # Frontend
    location /napp {
        alias /home/napp/meeting-room-booking-frontend/build;
        try_files $uri $uri/ /napp/index.html;
    }

    # Backend API
    location /napp/api/ {
        rewrite ^/napp/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### ขั้นตอน Deploy

1. **Build Frontend:**
```bash
cd meeting-room-booking-frontend
npm run build
```

2. **Start Backend with PM2:**
```bash
cd meeting-room-booking-backend
pm2 start server.js --name meeting-room-api
pm2 save
```

3. **Reload Nginx:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. **ตรวจสอบ:**
```bash
pm2 status
curl http://localhost:5000/api/health
```

---

## 🔒 Security

### ✅ การรักษาความปลอดภัยที่ใช้งาน

1. **Authentication**
   - JWT tokens (24 hour expiry)
   - bcrypt password hashing (10 rounds)
   - Password strength validation

2. **Authorization**
   - Role-based access control (User/Admin)
   - Protected routes
   - Ownership verification

3. **API Security**
   - CORS whitelist
   - Input validation (express-validator)
   - MongoDB injection protection
   - Error message sanitization

4. **Infrastructure**
   - Trust proxy configuration
   - Nginx reverse proxy
   - Environment variable validation

### ⚠️ Security Best Practices

1. **อย่า commit ไฟล์ .env**
2. **เปลี่ยน JWT_SECRET เป็นค่าที่ปลอดภัย**
3. **ใช้ HTTPS ใน production**
4. **อัปเดต dependencies เป็นประจำ**
5. **เปิด rate limiting ใน production**

---

## 📝 License

MIT License - ดูรายละเอียดใน [LICENSE](LICENSE)

---

## 👥 Contributors

- **Developer:** NSM Team
- **Organization:** กรมพัฒนาสังคมและสวัสดิการ (NSM)

---

## 📞 ติดต่อ

- **URL:** https://nssv.nsm.go.th/napp/
- **Email:** support@nsm.go.th
- **GitHub:** https://github.com/manarider/napp

---

## 📄 เอกสารเพิ่มเติม

- [Progress Report](progress.md) - รายงานความคืบหน้า
- [Git Guide](git.md) - คำแนะนำการใช้ Git
- [API Documentation](docs/api.md) - เอกสาร API แบบละเอียด

---

**พัฒนาด้วย ❤️ โดย NSM Development Team**
