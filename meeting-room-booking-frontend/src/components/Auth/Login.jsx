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
      if (errorMsg === 'User not found') {
        setFieldErrors({ email: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
        setError('❌ ไม่พบผู้ใช้งานนี้ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกก่อน');
      } else if (errorMsg === 'Invalid password') {
        setFieldErrors({ password: 'รหัสผ่านไม่ถูกต้อง' });
        setError('❌ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
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

      </div>
    </div>
  );
};

export default Login;