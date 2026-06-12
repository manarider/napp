# 🔐 คู่มือการใช้งาน UMS Authentication

## 📋 ภาพรวม

ระบบรองรับการ Login 2 วิธี:
1. **Login แบบปกติ** - ใช้ email/password ของระบบ (เดิม)
2. **Login ด้วย UMS** - ใช้ระบบ User Management System ภายนอก (Authorization Code Flow)
   - **Flow 1:** เริ่มจาก NAPP — User คลิกปุ่ม "Login with UMS" → ไป UMS → กลับมา callback
   - **Flow 2:** เริ่มจาก UMS (Deep Link) — User คลิก link จาก UMS โดยตรง → callback ที่ NAPP

> ✅ **สถานะ:** ใช้งานได้จริงบน Production แล้ว (`https://nssv.nsm.go.th/napp/`)

---

## 🎯 Role Mapping

เมื่อ Login ผ่าน UMS จะทำการแปลง Role ดังนี้:

| UMS Role | → | NAPP Role | สิทธิ์ |
|----------|---|-----------|--------|
| `superadmin` | → | `admin` | ผู้ดูแลระบบ (เข้าถึงทุกฟังก์ชัน) |
| `admin` | → | `admin` | ผู้ดูแลระบบ (เข้าถึงทุกฟังก์ชัน) |
| `member` | → | `user` | ผู้ใช้ทั่วไป (จองห้องประชุม, ดูข้อมูลของตัวเอง) |
| `user` | → | `user` | ผู้ใช้ทั่วไป (fallback) |

---

## 🔄 ขั้นตอนการทำงาน (Authorization Code Flow)

### Flow 1: NAPP-Initiated (เริ่มจากหน้า Login ของ NAPP)

```
┌────────┐     ┌──────────┐     ┌─────┐     ┌─────────┐     ┌──────────┐
│ User   │────▶│ NAPP     │────▶│ UMS │────▶│ Callback│────▶│ Backend  │
│ click  │     │ Login    │     │login│     │ (React) │     │ exchange │
└────────┘     └──────────┘     └─────┘     └─────────┘     └──────────┘
                    │                                              │
              เก็บ projectCode                                      ▼
              ใน sessionStorage                          ┌──────────────┐
                                                          │ JWT + User → │
                                                          │ localStorage │
                                                          └──────────────┘
```

### Flow 2: UMS Deep Link (เริ่มจากปุ่มใน UMS)

```
┌────────┐     ┌─────┐     ┌─────────────────┐     ┌─────────┐     ┌──────────┐
│ User   │────▶│ UMS │────▶│ Direct Redirect │────▶│ Callback│────▶│ Backend  │
│ ใน UMS │     │ gen │     │ ?code=xxx       │     │ (React) │     │ exchange │
└────────┘     │ code│     └─────────────────┘     └─────────┘     └──────────┘
               └─────┘                                   │              │
                                                  ❗ ไม่มี sessionStorage  ▼
                                                  → ใช้ fallback          JWT
                                                  'MEETBOOKING'        + redirect
```

**ความต่างของ 2 Flow:**

| ประเด็น | Flow 1 (NAPP) | Flow 2 (UMS Deep Link) |
|---------|---------------|------------------------|
| จุดเริ่มต้น | User กดปุ่มในหน้า NAPP Login | User กดปุ่มในหน้า UMS |
| `projectCode` | จาก `sessionStorage` | Fallback hardcoded `'MEETBOOKING'` |
| Local session เดิม | ไม่กระทบ (ปกติยังไม่ login) | ⚠️ ถูกล้างก่อน UMS login |
| URL Pattern | `/napp/auth/callback?code=xxx` | `/napp/auth/callback?code=xxx` (เหมือนกัน) |

> 💡 หน้า `UMSCallback.jsx` รองรับทั้ง 2 flows ด้วยโค้ดเดียว — แยกแยะอัตโนมัติด้วยการเช็ค `sessionStorage`

