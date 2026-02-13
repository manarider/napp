import { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error("Auth Check Error:", err);
          
          // ⭐ แก้ไข: ลบ Token เฉพาะเมื่อเจอ 401 (Unauthorized) หรือ 403 (Forbidden) เท่านั้น
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            localStorage.removeItem('token');
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
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (fullName, email, password, department) => {
    const res = await api.post('/auth/register', { fullName, email, password, department });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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