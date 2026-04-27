import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Booking.css';

const MultiDayBookingForm = ({ onClose = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    roomId: '',
    fullName: '',
    department: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    purpose: ''
  });

  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasTimeConflict, setHasTimeConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Image states
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);

  // ✅ ฟังก์ชันช่วย: แปลงเวลาจากจุด (.) เป็นโคลอน (:)
  const normalizeTime = (time) => {
    return time ? time.replace('.', ':') : '';
  };

  // ✅ ฟังก์ชันช่วย: ตรวจสอบรูปแบบเวลา (รองรับทั้ง : และ .)
  const validateTimeFormat = (time) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  useEffect(() => {
    // โหลดข้อมูลห้องพัก
    api.get('/rooms').then((res) => {
      setRooms(res.data.rooms || res.data);
    }).catch(err => console.error('Error loading rooms:', err));

    // ดึงข้อมูล User
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName,
        department: user.department
      }));
    }
  }, [user]);

  // ✅ ตรวจสอบเวลาซ้อนสำหรับหลายวัน
  const checkTimeConflicts = async () => {
    try {
      setCheckingAvailability(true);
      
      if (!validateTimeFormat(formData.startTime) || !validateTimeFormat(formData.endTime)) {
        setHasTimeConflict(true);
        setConflictMessage('⚠️ กรุณากรอกเวลาในรูปแบบ HH:MM หรือ HH.MM (เช่น 09:00, 13.30)');
        return;
      }

      // แปลงเวลาก่อนนำไปคำนวณ
      const [startHour, startMin] = normalizeTime(formData.startTime).split(':').map(Number);
      const [endHour, endMin] = normalizeTime(formData.endTime).split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMin;
      const endTimeInMinutes = endHour * 60 + endMin;

      const workStartMinutes = 8 * 60;
      const workEndMinutes = 18 * 60;

      if (startTimeInMinutes < workStartMinutes || endTimeInMinutes > workEndMinutes) {
        setHasTimeConflict(true);
        setConflictMessage('⚠️ เวลาทำการคือ 08:00 - 18:00 เท่านั้น');
        return;
      }

      if (startTimeInMinutes >= endTimeInMinutes) {
        setHasTimeConflict(true);
        setConflictMessage('⚠️ เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
        return;
      }

      // ตรวจสอบว่า endDate > startDate (ไม่ให้เลือกวันเดียวกัน)
      if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
        setHasTimeConflict(true);
        setConflictMessage('⚠️ วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น (ไม่สามารถเลือกวันเดียวกันได้)');
        return;
      }

      // ตรวจสอบ conflict ในแต่ละวัน
      const startDateObj = new Date(formData.startDate);
      const endDateObj = new Date(formData.endDate);
      const conflicts = [];

      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        const res = await api.get('/bookings', {
          params: {
            roomId: formData.roomId,
            date: dateStr
          }
        });

        let bookings = res.data.bookings || res.data || [];

        const dayConflicts = bookings.filter(booking => {
          const [existingStartHour, existingStartMin] = booking.startTime.split(':').map(Number);
          const [existingEndHour, existingEndMin] = booking.endTime.split(':').map(Number);
          
          const existingStartTime = existingStartHour * 60 + existingStartMin;
          const existingEndTime = existingEndHour * 60 + existingEndMin;

          return startTimeInMinutes < existingEndTime && endTimeInMinutes > existingStartTime;
        });

        if (dayConflicts.length > 0) {
          conflicts.push({
            date: dateStr,
            bookings: dayConflicts
          });
        }
      }

      if (conflicts.length > 0) {
        const conflictDates = conflicts.map(c => {
          const date = new Date(c.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
          const times = c.bookings.map(b => `${b.startTime}-${b.endTime}`).join(', ');
          return `${date} (${times})`;
        }).join(' | ');
        
        setHasTimeConflict(true);
        setConflictMessage(`❌ ห้องนี้มีการจองซ้อนในวัน: ${conflictDates}`);
      } else {
        setHasTimeConflict(false);
        setConflictMessage('');
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (formData.roomId && formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      checkTimeConflicts();
    } else {
        setHasTimeConflict(false);
        setConflictMessage('');
    }
    // eslint-disable-next-line
  }, [formData.roomId, formData.startDate, formData.endDate, formData.startTime, formData.endTime]);


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('❌ กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('❌ ขนาดไฟล์ต้องไม่เกิน 5MB');
        return;
      }

      setError('');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImageData({
          data: reader.result,
          contentType: file.type,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageData(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (hasTimeConflict) {
        setError('❌ ไม่สามารถจองได้ เพราะเวลาซ้อนกับการจองอื่น');
        setLoading(false);
        return;
    }

    try {
      const submitData = {
        roomId: formData.roomId,
        fullName: formData.fullName,
        department: formData.department,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: normalizeTime(formData.startTime),
        endTime: normalizeTime(formData.endTime),
        purpose: formData.purpose
      };

      if (imageData) submitData.bookingImage = imageData;

      // ส่งไป endpoint แยก
      const response = await api.post('/bookings/multi-day', submitData);
      
      const count = response.data.count || 1;
      alert(`✅ สร้างการจองสำเร็จ ${count} วัน`);

      if (onClose) onClose();
      else navigate('/bookings/my-bookings');

    } catch (err) {
      setError('❌ ' + (err.response?.data?.error || 'เกิดข้อผิดพลาด'));
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  return (
    <div className="booking-form-container">
      <div className="booking-form-card">
        <h2>📅 จองห้องประชุมหลายวัน</h2>

        {error && <div className="error-message">{error}</div>}
        {conflictMessage && <div className="warning-message">{conflictMessage}</div>}

        <form onSubmit={handleSubmit}>
          {/* Row 1: ห้อง และ ชื่อผู้จอง */}
          <div className="form-row">
            <div className="form-group">
              <label>ห้อง: *</label>
              <select
                name="roomId"
                value={formData.roomId}
                onChange={handleChange}
                required
              >
                <option value="">เลือกห้อง</option>
                {rooms.map((room) => (
                  <option key={room._id} value={room._id}>
                    {room.roomNumber} - {room.roomName} ({room.capacity} คน)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ชื่อ-นามสกุล: *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                readOnly
                disabled
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* Row 2: สังกัด */}
          <div className="form-row">
            <div className="form-group">
              <label>สังกัด/กอง: *</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                readOnly
                disabled
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#1f2937' }}
              />
            </div>
          </div>

          {/* Row 3: วันที่เริ่มต้น และ วันที่สิ้นสุด */}
          <div className="form-row">
            <div className="form-group">
              <label>📅 วันที่เริ่มต้น: *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                min={getTodayDate()}
              />
            </div>

            <div className="form-group">
              <label>📅 วันที่สิ้นสุด: *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                min={formData.startDate ? new Date(new Date(formData.startDate).getTime() + 86400000).toISOString().split('T')[0] : getTodayDate()}
              />
              <small style={{color: '#666', fontSize: '0.85rem'}}>
                ต้องเลือกอย่างน้อย 2 วันขึ้นไป (วันถัดไปจากวันเริ่มต้น)
              </small>
            </div>
          </div>

          {/* Row 4: เวลา */}
          <div className="form-row">
            <div className="form-group">
              <label>เวลาเริ่มประชุม: *</label>
              <input
                type="text"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                placeholder="เช่น 09.00 หรือ 09:00"
                pattern="^([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]$"
                title="กรุณากรอกเวลาในรูปแบบ HH:MM หรือ HH.MM"
              />
              <small style={{color: '#666', fontSize: '0.85rem'}}>
                เวลาทำการ 08:00-18:00
              </small>
            </div>

            <div className="form-group">
              <label>เวลาสิ้นสุด: *</label>
              <input
                type="text"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                placeholder="เช่น 12.00 หรือ 12:00"
                pattern="^([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]$"
                title="กรุณากรอกเวลาในรูปแบบ HH:MM หรือ HH.MM"
              />
              <small style={{color: '#666', fontSize: '0.85rem'}}>
                เวลาทำการ 08:00-18:00
              </small>
            </div>
          </div>
          
          {checkingAvailability && (
            <div className="checking-message"><p>🔄 กำลังตรวจสอบเวลา...</p></div>
          )}

          {/* Row 5: วัตถุประสงค์ */}
          <div className="form-group full-width">
            <label>วัตถุประสงค์: *</label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              required
              rows="3"
              placeholder="หัวข้อการประชุม..."
            />
          </div>

          {/* Image Upload */}
          <div className="form-group full-width">
            <label>📎 แนบหนังสือการจอง (ถ้ามี):</label>
            <div className="image-upload-container">
              <input
                type="file"
                id="bookingImage"
                accept="image/*"
                onChange={handleImageChange}
                className="image-input"
              />
              <label htmlFor="bookingImage" className="image-upload-btn">
                📷 เลือกรูปภาพ
              </label>
            </div>

            {imagePreview && (
              <div className="image-preview-container">
                <p className="preview-label">📄 รูปภาพที่เลือก:</p>
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button type="button" onClick={handleRemoveImage} className="btn-remove-image">🗑️ ลบรูปภาพ</button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading || hasTimeConflict} className="btn-submit">
              {loading ? 'กำลังบันทึก...' : '✅ สร้างการจองหลายวัน'}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className="btn-cancel">❌ ยกเลิก</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiDayBookingForm;
