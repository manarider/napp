import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './PublicDisplaySchedule.css';

// =======================================
// Thai date helper
// =======================================
const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
const THAI_DAYS = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

function toThaiDateFull(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function getApiBaseUrl() {
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProduction ? '/napp/api' : 'http://localhost:5000/api';
}

// คำนวณสถานะการประชุมจาก local time ของ client
function getBookingStatus(startTime, endTime, now) {
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  if (endTime <= hhmm) return 'past';
  if (startTime <= hhmm) return 'current';
  return 'upcoming';
}

// =======================================
// Main Component
// =======================================
const PublicDisplaySchedule = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(new Date());

  // นาฬิกา real-time
  useEffect(() => {
    const tick = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await axios.get(`${apiBase}/display/today-schedule`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, []);

  // ตั้ง background ให้ body เฉพาะหน้านี้
  useEffect(() => {
    const prevBg = document.body.style.background;
    document.body.style.background = '#0d1117';
    return () => {
      document.body.style.background = prevBg;
    };
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const padTime = (d) =>
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;

  // helper แสดง badge
  const StatusBadge = ({ status }) => {
    if (status === 'current') return (
      <span className="pds-badge pds-badge-current">
        <span className="pds-dot pds-dot-pulse" />
        กำลังประชุม
      </span>
    );
    if (status === 'upcoming') return (
      <span className="pds-badge pds-badge-upcoming">⏳ กำลังจะมาถึง</span>
    );
    return <span className="pds-badge pds-badge-past">✓ เสร็จแล้ว</span>;
  };

  if (loading) {
    return (
      <div className="pds-page pds-loading">
        <div className="pds-spinner" />
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pds-page pds-error">
        <span className="pds-error-icon">⚠️</span>
        <p>{error}</p>
      </div>
    );
  }

  const { date, rooms } = data || {};

  // คำนวณ status ทุก booking จาก local clock (clock tick ทุก 1 วินาที)
  const roomsWithStatus = (rooms || []).map(room => ({
    ...room,
    bookings: room.bookings.map(b => ({
      ...b,
      status: getBookingStatus(b.startTime, b.endTime, clock)
    }))
  }));

  const activeRooms = roomsWithStatus.filter(r => r.bookings.length > 0);
  const emptyRooms  = roomsWithStatus.filter(r => r.bookings.length === 0);

  const totalBookings = roomsWithStatus.reduce((sum, r) => sum + r.bookings.length, 0);
  const currentCount  = roomsWithStatus.reduce(
    (sum, r) => sum + r.bookings.filter(b => b.status === 'current').length, 0
  );

  return (
    <div className="pds-page">
      {/* Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Kanit:wght@400;500;600;700&display=swap"
      />

      {/* Header */}
      <div className="pds-header">
        <div className="pds-header-left">
          <div className="pds-logo">📅</div>
          <div>
            <h1 className="pds-title">ตารางการประชุมประจำวัน</h1>
            <p className="pds-subtitle">{toThaiDateFull(date)}</p>
          </div>
        </div>
        <div className="pds-header-right">
          <div className="pds-clock">{padTime(clock)}</div>
          <div className="pds-stats">
            <span className="pds-stat-badge pds-stat-total">
              ทั้งหมด {totalBookings} รายการ
            </span>
            {currentCount > 0 && (
              <span className="pds-stat-badge pds-stat-current">
                🔴 กำลังประชุม {currentCount} ห้อง
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pds-content">
        {activeRooms.length === 0 ? (
          <div className="pds-empty">
            <div className="pds-empty-icon">🏖️</div>
            <h2>ไม่มีการประชุมในวันนี้</h2>
            <p>ทุกห้องประชุมว่างตลอดวัน</p>
          </div>
        ) : (
          <>
            {/* === Desktop / TV: Table === */}
            <div className="pds-table-wrapper">
              <table className="pds-table">
                <thead>
                  <tr>
                    <th className="pds-th pds-th-room">ห้องประชุม</th>
                    <th className="pds-th pds-th-purpose">หัวข้อ / วัตถุประสงค์</th>
                    <th className="pds-th pds-th-time">เวลา</th>
                    <th className="pds-th pds-th-dept">แผนก / ผู้จอง</th>
                    <th className="pds-th pds-th-status">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRooms.map(room =>
                    room.bookings.map((booking, bIdx) => (
                      <tr
                        key={`${room.roomId}-${booking.id}`}
                        className={`pds-row pds-row-${booking.status} ${bIdx === 0 ? 'pds-row-first' : ''}`}
                      >
                        {bIdx === 0 && (
                          <td className="pds-td pds-td-room" rowSpan={room.bookings.length}>
                            <div className="pds-room-number">{room.roomNumber}</div>
                            <div className="pds-room-name">{room.roomName}</div>
                          </td>
                        )}
                        <td className="pds-td pds-td-purpose">{booking.purpose || '-'}</td>
                        <td className="pds-td pds-td-time">
                          <span className="pds-time-range">{booking.startTime} – {booking.endTime}</span>
                        </td>
                        <td className="pds-td pds-td-dept">
                          <div className="pds-dept">{booking.department || '-'}</div>
                          {booking.fullName && <div className="pds-name">{booking.fullName}</div>}
                        </td>
                        <td className="pds-td pds-td-status">
                          <StatusBadge status={booking.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* === Mobile: Cards === */}
            <div className="pds-cards">
              {activeRooms.map(room => (
                <div key={room.roomId} className="pds-room-group">
                  <div className="pds-room-group-header">
                    <span className="pds-room-number">{room.roomNumber}</span>
                    <span className="pds-room-name">{room.roomName}</span>
                  </div>
                  {room.bookings.map(booking => (
                    <div
                      key={booking.id}
                      className={`pds-card pds-card-${booking.status}`}
                    >
                      <div className="pds-card-top">
                        <span className="pds-card-time">{booking.startTime} – {booking.endTime}</span>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="pds-card-purpose">{booking.purpose || '-'}</div>
                      <div className="pds-card-meta">
                        <span>{booking.department || '-'}</span>
                        {booking.fullName && <span className="pds-card-name">• {booking.fullName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ห้องว่าง */}
        {emptyRooms.length > 0 && (
          <div className="pds-free-rooms">
            <span className="pds-free-label">ห้องว่างตลอดวัน:</span>
            {emptyRooms.map(r => (
              <span key={r.roomId} className="pds-free-badge">
                {r.roomNumber} {r.roomName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pds-footer">
        <span>อัปเดตอัตโนมัติทุก 1 นาที</span>
        <span>•</span>
        <span>ระบบจองห้องประชุม</span>
      </div>
    </div>
  );
};

export default PublicDisplaySchedule;
