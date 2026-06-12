import axios from 'axios';

// ตรวจสอบว่ากำลังรันบน production domain หรือไม่
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// ถ้าเป็น production ใช้ relative path (Nginx จะ proxy ให้)
// ถ้าเป็น development ใช้ full URL
const API_URLS = isProduction 
  ? ['/napp/api']  // ใช้ relative path พร้อม base path /napp/ สำหรับ Nginx
  : [
      'http://localhost:5000/api',
      'http://192.168.100.151:5000/api',
    ];

let workingApiUrl = API_URLS[0];
let isApiReady = false;

// ✅ ลองทุก URL พร้อมกัน แล้วใช้ตัวที่เร็วที่สุด (เฉพาะ development)
const findFastestApi = async () => {
  // ถ้าเป็น production ไม่ต้องทดสอบ ใช้ relative path เลย
  if (isProduction) {
    console.log('✅ Production mode: Using Nginx proxy at /napp/api');
    isApiReady = true;
    return;
  }

  // Development mode: ทดสอบหา API ที่ทำงาน
  try {
    const promises = API_URLS.map(url => 
      axios.get(`${url}/health`, { timeout: 2000 })
        .then(() => url)
        .catch(() => null)
    );
    
    const results = await Promise.allSettled(promises);
    const working = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
    
    if (working.length > 0) {
      workingApiUrl = working[0];
      console.log('✅ Development mode: Using API:', workingApiUrl);
    } else {
      console.warn('⚠️ No API available, using default:', workingApiUrl);
    }
  } catch (error) {
    console.warn('⚠️ API detection failed, using default:', workingApiUrl);
  } finally {
    isApiReady = true;
  }
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    // ⭐ รอให้ API detection เสร็จก่อนถ้ายังไม่เสร็จ
    if (!isApiReady) {
      await findFastestApi();
    }
    
    config.baseURL = workingApiUrl;
    // ใช้ key 'napp_token' เพื่อแยก namespace จากแอปอื่นบน domain เดียวกัน (เช่น UMS)
    const token = localStorage.getItem('napp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // ไม่ redirect ถ้าอยู่ที่ /auth/callback (UMSCallback กำลัง exchange code อยู่)
      const isCallbackPage = window.location.pathname.includes('/auth/callback');
      if (!isCallbackPage) {
        localStorage.removeItem('napp_token');
        // ใช้ PUBLIC_URL เพื่อให้ redirect ไปที่ /napp/login ไม่ใช่ root /login
        window.location.href = (process.env.PUBLIC_URL || '') + '/login';
      }
    }
    return Promise.reject(error);
  }
);

// เริ่มทดสอบทันทีตอน load
findFastestApi();

export default api;