---

## 📝 รายละเอียดแต่ละขั้นตอน (Flow 1)

### 1. ผู้ใช้คลิกปุ่ม "Login with UMS"
- เก็บ `PROJECT_CODE` ใน sessionStorage (สำหรับใช้ตอน callback)
- Redirect ไป UMS พร้อม parameters:
  ```
  https://nssv.nsm.go.th/ums/?project=MEETBOOKING&redirect=CALLBACK_URL&flow=code
  ```

### 2. ผู้ใช้ Login ที่ UMS
- UMS ตรวจสอบสิทธิ์
- UMS สร้าง authorization code (อายุ 5 นาที, ใช้ครั้งเดียว)
- UMS redirect กลับมาพร้อม `code`:
  ```
  https://nssv.nsm.go.th/napp/auth/callback?code=xxxxx
  ```

### 3. หน้า Callback (React Component) รับ Code
- ดึง `code` จาก URL query string
- ดึง `projectCode` จาก sessionStorage (fallback: `MEETBOOKING`)
- เรียก API `POST /api/auth/exchange-code`
- ใช้ `useRef` ป้องกัน React StrictMode เรียกซ้ำ

### 4. Backend แลก Code เป็น Token
- เรียก UMS API: `POST /ums/api/auth/exchange-code`
- รับข้อมูล User จาก UMS (`firstName`, `lastName`, `role`, ฯลฯ)
- แปลง Role ตาม mapping (superadmin/admin → admin, member/user → user)
- สร้าง JWT token ของระบบ NAPP (อายุ 8 ชม.)
- ส่ง `{ status, token, user }` กลับ

### 5. Frontend เก็บข้อมูล
- เก็บ `napp_token` ใน localStorage (ใช้ key แยกจาก UMS)
- เก็บ `umsUser` (user data) ใน localStorage (เพราะไม่ได้บันทึกลง MongoDB)
- ลบ `code` ออกจาก URL (`history.replaceState`)
- ลบ `ums_project_code` จาก sessionStorage
- Redirect ไป Dashboard

---

## � รายละเอียด Flow 2 (UMS Deep Link)

สำหรับกรณีที่ user มาจาก UMS โดยตรง (ไม่ผ่านหน้า NAPP Login):

### การตั้งค่าใน UMS
ทาง UMS ต้องสร้าง redirect URL มาที่:
```
https://nssv.nsm.go.th/napp/auth/callback?code=AUTHORIZATION_CODE
```

### พฤติกรรมของ NAPP เมื่อรับ Deep Link

1. **อ่าน `code` จาก URL query string**
2. **เช็ค `sessionStorage['ums_project_code']`:**
   - ❌ ไม่มี → ใช้ fallback `'MEETBOOKING'`
   - ✅ มี → ใช้ค่าจาก sessionStorage (กรณีนี้ไม่น่าเกิด แต่รองรับไว้)
3. **ล้าง session เดิม** (`token`, `umsUser` ใน localStorage) เพื่อป้องกัน state ค้าง
4. **เรียก backend** `POST /api/auth/exchange-code` พร้อม `{ code, projectCode }`
5. **เก็บ token + user → redirect ไป `/dashboard`**

### ข้อควรระวัง
- ⚠️ Code มีอายุแค่ **5 นาที** และใช้ได้ **ครั้งเดียว** → NAPP ต้องแลก token ทันทีหลังรับ callback
- ⚠️ ถ้า user รีเฟรชหน้า callback หลังแลก code แล้ว → จะได้ error `"รหัสนี้ถูกใช้งานไปแล้ว"` (แต่ token เดิมยังใช้งานได้ปกติ)
- ✅ Component `UMSCallback.jsx` ใช้ `useRef` ป้องกัน double execution จาก React StrictMode

