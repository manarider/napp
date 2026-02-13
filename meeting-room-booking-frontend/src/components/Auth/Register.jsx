import { useState, useEffect } from 'react'; // 1. เพิ่ม useEffect
import { useNavigate, Link } from 'react-router-dom'; // 2. เพิ่ม Link
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    department: ''
  });
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({}); // เพิ่ม: เก็บ error แต่ละฟิลด์
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // 3. แก้ไข: ใช้ useEffect เพื่อดึงข้อมูลตอนเปิดหน้าเว็บ
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        console.log('🔄 กำลังโหลดข้อมูลแผนก...');
        const res = await api.get('/departments');
        console.log('✅ โหลดข้อมูลแผนกสำเร็จ:', res.data);
        
        // ตรวจสอบว่าข้อมูลที่ได้เป็น Array หรือไม่
        if (Array.isArray(res.data)) {
          setDepartments(res.data);
        } else {
          console.error("❌ รูปแบบข้อมูลไม่ใช่ Array:", res.data);
          setError("ข้อมูลแผนกไม่ถูกต้อง");
        }
      } catch (err) {
        console.error("❌ Error fetching departments:", err);
        console.error("Error details:", err.response?.data || err.message);
        
        // แสดง error ที่เข้าใจง่าย
        if (err.code === 'ERR_NETWORK') {
          setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าระบบ Backend ทำงานอยู่");
        } else if (err.response?.status === 404) {
          setError("ไม่พบข้อมูลแผนก");
        } else {
          setError("ไม่สามารถโหลดข้อมูลแผนกได้: " + (err.response?.data?.error || err.message));
        }
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // ลบ error ของฟิลด์นี้เมื่อผู้ใช้แก้ไข
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    // ตรวจสอบข้อมูลก่อนส่ง
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'กรุณากรอกอีเมล';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    
    if (!formData.password) {
      errors.password = 'กรุณากรอกรหัสผ่าน';
    } else if (formData.password.length < 6) {
      errors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
    } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(formData.password)) {
      errors.password = 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข';
    }
    
    if (!formData.department) {
      errors.department = 'กรุณาเลือกแผนก';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('กรุณาตรวจสอบข้อมูลที่กรอก');
      setLoading(false);
      return;
    }

    try {
      await register(
        formData.fullName,
        formData.email,
        formData.password,
        formData.department
      );
      alert('✅ สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      navigate('/login');
    } catch (err) {
      console.error('Register error:', err.response?.data);
      
      // จัดการ Validation Errors จาก Backend
      if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
        const errors = {};
        err.response.data.details.forEach(detail => {
          errors[detail.field] = detail.message;
        });
        setFieldErrors(errors);
        setError('กรุณาตรวจสอบข้อมูลที่กรอก');
      } else {
        // Error ทั่วไป
        setError(err.response?.data?.error || 'การสมัครสมาชิกล้มเหลว');
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
          {/* 4. แก้ไข: ใส่ process.env.PUBLIC_URL เพื่อให้รูปขึ้นชัวร์ๆ */}
          <img 
            src={process.env.PUBLIC_URL + "/logo1.webp"} 
            alt="Logo" 
            className="logo-image" 
          />
          <h1>สมัครสมาชิก</h1>
          <p className="auth-subtitle">ระบบจองห้องประชุมเทศบาลนครสวรรค์</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>ชื่อ-นามสกุล:</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="กรอกชื่อ-นามสกุล"
              className={fieldErrors.fullName ? 'input-error' : ''}
            />
            {fieldErrors.fullName && (
              <span className="field-error">❌ {fieldErrors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label>อีเมล:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@email.com"
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
              required
              placeholder="อย่างน้อย 6 ตัวอักษร (ตัวอักษร+ตัวเลข)"
              minLength="6"
              className={fieldErrors.password ? 'input-error' : ''}
            />
            {fieldErrors.password && (
              <span className="field-error">❌ {fieldErrors.password}</span>
            )}
            {!fieldErrors.password && (
              <small className="field-hint">
                💡 รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร และต้องมีทั้งตัวอักษรและตัวเลข
              </small>
            )}
          </div>

          <div className="form-group">
            <label>แผนก:</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              disabled={departments.length === 0}
              className={fieldErrors.department ? 'input-error' : ''}
            >
              <option value="">
                {departments.length === 0 ? 'กำลังโหลดข้อมูลแผนก...' : 'เลือกแผนก'}
              </option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            {fieldErrors.department && (
              <span className="field-error">❌ {fieldErrors.department}</span>
            )}
            {departments.length === 0 && !error && !fieldErrors.department && (
              <small className="field-hint">
                กำลังโหลดข้อมูลแผนก...
              </small>
            )}
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'กำลังโหลด...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="auth-link">
          {/* 5. แก้ไข: ใช้ Link แทน a href เพื่อประสิทธิภาพที่ดีกว่า */}
          มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;