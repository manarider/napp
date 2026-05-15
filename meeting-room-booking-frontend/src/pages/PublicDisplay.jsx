import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './PublicDisplay.css';

// =======================================
// Thai date helper
// =======================================
const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

function toThaiDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// =======================================
// ฟังก์ชันสร้าง API base URL (เหมือน api.js)
// =======================================
function getApiBaseUrl() {
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProduction ? '/napp/api' : 'http://localhost:5000/api';
}

// =======================================
// Main Component
// =======================================
const PublicDisplay = () => {
  const { roomId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลจาก public API (ไม่ต้อง auth)
  const fetchData = useCallback(async () => {
    try {
      const apiBase = getApiBaseUrl();
      const res = await axios.get(`${apiBase}/display/room/${roomId}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // ตั้ง overflow:hidden เฉพาะหน้า display ไม่ให้รั่วไปหน้าอื่น
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevBg = document.body.style.background;
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#000';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.background = prevBg;
    };
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh ทุก 60 วินาที
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="pd-fullscreen pd-loading-screen">
        <div className="pd-loading-spinner" />
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pd-fullscreen pd-error-screen">
        <div className="pd-error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }

  const { room, config, booking } = data || {};

  // ค่า default config ถ้าไม่มี
  const canvasWidth = config?.width || 1920;
  const canvasHeight = config?.height || 1080;
  const bgColor = config?.backgroundColor || '#1a1a2e';
  const bgMediaType = config?.backgroundMediaType || null;
  const bgImage = (bgMediaType === 'image' || !bgMediaType) ? (config?.backgroundImage || null) : null;
  const bgVideo = bgMediaType === 'video' ? (config?.backgroundVideo || null) : null;
  const elements = config?.elements || [];

  // คำนวณข้อความแต่ละ element (customText มีสิทธิ์สูงสุด)
  const getTextContent = (el) => {
    if (el.customText) return el.customText;
    const type = el.type;
    if (!booking) return type === 'purpose' ? 'ยังไม่มีการจองใช้ห้องประชุมในขณะนี้' : '';
    if (type === 'purpose') return booking.purpose || '-';
    if (type === 'date') {
      if (booking.isMultiDay) {
        return `${toThaiDate(booking.startDate)} - ${toThaiDate(booking.endDate)}`;
      }
      return toThaiDate(booking.bookingDate);
    }
    if (type === 'time') {
      return `${booking.startTime} - ${booking.endTime} น.`;
    }
    return '';
  };

  // คำนวณ style สำหรับ element
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
      color: el.color || '#ffffff',
      border: `${el.borderWidth || 0}px solid ${el.borderColor || 'transparent'}`,
      borderRadius: `${el.borderRadius || 0}px`,
      textShadow: shadow,
      padding: el.padding || '8px 16px',
      backgroundColor: el.backgroundColor || 'transparent',
      display: el.visible !== false ? 'block' : 'none',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.2,
      maxWidth: `${canvasWidth - (el.x || 0) - 20}px`
    };
  };

  // คำนวณ viewport scale
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const scaleX = viewportW / canvasWidth;
  const scaleY = viewportH / canvasHeight;
  const scale = Math.min(scaleX, scaleY);

  return (
    <div className="pd-fullscreen">
      {/* Google Fonts สำหรับภาษาไทย */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&family=Kanit:wght@300;400;500;700&family=Prompt:wght@300;400;500;700&family=Mitr:wght@300;400;500;600&display=swap"
      />

      {/* Canvas */}
      <div
        className="pd-canvas"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          backgroundColor: bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Video background */}
        {bgVideo && (
          <video
            key={bgVideo}
            autoPlay loop muted playsInline
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 0
            }}
          >
            <source src={bgVideo} />
          </video>
        )}
        {elements.map((el, idx) => (
          <div key={`${el.type}-${idx}`} style={{ ...getElementStyle(el), zIndex: 1 }}>
            {getTextContent(el)}
          </div>
        ))}

        {/* ห้องชื่อ (แสดงเสมอ เล็ก ๆ มุมล่าง) */}
        <div className="pd-room-label">
          {room?.roomName} (ห้อง {room?.roomNumber})
        </div>
      </div>
    </div>
  );
};

export default PublicDisplay;