### ตัวอย่าง Log (Flow 2)
```
🔍 URL Full: https://nssv.nsm.go.th/napp/auth/callback?code=abc123
🔍 Query Parameters: { code: 'abc123' }
✅ Found code from param: code
🔀 Login Flow: Flow 2 (UMS deep link)
🧹 Clearing existing session before UMS login
🔐 UMS Callback: { code: 'abc123', projectCode: 'MEETBOOKING', foundParamName: 'code' }
✅ UMS Login Success: { token: '...', user: {...} }
```

---

## �🛠️ Configuration

### Backend (`/home/napp/meeting-room-booking-backend/.env`)
```env
# UMS Authentication Configuration
PROJECT_CODE=MEETBOOKING
CALLBACK_URL=https://nssv.nsm.go.th/napp/auth/callback
UMS_BASE_URL=https://nssv.nsm.go.th/ums/
JWT_SECRET=<secret>
```

### Frontend (`Login.jsx`)
```javascript
const PROJECT_CODE = 'MEETBOOKING';
const UMS_BASE_URL = 'https://nssv.nsm.go.th/ums/';
const CALLBACK_URL = window.location.origin + process.env.PUBLIC_URL + '/auth/callback';
```

---

## 📡 UMS API Specification

### Endpoint
```
POST https://nssv.nsm.go.th/ums/api/auth/exchange-code
Content-Type: application/json
```

### Request Body
```json
{
  "code": "AUTH_CODE_FROM_UMS",
  "projectCode": "MEETBOOKING"
}
```

### Response: สำเร็จ (200 OK)
```json
{
  "status": "success",
  "token": "UMS_JWT_TOKEN",
  "user": {
    "id": "user_id",
    "username": "manarider",
    "email": "user@nsm.or.th",
    "firstName": "ชื่อ",
    "lastName": "นามสกุล",
    "role": "member",
    "phone": "0812345678"
  }
}
```

### Response: ผิดพลาด
```json
{
  "status": "error",
  "message": "รหัสหมดอายุแล้ว"
}
```

ข้อความ error ที่อาจพบจาก UMS:
- `"รหัสหมดอายุแล้ว"` (เกิน 5 นาที)
- `"รหัสนี้ถูกใช้งานไปแล้ว"` (One-time use)
- `"projectCode ไม่ถูกต้อง"`
- `"ไม่พบรหัสนี้"`

---

## 📁 ไฟล์ที่เกี่ยวข้อง

### Backend
| ไฟล์ | หน้าที่ |
|------|---------|
| `controllers/umsAuthController.js` | แลก code กับ UMS + role mapping + สร้าง JWT |
| `routes/auth.js` | `POST /auth/exchange-code` + `/me` รองรับ UMS user (id ขึ้นต้นด้วย `ums_`) |
| `middleware/auth.js` | Verify JWT รองรับทั้ง local user และ UMS user |

### Frontend
| ไฟล์ | หน้าที่ |
|------|---------|
| `components/Auth/Login.jsx` | ปุ่ม "Login with UMS" + redirect ไป UMS |
| `components/Auth/UMSCallback.jsx` | รับ code จาก URL + เรียก exchange API |
| `components/Auth/Auth.css` | Style ปุ่ม UMS (gradient เขียว) + spinner |
| `context/AuthContext.jsx` | `loginWithUMS()` + จัดการ token/umsUser ใน localStorage |
| `App.js` | Route `/auth/callback` → `<UMSCallback />` |

---

## 🔒 ความปลอดภัย

### Authorization Code ใช้ได้ครั้งเดียว
- Code มีอายุ **5 นาที**
- Code ใช้ได้ **ครั้งเดียวเท่านั้น** (One-time use)
- หลังแลกเป็น token แล้ว ต้องลบ code ออกจาก URL ทันที

### ป้องกันการ Refresh หน้า
```javascript
// ลบ code ออกจาก URL
window.history.replaceState({}, document.title, window.location.pathname);

// ลบ projectCode ออกจาก sessionStorage
sessionStorage.removeItem('ums_project_code');
```

