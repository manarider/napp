import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Booking.css';

const emptyEntry = () => ({
  id: Date.now() + Math.random(),
  date: '',
  roomId: '',
  startTime: '',
  endTime: '',
  conflict: null,
  checking: false,
});

const MultiDayBookingForm = ({ onClose = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ข้อมูลร่วม
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [purpose, setPurpose] = useState('');

  // รายการวันที่ต้องการจอง
  const [entries, setEntries] = useState([emptyEntry()]);

  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // { success, errors }

  const normalizeTime = (t) => (t ? t.replace('.', ':') : '');
  const validateTimeFormat = (t) => /^([0-1]?[0-9]|2[0-3])[:.]([0-5][0-9])$/.test(t);
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get('/rooms').then((res) => setRooms(res.data.rooms || res.data))
      .catch((err) => console.error('Error loading rooms:', err));
    api.get('/departments').then((res) => {
      if (Array.isArray(res.data)) setDepartments(res.data);
    }).catch((err) => console.error('Error loading departments:', err));
    if (user) {
      setFullName(user.fullName || '');
      setDepartment(user.department || '');
    }
  }, [user]);

  // ── Entry helpers ──────────────────────────────────────────

  const addEntry = () => setEntries((prev) => [...prev, emptyEntry()]);

  const removeEntry = (id) => {
    if (entries.length === 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id, field, value) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));

  // ── Conflict check ──────────────────────────────────────────

  const checkEntryConflict = async (entry) => {
    const { id, roomId, date, startTime, endTime } = entry;
    if (!roomId || !date || !startTime || !endTime) {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, conflict: null } : e)));
      return;
    }
    if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, conflict: '⚠️ รูปแบบเวลาไม่ถูกต้อง (เช่น 09:00)' } : e)));
      return;
    }
    const [sh, sm] = normalizeTime(startTime).split(':').map(Number);
    const [eh, em] = normalizeTime(endTime).split(':').map(Number);
    const start = sh * 60 + sm, end = eh * 60 + em;
    if (start < 480 || end > 1080) {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, conflict: '⚠️ เวลาทำการ 08:00–18:00 เท่านั้น' } : e)));
      return;
    }
    if (start >= end) {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, conflict: '⚠️ เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด' } : e)));
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, checking: true, conflict: null } : e)));
    try {
      const res = await api.get('/bookings', { params: { roomId, date } });
      const bookings = res.data.bookings || res.data || [];
      const conflicts = bookings.filter((b) => {
        const [bsh, bsm] = b.startTime.split(':').map(Number);
        const [beh, bem] = b.endTime.split(':').map(Number);
        return start < beh * 60 + bem && end > bsh * 60 + bsm;
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                checking: false,
                conflict: conflicts.length
                  ? `❌ ซ้อนกับการจอง: ${conflicts.map((b) => `${b.startTime}–${b.endTime}`).join(', ')}`
                  : null,
              }
            : e
        )
      );
    } catch {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, checking: false } : e)));
    }
  };

  // trigger check when room/date changes (and time already filled)
  const handleEntryChange = (id, field, value) => {
    setEntries((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, [field]: value } : e));
      const entry = updated.find((e) => e.id === id);
      // เช็คทันทีถ้าข้อมูลครบ
      if (entry.roomId && entry.date && entry.startTime && entry.endTime) {
        setTimeout(() => checkEntryConflict(entry), 0);
      }
      return updated;
    });
  };

  // ── Submit ──────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitResult(null);

    // validate
    for (const entry of entries) {
      if (!entry.date || !entry.roomId || !entry.startTime || !entry.endTime) {
        setError('❌ กรุณากรอกข้อมูลให้ครบทุกรายการ (วันที่, ห้อง, เวลา)');
        return;
      }
      if (entry.conflict) {
        setError('❌ มีรายการที่ซ้อนกับการจองอื่น กรุณาแก้ไขก่อนบันทึก');
        return;
      }
    }

    setLoading(true);
    let successCount = 0;
    const errors = [];

    for (const entry of entries) {
      try {
        await api.post('/bookings', {
          roomId: entry.roomId,
          fullName,
          department,
          bookingDate: entry.date,
          startTime: normalizeTime(entry.startTime),
          endTime: normalizeTime(entry.endTime),
          purpose,
        });
        successCount++;
      } catch (err) {
        const dateLabel = new Date(entry.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const room = rooms.find((r) => r._id === entry.roomId);
        const roomLabel = room ? `${room.roomNumber}` : 'ไม่ทราบห้อง';
        errors.push(`${dateLabel} ห้อง ${roomLabel}: ${err.response?.data?.error || 'เกิดข้อผิดพลาด'}`);
      }
    }

    setLoading(false);
    setSubmitResult({ success: successCount, errors });

    if (errors.length === 0) {
      alert(`✅ บันทึกการจองสำเร็จ ${successCount} รายการ`);
      if (onClose) onClose();
      else navigate('/bookings/my-bookings');
    }
  };

  const hasAnyConflict = entries.some((e) => e.conflict || e.checking);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="booking-form-container">
      <div className="booking-form-card">
        <h2>📅 จองห้องประชุมหลายรายการ</h2>

        {error && <div className="error-message">{error}</div>}

        {submitResult && submitResult.errors.length > 0 && (
          <div className="submit-result-box">
            <p>✅ บันทึกสำเร็จ {submitResult.success} รายการ</p>
            {submitResult.errors.map((err, i) => (
              <p key={i} className="result-error">❌ {err}</p>
            ))}
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn-submit" onClick={() => { if (onClose) onClose(); else navigate('/bookings/my-bookings'); }}>
                ไปหน้าการจองของฉัน
              </button>
            </div>
          </div>
        )}

        {!submitResult && (
        <form onSubmit={handleSubmit}>
          {/* ข้อมูลร่วม */}
          <div className="form-row">
            <div className="form-group">
              <label>ชื่อ-นามสกุล: *</label>
              <input
                type="text"
                value={fullName}
                readOnly
                disabled
                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>สังกัด/กอง: *</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} required>
                <option value="">เลือกสังกัด/กอง</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group full-width" style={{ marginBottom: '1.5rem' }}>
            <label>หัวข้อการประชุม สำหรับขึ้นจอแสดงผล หน้าห้องประชุม: *</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              rows="2"
              placeholder="หัวข้อการประชุม..."
            />
          </div>

          {/* รายการวัน */}
          <div className="multi-day-entries">
            <div className="entries-header">
              <span className="entries-title">📋 รายการที่ต้องการจอง ({entries.length} รายการ)</span>
              <button type="button" className="btn-add-entry" onClick={addEntry}>
                + เพิ่มรายการ
              </button>
            </div>

            {entries.map((entry, index) => (
              <div key={entry.id} className={`day-entry-card${entry.conflict ? ' has-conflict' : ''}`}>
                <div className="day-entry-header">
                  <span className="day-entry-number">รายการที่ {index + 1}</span>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-entry"
                      onClick={() => removeEntry(entry.id)}
                    >
                      ✕ ลบ
                    </button>
                  )}
                </div>

                <div className="form-row" style={{ marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label>วันที่: *</label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => handleEntryChange(entry.id, 'date', e.target.value)}
                      required
                      min={getTodayDate()}
                    />
                  </div>
                  <div className="form-group">
                    <label>ห้องประชุม: *</label>
                    <select
                      value={entry.roomId}
                      onChange={(e) => handleEntryChange(entry.id, 'roomId', e.target.value)}
                      required
                    >
                      <option value="">เลือกห้อง</option>
                      {rooms.map((room) => (
                        <option key={room._id} value={room._id}>
                          {room.roomNumber} – {room.roomName} ({room.capacity} คน)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: '0.5rem' }}>
                  <div className="form-group">
                    <label>เวลาเริ่ม: *</label>
                    <input
                      type="text"
                      value={entry.startTime}
                      onChange={(e) => updateEntry(entry.id, 'startTime', e.target.value)}
                      onBlur={() => checkEntryConflict(entry)}
                      required
                      placeholder="09:00"
                      pattern="^([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]$"
                      title="รูปแบบ HH:MM หรือ HH.MM"
                    />
                  </div>
                  <div className="form-group">
                    <label>เวลาสิ้นสุด: *</label>
                    <input
                      type="text"
                      value={entry.endTime}
                      onChange={(e) => updateEntry(entry.id, 'endTime', e.target.value)}
                      onBlur={() => checkEntryConflict(entry)}
                      required
                      placeholder="12:00"
                      pattern="^([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]$"
                      title="รูปแบบ HH:MM หรือ HH.MM"
                    />
                    <small style={{ color: '#64748b', fontSize: '0.8rem' }}>เวลาทำการ 08:00–18:00</small>
                  </div>
                </div>

                {entry.checking && (
                  <p className="entry-checking">🔄 กำลังตรวจสอบเวลา...</p>
                )}
                {entry.conflict && !entry.checking && (
                  <p className="entry-conflict">{entry.conflict}</p>
                )}
                {!entry.conflict && !entry.checking && entry.roomId && entry.date && entry.startTime && entry.endTime && (
                  <p className="entry-ok">✅ ว่าง</p>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={loading || hasAnyConflict}
              className="btn-submit"
            >
              {loading ? 'กำลังบันทึก...' : `✅ บันทึกการจอง ${entries.length} รายการ`}
            </button>
            {onClose && (
              <button type="button" onClick={onClose} className="btn-cancel">
                ❌ ยกเลิก
              </button>
            )}
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default MultiDayBookingForm;
