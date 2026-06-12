import { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      // ถ้าอยู่ที่ callback page ให้ UMSCallback จัดการเอง ไม่ต้องตรวจสอบ auth ก่อน
      if (window.location.pathname.includes('/auth/callback')) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('napp_token');
      
      if (token) {
        try {
          // ตรวจสอบว่ามี UMS user data ใน localStorage หรือไม่
          const umsUserData = localStorage.getItem('umsUser');
          
          if (umsUserData) {
            // UMS user - ใช้ข้อมูลจาก localStorage
            const parsedUser = JSON.parse(umsUserData);
            setUser(parsedUser);
          } else {
            // Local user - ดึงข้อมูลจาก API
            const res = await api.get('/auth/me');
            setUser(res.data);
          }
        } catch (err) {
          console.error("Auth Check Error:", err);
          
          // ⭐ แก้ไข: ลบ Token เฉพาะเมื่อเจอ 401 (Unauthorized) หรือ 403 (Forbidden) เท่านั้น
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            localStorage.removeItem('napp_token');
            localStorage.removeItem('umsUser');
            setUser(null);
          }
          // ถ้าเป็น Error อื่น (เช่น Server ดับ, เน็ตหลุด) ไม่ต้องลบ Token
          // ผู้ใช้จะยังเห็นหน้าจอได้ แต่อาจจะโหลดข้อมูลไม่ขึ้นแทน
        }
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('napp_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const loginWithUMS = async (code, projectCode) => {
    const res = await api.post('/auth/exchange-code', { code, projectCode });
    localStorage.setItem('napp_token', res.data.token);
    localStorage.setItem('umsUser', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (fullName, email, password, department) => {
    const res = await api.post('/auth/register', { fullName, email, password, department });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('napp_token');
    localStorage.removeItem('umsUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithUMS, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};