### ป้องกัน React StrictMode เรียก API ซ้ำ
```javascript
const hasExchanged = useRef(false);
useEffect(() => {
  if (hasExchanged.current) return;
  hasExchanged.current = true;
  // ... call exchange API
}, []);
```

### Token Storage
- `localStorage.napp_token` → JWT token ของระบบ NAPP (ใช้ key ที่มี prefix `napp_` เพื่อแยก namespace)
- `localStorage.umsUser` → ข้อมูล user (JSON) — สำหรับ UMS user เท่านั้น

### ⚠️ localStorage Namespace Conflict (แก้ไขแล้ว)

UMS และ NAPP ทำงานบน domain เดียวกัน (`nssv.nsm.go.th`) → ใช้ `localStorage` ร่วมกัน!

**ปัญหาที่เคยเกิด (ก่อนแก้ไข):**
```
1. User login UMS → localStorage['token'] = UMS_JWT
2. UMS redirect → /napp/auth/callback?code=xxx
3. NAPP AuthContext.checkUser() อ่าน localStorage['token'] → ได้ UMS_JWT
4. NAPP ส่ง UMS_JWT ไปที่ /napp/api/auth/me → 401
5. Axios interceptor: localStorage.removeItem('token') → ลบ token UMS!
6. Axios interceptor: window.location.href = '/login' → ไปหน้า UMS login!
7. UMSCallback ถูก destroy → exchange-code ไม่ถูกเรียกเลย
```

**วิธีแก้ (ทั้ง 2 ฝ่าย):**
| ระบบ | เดิม | ใหม่ |
|------|------|------|
| **UMS** | `localStorage['token']` | `localStorage['ums_token']` |
| **NAPP** | `localStorage['token']` | `localStorage['napp_token']` |

**Guard เพิ่มเติมใน NAPP:**
- `AuthContext.checkUser()` → skip ถ้าอยู่ที่ `/auth/callback`
- Axios interceptor → skip redirect ถ้าอยู่ที่ `/auth/callback`
- Axios interceptor redirect path → `process.env.PUBLIC_URL + '/login'` = `/napp/login` (ไม่ใช่ root `/login`)

---

## 📊 User Data Structure

### UMS Response (จาก UMS)
```json
{
  "id": "12345",
  "username": "manarider",
  "email": "user@nsm.or.th",
  "firstName": "ชื่อ",
  "lastName": "นามสกุล",
  "role": "member",
  "phone": "0812345678"
}
```

### NAPP User Object (ที่ frontend ใช้งาน)
```json
{
  "id": "ums_12345",
  "fullName": "ชื่อ นามสกุล",
  "email": "user@nsm.or.th",
  "department": "UMS",
  "role": "user",
  "source": "ums",
  "umsData": {
    "originalRole": "member",
    "username": "manarider",
    "firstName": "ชื่อ",
    "lastName": "นามสกุล",
    "phone": "0812345678"
  }
}
```

### JWT Payload
```json
{
  "id": "ums_12345",
  "role": "user",
  "source": "ums",
  "iat": 1747500000,
  "exp": 1747528800
}
```

---

## 🧪 การทดสอบ

### 1. ทดสอบ Login ปกติ (ต้องยังใช้งานได้)
```bash
curl -X POST https://nssv.nsm.go.th/napp/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. ทดสอบ UMS Login (Manual Flow)
1. เข้า `https://nssv.nsm.go.th/napp/login`
2. คลิกปุ่ม **"เข้าสู่ระบบด้วย UMS"** (สีเขียว)
3. Login ที่หน้า UMS
4. ระบบ redirect กลับ → ได้ token → เข้า Dashboard อัตโนมัติ

### 3. ทดสอบ Role Mapping
| UMS Role | คาดหวัง |
|----------|---------|
| `superadmin` → NAPP `admin` ✅ |
| `admin` → NAPP `admin` ✅ |
| `member` → NAPP `user` ✅ |

