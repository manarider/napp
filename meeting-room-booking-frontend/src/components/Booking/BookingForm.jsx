import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Booking.css';

// ── Thai date helper ──────────────────────────────────────
const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
const toThaiDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal + 'T00:00:00');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const BookingForm = ({ bookingId = null, onClose = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    roomId: '',
    fullName: '',
    department: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    purpose: ''
  });

  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing] = useState(!!bookingId);
  const [hasTimeConflict, setHasTimeConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Image states
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  // Preview popup states
  const [showPreview, setShowPreview] = useState(false);
  const [previewConfig, setPreviewConfig] = useState(null);
  const [previewRoom, setPreviewRoom] = useState(null);
  const [displayPurpose, setDisplayPurpose] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewCanvasRef = useRef(null);

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
    // 1. โหลดข้อมูลห้องพัก
    api.get('/rooms').then((res) => {
      setRooms(res.data.rooms || res.data);
    }).catch(err => console.error('Error loading rooms:', err));

    // โหลดรายชื่อแผนก
    api.get('/departments').then((res) => {
      if (Array.isArray(res.data)) setDepartments(res.data);
    }).catch(err => console.error('Error loading departments:', err));

    // 2. กรณีแก้ไข: ดึงข้อมูลเดิม
    if (isEditing && bookingId) {
      api.get(`/bookings/${bookingId}`).then((res) => {
        const booking = res.data;
        
        setFormData({
          roomId: booking.roomId._id || booking.roomId,
          fullName: booking.fullName,
          department: booking.department,
          bookingDate: booking.bookingDate.split('T')[0],
          startTime: booking.startTime,
          endTime: booking.endTime,
          purpose: booking.purpose
        });
        
        if (booking.bookingImage && booking.bookingImage.data) {
          setExistingImage(booking.bookingImage);
        }
      }).catch(err => console.error('Error loading booking:', err));

    } else if (user) {
      // 3. กรณีจองใหม่: ดึงข้อมูลจาก User ทันที
      setFormData((prev) => ({
        ...prev,
        fullName: user.fullName,
        department: user.department // ⭐ ดึงสังกัดจาก User
      }));
    }
  }, [bookingId, isEditing, user]);

  // ✅ ตรวจสอบเวลาซ้อน
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

      const res = await api.get('/bookings', {
        params: {
          roomId: formData.roomId,
          date: formData.bookingDate
        }
      });

      let bookings = res.data.bookings || res.data || [];
      
      if (isEditing && bookingId) {
        bookings = bookings.filter(b => b._id !== bookingId);
      }

      const conflicts = bookings.filter(booking => {
        const [existingStartHour, existingStartMin] = booking.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = booking.endTime.split(':').map(Number);
        
        const existingStartTime = existingStartHour * 60 + existingStartMin;
        const existingEndTime = existingEndHour * 60 + existingEndMin;

        return startTimeInMinutes < existingEndTime && endTimeInMinutes > existingStartTime;
      });

      if (conflicts.length > 0) {
        setHasTimeConflict(true);
        setConflictMessage(
          `❌ ห้องนี้มีการจองซ้อนในช่วงเวลา: ${conflicts.map(b => `${b.startTime}-${b.endTime}`).join(', ')}`
        );
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
    if (formData.roomId && formData.bookingDate && formData.startTime && formData.endTime) {
      checkTimeConflicts();
    } else {
        setHasTimeConflict(false);
        setConflictMessage('');
    }
    // eslint-disable-next-line
  }, [formData.roomId, formData.bookingDate, formData.startTime, formData.endTime]);


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

  const handleRemoveExistingImage = () => {
    setExistingImage(null);
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

    // กรณีสร้างใหม่: แสดง preview popup ก่อน
    if (!isEditing) {
      setPreviewLoading(true);
      try {
        const res = await api.get(`/display/room/${formData.roomId}`);
        setPreviewConfig(res.data.config || null);
        setPreviewRoom(res.data.room || null);
      } catch {
        const room = rooms.find(r => r._id === formData.roomId);
        setPreviewRoom(room ? { roomName: room.roomName, roomNumber: room.roomNumber } : null);
        setPreviewConfig(null);
      } finally {
        setPreviewLoading(false);
      }
      setDisplayPurpose(formData.purpose);
      setLoading(false);
      setShowPreview(true);
      return;
    }

    // กรณีแก้ไข: ส่งข้อมูลตรง
    await doSubmit(formData.purpose);
  };

  const doSubmit = async (purposeOverride) => {
    setLoading(true);
    setError('');
    try {
      const submitData = {
        roomId: formData.roomId,
        fullName: formData.fullName,
        department: formData.department,
        bookingDate: formData.bookingDate,
        startTime: normalizeTime(formData.startTime),
        endTime: normalizeTime(formData.endTime),
        purpose: purposeOverride !== undefined ? purposeOverride : formData.purpose
      };

      if (imageData) submitData.bookingImage = imageData;
      if (isEditing && !existingImage && !imageData) submitData.removeImage = true;

      if (isEditing) {
        await api.put(`/bookings/${bookingId}`, submitData);
        alert('✅ อัปเดตการจองสำเร็จ');
      } else {
        await api.post('/bookings', submitData);
        alert('✅ สร้างการจองสำเร็จ');
      }

      if (onClose) onClose();
      else navigate('/bookings/my-bookings');

    } catch (err) {
      setError('❌ ' + (err.response?.data?.error || 'เกิดข้อผิดพลาด'));
      setShowPreview(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    await doSubmit(displayPurpose);
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  return (
    <div className="booking-form-container">
      <div className="booking-form-card">
        <h2>{isEditing ? '✏️ แก้ไขการจอง' : '➕ สร้างการจอง'}</h2>

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

          {/* Row 2: สังกัด และ วันที่ */}
          <div className="form-row">
            <div className="form-group">
              <label>สังกัด/กอง: *</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">เลือกสังกัด/กอง</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>วันที่: *</label>
              <input
                type="date"
                name="bookingDate"
                value={formData.bookingDate}
                onChange={handleChange}
                required
                min={getTodayDate()}
              />
            </div>
          </div>

          {/* Row 3: เวลา (รองรับจุด) */}
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

          {/* Row 4: หัวข้อการประชุม */}
          <div className="form-group full-width">
            <label>หัวข้อการประชุม สำหรับขึ้นจอแสดงผล หน้าห้องประชุม: *</label>
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

            {existingImage && existingImage.data && !imagePreview && (
              <div className="image-preview-container">
                <p className="preview-label">📄 รูปภาพปัจจุบัน:</p>
                <img src={existingImage.data} alt="Current" className="image-preview" />
                <button type="button" onClick={handleRemoveExistingImage} className="btn-remove-image">🗑️ ลบรูปภาพ</button>
              </div>
            )}

            {imagePreview && (
              <div className="image-preview-container">
                <p className="preview-label">📄 รูปภาพใหม่:</p>
                <img src={imagePreview} alt="Preview" className="image-preview" />
                <button type="button" onClick={handleRemoveImage} className="btn-remove-image">🗑️ ลบรูปภาพ</button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading || hasTimeConflict || previewLoading} className="btn-submit">
              {loading || previewLoading ? 'กำลังโหลด...' : isEditing ? '🔄 อัปเดต' : '👁️ ดูตัวอย่างหน้าจอ'}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className="btn-cancel">❌ ยกเลิก</button>
            )}
          </div>
        </form>
      </div>

      {/* ── Preview Popup Modal ── */}
      {showPreview && (
        <DisplayPreviewModal
          formData={formData}
          normalizeTime={normalizeTime}
          previewConfig={previewConfig}
          previewRoom={previewRoom}
          displayPurpose={displayPurpose}
          setDisplayPurpose={setDisplayPurpose}
          onConfirm={handleConfirmBooking}
          onBack={() => setShowPreview(false)}
          loading={loading}
          previewCanvasRef={previewCanvasRef}
          toThaiDate={toThaiDate}
        />
      )}
    </div>
  );
};

export default BookingForm;

// ═══════════════════════════════════════════════════════════
// DisplayPreviewModal — ตัวอย่างหน้าจอสาธารณะหน้าห้องประชุม
// ═══════════════════════════════════════════════════════════
function DisplayPreviewModal({
  formData,
  normalizeTime,
  previewConfig,
  previewRoom,
  displayPurpose,
  setDisplayPurpose,
  onConfirm,
  onBack,
  loading,
  previewCanvasRef,
  toThaiDate,
}) {
  const CANVAS_W = previewConfig?.width || 1920;
  const CANVAS_H = previewConfig?.height || 1080;
  const PREVIEW_W = 720;
  const scale = PREVIEW_W / CANVAS_W;
  const PREVIEW_H = Math.round(CANVAS_H * scale);

  const bgColor = previewConfig?.backgroundColor || '#1a1a2e';
  const bgMediaType = previewConfig?.backgroundMediaType || null;
  const bgImage = (bgMediaType === 'image' || !bgMediaType) ? (previewConfig?.backgroundImage || null) : null;
  const bgVideo = bgMediaType === 'video' ? (previewConfig?.backgroundVideo || null) : null;
  const elements = previewConfig?.elements || [];

  const getTextContent = (el) => {
    if (el.customText) return el.customText;
    const type = el.type;
    if (type === 'purpose') return displayPurpose || 'หัวข้อการประชุม';
    if (type === 'date') return toThaiDate(formData.bookingDate);
    if (type === 'time') {
      const s = normalizeTime(formData.startTime);
      const e = normalizeTime(formData.endTime);
      return `${s} - ${e} น.`;
    }
    return '';
  };

  const getElementStyle = (el) => {
    const shadow = (el.shadowBlur || 0) > 0
      ? `${el.shadowX || 0}px ${el.shadowY || 0}px ${el.shadowBlur}px ${el.shadowColor || 'rgba(0,0,0,0.5)'}`
      : 'none';
    return {
      position: 'absolute',
      left: `${el.x || 0}px`,
      top: `${el.y || 0}px`,
      fontSize: `${el.fontSize || 64}px`,
      fontFamily: `'${el.fontFamily || 'Sarabun'}', sans-serif`,
      fontWeight: el.fontWeight || 'bold',
      fontStyle: el.fontStyle || 'normal',
      textAlign: el.textAlign || 'left',
      color: el.color || '#ffffff',
      border: `${el.borderWidth || 0}px solid ${el.borderColor || 'transparent'}`,
      borderRadius: `${el.borderRadius || 0}px`,
      textShadow: shadow,
      padding: el.padding || '8px 16px',
      backgroundColor: el.backgroundColor || 'transparent',
      display: el.visible !== false ? 'block' : 'none',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.2,
      maxWidth: `${CANVAS_W - (el.x || 0) - 20}px`,
      pointerEvents: 'none',
    };
  };

  return (
    <div className="dp-overlay">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&family=Kanit:wght@300;400;500;700&family=Prompt:wght@300;400;500;700&family=Mitr:wght@300;400;500;600&display=swap"
      />
      <div className="dp-modal">
        <div className="dp-modal-header">
          <h2>📺 ตัวอย่างหน้าจอแสดงผลสาธารณะ</h2>
          <p className="dp-modal-subtitle">
            หน้าห้องประชุม: <strong>{previewRoom?.roomName || ''} {previewRoom?.roomNumber ? `(ห้อง ${previewRoom.roomNumber})` : ''}</strong>
          </p>
        </div>

        {/* Canvas Preview */}
        <div className="dp-canvas-wrapper" style={{ width: PREVIEW_W, height: PREVIEW_H }}>
          <div
            ref={previewCanvasRef}
            style={{
              width: `${CANVAS_W}px`,
              height: `${CANVAS_H}px`,
              backgroundColor: bgColor,
              backgroundImage: bgImage ? `url(${bgImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {bgVideo && (
              <video
                key={bgVideo}
                autoPlay loop muted playsInline
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover', zIndex: 0,
                }}
              >
                <source src={bgVideo} />
              </video>
            )}

            {elements.length > 0 ? (
              elements.map((el, idx) => (
                <div key={`${el.type}-${idx}`} style={{ ...getElementStyle(el), zIndex: 1 }}>
                  {getTextContent(el)}
                </div>
              ))
            ) : (
              /* Fallback: ไม่มี config แสดง layout เริ่มต้น */
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 32, padding: 80,
              }}>
                <div style={{
                  fontSize: 96, fontWeight: 700, color: '#ffffff',
                  fontFamily: "'Sarabun', sans-serif", textAlign: 'center',
                  textShadow: '0 4px 16px rgba(0,0,0,0.8)',
                  whiteSpace: 'pre-wrap', lineHeight: 1.3,
                }}>
                  {displayPurpose || 'หัวข้อการประชุม'}
                </div>
                <div style={{
                  fontSize: 56, color: 'rgba(255,255,255,0.85)',
                  fontFamily: "'Sarabun', sans-serif", textAlign: 'center',
                }}>
                  {toThaiDate(formData.bookingDate)}
                </div>
                <div style={{
                  fontSize: 56, color: 'rgba(255,255,255,0.85)',
                  fontFamily: "'Sarabun', sans-serif",
                }}>
                  {normalizeTime(formData.startTime)} - {normalizeTime(formData.endTime)} น.
                </div>
              </div>
            )}

            {/* Room label */}
            <div style={{
              position: 'absolute', bottom: 24, right: 36,
              fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              fontFamily: "'Sarabun', sans-serif",
              textShadow: '0 0 16px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.9)',
              pointerEvents: 'none',
            }}>
              {previewRoom?.roomName} {previewRoom?.roomNumber ? `(ห้อง ${previewRoom.roomNumber})` : ''}
            </div>
          </div>
        </div>

        {/* Editable purpose */}
        <div className="dp-edit-section">
          <label className="dp-edit-label">
            ✏️ แก้ไขหัวข้อการประชุม (ที่จะแสดงบนจอ):
          </label>
          <textarea
            className="dp-edit-textarea"
            value={displayPurpose}
            onChange={(e) => setDisplayPurpose(e.target.value)}
            rows={3}
            placeholder="หัวข้อการประชุม..."
          />
          <div className="dp-booking-summary">
            <span>📅 {toThaiDate(formData.bookingDate)}</span>
            <span>🕐 {normalizeTime(formData.startTime)} - {normalizeTime(formData.endTime)} น.</span>
            <span>👤 {formData.fullName}</span>
            <span>🏢 {formData.department}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="dp-actions">
          <button
            type="button"
            className="dp-btn-back"
            onClick={onBack}
            disabled={loading}
          >
            ← แก้ไขข้อมูลการจอง
          </button>
          <button
            type="button"
            className="dp-btn-confirm"
            onClick={onConfirm}
            disabled={loading || !displayPurpose.trim()}
          >
            {loading ? '⏳ กำลังบันทึก...' : '✅ บันทึกยืนยันการจอง'}
          </button>
        </div>
      </div>
    </div>
  );
}