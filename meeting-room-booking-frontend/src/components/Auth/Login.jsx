import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // UMS Configuration
  const UMS_BASE_URL = 'https://nssv.nsm.go.th/ums/';
  const PROJECT_CODE = 'MEETBOOKING';
  const CALLBACK_URL = window.location.origin + process.env.PUBLIC_URL + '/auth/callback';

  const handleUMSLogin = () => {
    // เก็บ PROJECT_CODE ใน sessionStorage
    sessionStorage.setItem('ums_project_code', PROJECT_CODE);
    
    // สร้าง URL สำหรับ redirect ไป UMS
    const umsLoginUrl = `${UMS_BASE_URL}?project=${encodeURIComponent(PROJECT_CODE)}&redirect=${encodeURIComponent(CALLBACK_URL)}&flow=code`;
    
    console.log('🔐 Redirecting to UMS:', umsLoginUrl);
    
    // Redirect ไป UMS
    window.location.href = umsLoginUrl;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // ลบ error ของฟิลด์นี้เมื่อผู้ใช้แก้ไข
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    // Client-side validation
    const errors = {};
    
    if (!formData.email.trim()) {
      errors.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    
    if (!formData.password) {
      errors.password = 'กรุณากรอกรหัสผ่าน';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data);
      
      const errorMsg = err.response?.data?.error || 'เข้าสู่ระบบล้มเหลว';
      
      // แยก error ตามประเภท
      // [SEC-03] Backend ส่ง generic "Invalid credentials" แทนเพื่อป้องกัน username enumeration
      if (errorMsg === 'Invalid credentials') {
        setError('❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง');
      } else if (errorMsg.includes('Validation')) {
        setError('กรุณาตรวจสอบข้อมูลที่กรอก');
      } else {
        setError('❌ ' + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo Section */}
        <div className="auth-logo">
          {/* แก้ไขตรงนี้: เพิ่ม process.env.PUBLIC_URL เพื่อรองรับ Subfolder /napp */}
          <img 
            src={process.env.PUBLIC_URL + "/logo1.webp"} 
            alt="Logo" 
            className="logo-image" 
          />
          <h1>เข้าสู่ระบบ</h1>
          <p className="auth-subtitle">ระบบจองห้องประชุมเทศบาลนครสวรรค์</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>อีเมล:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="กรอกอีเมลของคุณ"
              autoComplete="email"
              className={fieldErrors.email ? 'input-error' : ''}
            />
            {fieldErrors.email && (
              <span className="field-error">❌ {fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label>รหัสผ่าน:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="กรอกรหัสผ่าน"
              autoComplete="current-password"
              className={fieldErrors.password ? 'input-error' : ''}
            />
            {fieldErrors.password && (
              <span className="field-error">❌ {fieldErrors.password}</span>
            )}
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'กำลังโหลด...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>หรือ</span>
        </div>

        {/* UMS Login Button */}
        <button 
          type="button" 
          onClick={handleUMSLogin} 
          className="ums-login-btn"
        >
          🔐 เข้าสู่ระบบด้วย UMS
        </button>

      </div>
    </div>
  );
};

export default Login;