---

## 🐛 การแก้ไขปัญหา

### ปัญหา: "ไม่พบ authorization code"
- ตรวจสอบว่า UMS redirect กลับมาพร้อม `?code=` ใน query string
- ตรวจสอบ `CALLBACK_URL` ใน `.env` ตรงกับที่ลงทะเบียนกับ UMS

### ปัญหา: "รหัสหมดอายุแล้ว" / "รหัสนี้ถูกใช้งานไปแล้ว"
- Code มีอายุ 5 นาที + ใช้ได้ครั้งเดียว
- ให้กด Login ใหม่อีกครั้ง

### ปัญหา: "projectCode ไม่ถูกต้อง"
- ตรวจสอบ `PROJECT_CODE` ทั้งใน backend `.env` และ frontend `Login.jsx` ตรงกัน
- ค่าปัจจุบัน: `MEETBOOKING`

### ปัญหา: 404 จาก UMS API
- ตรวจสอบ `UMS_BASE_URL` ใน `.env` (ต้องลงท้ายด้วย `/`)
- Endpoint ที่ใช้: `POST {UMS_BASE_URL}api/auth/exchange-code`

### ปัญหา: UMS ตอบช้า (504)
- Timeout = 10 วินาที
- ตรวจสอบ network กับ UMS server

### ดู Log Backend
```bash
pm2 logs meeting-room-api --lines 50 --nostream
```

จะเห็น log ลักษณะนี้ตอน UMS Login:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 UMS Exchange Code Request
   📥 code: xxxxx
   📥 projectCode: MEETBOOKING
   🔄 Calling: POST https://nssv.nsm.go.th/ums/api/auth/exchange-code
   📤 UMS Status: 200
   🎯 Role: member → user
   ✅ Login success: ชื่อ นามสกุล (user)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Checklist

- [x] ระบบ Login เดิม (email/password) ยังใช้งานได้ปกติ
- [x] เพิ่มปุ่ม "Login with UMS" ในหน้า Login
- [x] สร้างหน้า UMSCallback (React Component) สำหรับรับ code
- [x] สร้าง API endpoint `POST /auth/exchange-code`
- [x] Role mapping: `superadmin/admin → admin`, `member/user → user`
- [x] ลบ code ออกจาก URL หลังแลกแล้ว (ป้องกัน refresh)
- [x] ป้องกัน React StrictMode เรียก API ซ้ำด้วย `useRef`
- [x] Error handling + แสดง error message จาก UMS
- [x] Logout ล้างทั้ง `napp_token` และ `umsUser`
- [x] รองรับ `superadmin` (เพิ่มเติมจาก spec เดิม)
- [x] ติดตั้ง `axios` สำหรับเรียก UMS API
- [x] เปลี่ยน localStorage key `token` → `napp_token` (แยก namespace จาก UMS)
- [x] Fix Axios interceptor: redirect ไป `/napp/login` ไม่ใช่ root `/login`
- [x] Fix Axios interceptor: ไม่ redirect เมื่ออยู่ที่ `/auth/callback`
- [x] Fix `AuthContext.checkUser()`: skip เมื่ออยู่ที่ `/auth/callback`
- [x] **Flow 1 (NAPP-initiated) Production tested ✅**
- [x] **Flow 2 (UMS Deep Link) Production tested ✅**

---

## 📝 Notes

1. **UMS User ID** มี prefix `ums_` เพื่อแยกจาก local user (Mongo `_id`)
2. **Token Expiry** = 8 ชั่วโมง (เหมือนกับ local login)
3. **UMS User Data** เก็บใน `localStorage.umsUser` เพราะไม่ได้บันทึกลง MongoDB
4. **Logout** จะลบทั้ง `napp_token` และ `umsUser` ออกจาก localStorage
5. **localStorage Key**: NAPP ใช้ `napp_token`, UMS ใช้ `ums_token` — แยก namespace บน domain เดียวกัน
6. **fullName** สร้างจาก `firstName + lastName` → ถ้าไม่มีจะใช้ `username` → fallback `'UMS User'`
7. **email** ถ้า UMS ไม่ส่งมา จะ generate เป็น `{username}@ums.local`
8. **department** ถ้า UMS ไม่ส่งมา จะ default เป็น `'UMS'`

---

## 🚀 Production Deployment

### URLs ปัจจุบัน
- **Frontend:** `https://nssv.nsm.go.th/napp/`
- **Backend API:** `https://nssv.nsm.go.th/napp/api/`
- **Callback:** `https://nssv.nsm.go.th/napp/auth/callback`
- **UMS:** `https://nssv.nsm.go.th/ums/`

### Build & Restart
```bash
# Frontend (เมื่อแก้ไข React)
cd /home/napp/meeting-room-booking-frontend
npm run build

# Backend (เมื่อแก้ไข Node.js)
pm2 restart meeting-room-api --update-env
```

### Nginx
- SPA fallback: ทุก path ที่ไม่ใช่ static file → return `index.html`
- ทำให้ `/auth/callback` ทำงานได้ผ่าน React Router

---

**สร้างเมื่อ:** 17 พฤษภาคม 2026  
**อัปเดตล่าสุด:** 17 พฤษภาคม 2026  
**เวอร์ชัน:** 1.3.0 — ✅ Production Ready (รองรับทั้ง 2 Flows)

### Changelog
- **v1.3.0** (17 พ.ค. 2026)
  - 🔴 **Critical Bug Fix**: แก้ไข localStorage conflict กับ UMS บน domain เดียวกัน
  - 🔄 เปลี่ยน NAPP key `localStorage['token']` → `localStorage['napp_token']`
  - 🔧 Fix Axios interceptor: redirect path `/napp/login` (ไม่ใช่ root `/login` ซึ่งเป็นหน้า UMS)
  - 🔧 Fix Axios interceptor: ไม่ redirect เมื่ออยู่ที่ `/auth/callback` (ป้องกัน destroy UMSCallback)
  - 🔧 Fix `AuthContext.checkUser()`: skip auth check บน `/auth/callback` path
  - ✅ **Flow 2 (UMS Deep Link) ทดสอบ Production สำเร็จ**
- **v1.2.0** (17 พ.ค. 2026)
  - 🆕 รองรับ **Flow 2: UMS Deep Link** อย่างเป็นทางการ (เริ่มจากปุ่มใน UMS โดยตรง)
  - 🆕 เพิ่มการล้าง session เดิมก่อน UMS login (ป้องกัน state ค้าง)
  - 🆕 เพิ่ม log แยกแยะ Flow 1 vs Flow 2 (`🔀 Login Flow: ...`)
  - 📖 อัปเดตคู่มือ: เพิ่มหัวข้อ Flow 2 + ASCII diagram + ตารางเปรียบเทียบ
- **v1.1.0** (17 พ.ค. 2026)
  - ✅ ทดสอบบน Production สำเร็จ
  - 🆕 เพิ่ม role `superadmin` → `admin` ใน mapping
  - 🔄 ปรับ `PROJECT_CODE` เป็น `MEETBOOKING` (จากเดิม `APP_DOCS`)
  - 🔄 เปลี่ยน `callback.html` → React Component `UMSCallback.jsx` (เพราะ nginx SPA fallback)
  - 🔄 อัปเดต UMS API spec จริง: `POST /api/auth/exchange-code` + body `{code, projectCode}` (camelCase)
  - 🔄 Response field: `firstName`/`lastName` (ไม่ใช่ `fullname`)
  - 🆕 เพิ่ม debug logs ใน backend controller
  - 🆕 เพิ่ม `useRef` กัน React StrictMode เรียกซ้ำ
- **v1.0.0** (ตอนแรก)
  - 🎉 Initial release
