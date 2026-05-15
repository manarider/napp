import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import axios from 'axios';
import './PublicDisplayBuilder.css';

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
function getApiBaseUrl() {
  const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return isProd ? '/napp/api' : 'http://localhost:5000/api';
}

// =======================================
// ค่าเริ่มต้น element
// =======================================
const DEFAULT_ELEMENTS = [
  {
    type: 'purpose',
    x: 100, y: 200,
    fontSize: 80, fontFamily: 'Sarabun', fontWeight: 'bold', fontStyle: 'normal',
    color: '#ffffff', borderColor: 'transparent', borderWidth: 0, borderRadius: 0,
    shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 8, shadowX: 2, shadowY: 2,
    padding: '12px 24px', backgroundColor: 'transparent', visible: true, customText: ''
  },
  {
    type: 'date',
    x: 100, y: 380,
    fontSize: 56, fontFamily: 'Sarabun', fontWeight: 'normal', fontStyle: 'normal',
    color: '#f0c040', borderColor: 'transparent', borderWidth: 0, borderRadius: 0,
    shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 4, shadowX: 1, shadowY: 1,
    padding: '8px 16px', backgroundColor: 'transparent', visible: true, customText: ''
  },
  {
    type: 'time',
    x: 100, y: 500,
    fontSize: 56, fontFamily: 'Sarabun', fontWeight: 'normal', fontStyle: 'normal',
    color: '#7ecfff', borderColor: 'transparent', borderWidth: 0, borderRadius: 0,
    shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 4, shadowX: 1, shadowY: 1,
    padding: '8px 16px', backgroundColor: 'transparent', visible: true, customText: ''
  }
];

const ELEMENT_LABELS = { purpose: '📋 หัวข้อการประชุม', date: '📅 วันที่', time: '🕐 เวลา' };
const FONT_FAMILIES = [
  'Sarabun', 'Kanit', 'Prompt', 'Noto Sans Thai', 'Mitr',
  'Chulabhorn Likit', 'Arial', 'Georgia', 'Tahoma', 'Verdana'
];

const PREVIEW_SCALE = 0.35; // ขนาด preview เทียบกับจริง

// =======================================
// Main Component
// =======================================
const PublicDisplayBuilder = () => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [config, setConfig] = useState({
    width: 1920,
    height: 1080,
    backgroundColor: '#1a1a2e',
    backgroundImage: null,
    backgroundVideo: null,
    backgroundMediaType: null,
    elements: DEFAULT_ELEMENTS.map(e => ({ ...e }))
  });
  const [selectedElementIdx, setSelectedElementIdx] = useState(null);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dragging, setDragging] = useState(null); // { idx, startX, startY, origX, origY }
  const previewRef = useRef(null);

  // โหลดรายการห้อง
  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/display/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // โหลด config + ข้อมูลการจองจริง + media library
  const loadRoomConfig = async (room) => {
    setLoading(true);
    setSelectedRoom(room);
    setSelectedElementIdx(null);
    setBookingData(null);
    setMediaLibrary([]);
    try {
      const [configRes, displayRes, mediaRes] = await Promise.all([
        api.get(`/display/config/${room.id}`),
        axios.get(`${getApiBaseUrl()}/display/room/${room.id}`),
        api.get(`/display/media/${room.id}`)
      ]);
      if (configRes.data.config) {
        setConfig({
          width: configRes.data.config.width || 1920,
          height: configRes.data.config.height || 1080,
          backgroundColor: configRes.data.config.backgroundColor || '#1a1a2e',
          backgroundImage: configRes.data.config.backgroundImage || null,
          backgroundVideo: configRes.data.config.backgroundVideo || null,
          backgroundMediaType: configRes.data.config.backgroundMediaType || null,
          elements: configRes.data.config.elements || DEFAULT_ELEMENTS.map(e => ({ ...e }))
        });
      } else {
        setConfig({
          width: 1920, height: 1080,
          backgroundColor: '#1a1a2e',
          backgroundImage: null, backgroundVideo: null, backgroundMediaType: null,
          elements: DEFAULT_ELEMENTS.map(e => ({ ...e }))
        });
      }
      setBookingData(displayRes.data.booking || null);
      setMediaLibrary(mediaRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // อัพโหลด media ไปยัง server
  const handleMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedRoom) return;
    setUploadingMedia(true);
    try {
      for (const file of files) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => resolve(ev.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await api.post(`/display/media/${selectedRoom.id}`, {
          name: file.name,
          mimeType: file.type,
          data: base64
        });
      }
      // โหลด media library ใหม่
      const res = await api.get(`/display/media/${selectedRoom.id}`);
      setMediaLibrary(res.data || []);
    } catch (err) {
      setSaveMsg('❌ อัพโหลดไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setSaveMsg(''), 4000);
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  // เลือก media เป็น active background
  const setActiveMedia = (media) => {
    if (media.mediaType === 'video') {
      updateConfig('backgroundVideo', media.url);
      updateConfig('backgroundImage', null);
      updateConfig('backgroundMediaType', 'video');
    } else {
      updateConfig('backgroundImage', media.url);
      updateConfig('backgroundVideo', null);
      updateConfig('backgroundMediaType', 'image');
    }
  };

  // ล้างพื้นหลัง
  const clearBackground = () => {
    updateConfig('backgroundImage', null);
    updateConfig('backgroundVideo', null);
    updateConfig('backgroundMediaType', null);
  };

  // ลบ media
  const deleteMedia = async (mediaId) => {
    if (!window.confirm('ต้องการลบไฟล์นี้?')) return;
    try {
      await api.delete(`/display/media/${mediaId}`);
      const res = await api.get(`/display/media/${selectedRoom.id}`);
      setMediaLibrary(res.data || []);
      // ถ้า active media ถูกลบ ให้ล้าง background
      const deleted = mediaLibrary.find(m => m.id === mediaId);
      if (deleted) {
        if (deleted.mediaType === 'video' && config.backgroundVideo === deleted.url) clearBackground();
        if (deleted.mediaType === 'image' && config.backgroundImage === deleted.url) clearBackground();
      }
    } catch (err) {
      setSaveMsg('❌ ลบไม่สำเร็จ: ' + (err.response?.data?.error || err.message));
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  // ข้อความที่แสดงใน preview ตามข้อมูลจริง
  const getPreviewText = (type) => {
    const el = config.elements.find(e => e.type === type);
    if (el?.customText) return el.customText;
    if (!bookingData) {
      if (type === 'purpose') return 'ยังไม่มีการจองใช้ห้องประชุมในขณะนี้';
      return '';
    }
    if (type === 'purpose') return bookingData.purpose || '-';
    if (type === 'date') {
      if (bookingData.isMultiDay) {
        return `${toThaiDate(bookingData.startDate)} - ${toThaiDate(bookingData.endDate)}`;
      }
      return toThaiDate(bookingData.bookingDate);
    }
    if (type === 'time') return `${bookingData.startTime} - ${bookingData.endTime}`;
    return '';
  };

  // บันทึก config
  const handleSave = async () => {
    if (!selectedRoom) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put(`/display/config/${selectedRoom.id}`, config);
      setSaveMsg('✅ บันทึกสำเร็จ');
      fetchRooms();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg('❌ เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // อัพเดต config ทั่วไป
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // อัพเดต element
  const updateElement = (idx, key, value) => {
    setConfig(prev => {
      const elements = [...prev.elements];
      elements[idx] = { ...elements[idx], [key]: value };
      return { ...prev, elements };
    });
  };

  // ลบรูปพื้นหลัง (legacy - เก็บไว้สำหรับ backward compat)
  const removeBgImage = () => clearBackground;

  // === Drag handlers ===
  const handleMouseDown = useCallback((e, idx) => {
    e.preventDefault();
    e.stopPropagation();
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const rect = previewEl.getBoundingClientRect();
    const scale = rect.width / config.width;

    setDragging({
      idx,
      startX: e.clientX,
      startY: e.clientY,
      origX: config.elements[idx].x,
      origY: config.elements[idx].y,
      scale
    });
    setSelectedElementIdx(idx);
  }, [config]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      const dx = (e.clientX - dragging.startX) / dragging.scale;
      const dy = (e.clientY - dragging.startY) / dragging.scale;
      const newX = Math.max(0, dragging.origX + dx);
      const newY = Math.max(0, dragging.origY + dy);
      updateElement(dragging.idx, 'x', Math.round(newX));
      updateElement(dragging.idx, 'y', Math.round(newY));
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // คำนวณ style ของ element บน preview
  const getElementStyle = (el, isSelected) => {
    const shadow = el.shadowBlur > 0
      ? `${el.shadowX}px ${el.shadowY}px ${el.shadowBlur}px ${el.shadowColor}`
      : 'none';
    return {
      position: 'absolute',
      left: `${el.x * PREVIEW_SCALE}px`,
      top: `${el.y * PREVIEW_SCALE}px`,
      fontSize: `${el.fontSize * PREVIEW_SCALE}px`,
      fontFamily: el.fontFamily,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      color: el.color,
      border: `${el.borderWidth}px solid ${el.borderColor}`,
      borderRadius: `${el.borderRadius}px`,
      textShadow: shadow,
      padding: el.padding,
      backgroundColor: el.backgroundColor,
      cursor: 'grab',
      userSelect: 'none',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      maxWidth: `${(config.width - el.x - 20) * PREVIEW_SCALE}px`,
      outline: isSelected ? '2px dashed #00bcd4' : 'none',
      outlineOffset: '2px',
      display: el.visible ? 'block' : 'none',
      boxSizing: 'border-box'
    };
  };

  const selectedEl = selectedElementIdx !== null ? config.elements[selectedElementIdx] : null;

  // URL สำหรับ public display (ต้องมี /napp/ prefix เพราะ app อยู่ที่ /napp/)
  const getPublicUrl = (roomId) => {
    return `${window.location.origin}/napp/display/room/${roomId}`;
  };

  return (
    <div className="pdb-container">
      <div className="pdb-header">
        <h2>🖥️ สร้างหน้าจอแสดงผลสาธารณะ</h2>
        <p className="pdb-subtitle">ออกแบบหน้าจอแสดงข้อมูลการจองสำหรับป้ายประกาศหน้าห้องประชุม</p>
      </div>

      <div className="pdb-layout">
        {/* ===================== LEFT: Room List ===================== */}
        <div className="pdb-sidebar">
          <h3>ห้องประชุม</h3>
          <div className="pdb-room-list">
            {rooms.map(room => (
              <div
                key={room.id}
                className={`pdb-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => loadRoomConfig(room)}
              >
                <div className="pdb-room-name">🏨 {room.roomName}</div>
                <div className="pdb-room-number">ห้อง {room.roomNumber}</div>
                {room.hasConfig && <span className="pdb-configured-badge">✓ ตั้งค่าแล้ว</span>}
              </div>
            ))}
          </div>

          {selectedRoom && (
            <div className="pdb-public-link">
              <h4>🔗 Link สาธารณะ</h4>
              <div className="pdb-link-box">
                <a
                  href={getPublicUrl(selectedRoom.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pdb-link"
                >
                  {getPublicUrl(selectedRoom.id)}
                </a>
                <button
                  className="pdb-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(getPublicUrl(selectedRoom.id));
                    setSaveMsg('📋 คัดลอก Link แล้ว');
                    setTimeout(() => setSaveMsg(''), 2000);
                  }}
                >
                  คัดลอก
                </button>
              </div>
              <p className="pdb-link-note">Link นี้จะแสดงข้อมูลการจองล่าสุดของห้องนี้เสมอ</p>
            </div>
          )}
        </div>

        {/* ===================== CENTER: Preview ===================== */}
        <div className="pdb-main">
          {!selectedRoom ? (
            <div className="pdb-no-room">
              <div className="pdb-no-room-icon">🏨</div>
              <p>เลือกห้องประชุมจากรายการด้านซ้าย</p>
            </div>
          ) : loading ? (
            <div className="pdb-loading">กำลังโหลด...</div>
          ) : (
            <>
              <div className="pdb-preview-header">
                <h3>ตัวอย่าง: {selectedRoom.roomName}</h3>
                <div className="pdb-preview-hint">💡 ลากข้อความเพื่อเปลี่ยนตำแหน่ง • คลิกเพื่อเลือกและแก้ไข</div>
              </div>

              {/* Preview Canvas */}
              <div className="pdb-preview-wrapper">
                <div
                  ref={previewRef}
                  className="pdb-preview-canvas"
                  style={{
                    width: `${config.width * PREVIEW_SCALE}px`,
                    height: `${config.height * PREVIEW_SCALE}px`,
                    backgroundColor: config.backgroundColor,
                    backgroundImage: (config.backgroundMediaType === 'image' && config.backgroundImage)
                      ? `url(${config.backgroundImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'default'
                  }}
                  onClick={(e) => {
                    if (e.target === previewRef.current) setSelectedElementIdx(null);
                  }}
                >
                  {/* Video background */}
                  {config.backgroundMediaType === 'video' && config.backgroundVideo && (
                    <video
                      key={config.backgroundVideo}
                      autoPlay loop muted playsInline
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover', zIndex: 0, pointerEvents: 'none'
                      }}
                    >
                      <source src={config.backgroundVideo} />
                    </video>
                  )}
                  {config.elements.map((el, idx) => (
                    <div
                      key={el.type}
                      style={{ ...getElementStyle(el, selectedElementIdx === idx), zIndex: 1 }}
                      onMouseDown={(e) => handleMouseDown(e, idx)}
                    >
                      {getPreviewText(el.type)}
                    </div>
                  ))}
                  {/* ขนาด label */}
                  <div className="pdb-size-label" style={{ zIndex: 2 }}>
                    {config.width} × {config.height} px
                  </div>
                </div>
              </div>

              <div className="pdb-action-bar">
                <button
                  className="pdb-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
                </button>
                {saveMsg && <span className="pdb-save-msg">{saveMsg}</span>}
              </div>
            </>
          )}
        </div>

        {/* ===================== RIGHT: Settings Panel ===================== */}
        {selectedRoom && !loading && (
          <div className="pdb-settings-panel">
            {/* === Canvas Settings === */}
            <div className="pdb-settings-section">
              <h4>⚙️ ขนาดหน้าจอ</h4>
              <div className="pdb-field">
                <label>กว้าง (px)</label>
                <input
                  type="number" min="400" max="7680"
                  value={config.width}
                  onChange={e => updateConfig('width', parseInt(e.target.value) || 1920)}
                />
              </div>
              <div className="pdb-field">
                <label>สูง (px)</label>
                <input
                  type="number" min="300" max="4320"
                  value={config.height}
                  onChange={e => updateConfig('height', parseInt(e.target.value) || 1080)}
                />
              </div>
              <div className="pdb-preset-btns">
                <button onClick={() => { updateConfig('width', 1920); updateConfig('height', 1080); }}>1920×1080</button>
                <button onClick={() => { updateConfig('width', 1280); updateConfig('height', 720); }}>1280×720</button>
                <button onClick={() => { updateConfig('width', 3840); updateConfig('height', 2160); }}>4K</button>
                <button onClick={() => { updateConfig('width', 1080); updateConfig('height', 1920); }}>Portrait</button>
              </div>
            </div>

            <div className="pdb-settings-section">
              <h4>🎨 พื้นหลัง</h4>
              <div className="pdb-field">
                <label>สีพื้นหลัง</label>
                <div className="pdb-color-row">
                  <input
                    type="color"
                    value={config.backgroundColor || '#1a1a2e'}
                    onChange={e => updateConfig('backgroundColor', e.target.value)}
                  />
                  <span>{config.backgroundColor}</span>
                </div>
              </div>

              {/* Media Library */}
              <div className="pdb-field">
                <label>🎞️ คลังสื่อพื้นหลัง</label>
                <label className={`pdb-upload-btn ${uploadingMedia ? 'disabled' : ''}`}>
                  {uploadingMedia ? '⏳ กำลังอัพโหลด...' : '➕ เพิ่มภาพ/วีดิโอ'}
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/mp4,video/webm,.gif"
                    onChange={handleMediaUpload}
                    disabled={uploadingMedia}
                    style={{ display: 'none' }}
                  />
                </label>
                <span className="pdb-field-hint">รองรับ JPG, PNG, GIF, WebP, MP4, WebM (สูงสุด 37MB/ไฟล์)</span>

                {mediaLibrary.length > 0 && (
                  <div className="pdb-media-grid">
                    {mediaLibrary.map(media => {
                      const isActive = media.mediaType === 'video'
                        ? config.backgroundVideo === media.url
                        : config.backgroundImage === media.url;
                      return (
                        <div
                          key={media.id}
                          className={`pdb-media-item ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveMedia(media)}
                          title={media.name}
                        >
                          {media.mediaType === 'video' ? (
                            <div className="pdb-media-thumb pdb-media-video">
                              <video src={media.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <span className="pdb-media-type-badge">▶</span>
                            </div>
                          ) : (
                            <img src={media.url} alt={media.name} className="pdb-media-thumb" />
                          )}
                          {isActive && <span className="pdb-media-active-badge">✓</span>}
                          <button
                            className="pdb-media-delete"
                            onClick={(e) => { e.stopPropagation(); deleteMedia(media.id); }}
                            title="ลบ"
                          >✕</button>
                          <div className="pdb-media-name">{media.name}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(config.backgroundImage || config.backgroundVideo) && (
                  <button className="pdb-remove-btn" onClick={clearBackground} style={{ marginTop: '8px' }}>
                    ✕ ไม่ใช้พื้นหลัง
                  </button>
                )}
              </div>
            </div>

            {/* === Element Settings === */}
            <div className="pdb-settings-section">
              <h4>✏️ ตั้งค่าข้อความ</h4>
              <div className="pdb-element-tabs">
                {config.elements.map((el, idx) => (
                  <button
                    key={el.type}
                    className={`pdb-el-tab ${selectedElementIdx === idx ? 'active' : ''}`}
                    onClick={() => setSelectedElementIdx(idx)}
                  >
                    {ELEMENT_LABELS[el.type].split(' ')[0]}
                  </button>
                ))}
              </div>

              {selectedEl && (
                <div className="pdb-element-settings">
                  <div className="pdb-el-title">{ELEMENT_LABELS[selectedEl.type]}</div>

                  {/* แก้ไขข้อความ */}
                  <div className="pdb-field">
                    <label>ข้อความที่แสดง</label>
                    <textarea
                      className="pdb-custom-text"
                      rows={3}
                      placeholder={`(ค่าอัตโนมัติจากการจอง)`}
                      value={selectedEl.customText || ''}
                      onChange={e => updateElement(selectedElementIdx, 'customText', e.target.value)}
                    />
                    {selectedEl.customText && (
                      <button
                        className="pdb-transparent-btn"
                        onClick={() => updateElement(selectedElementIdx, 'customText', '')}
                      >
                        ↩ ใช้ข้อมูลอัตโนมัติ
                      </button>
                    )}
                    <span className="pdb-field-hint">ปล่อยว่างเพื่อแสดงข้อมูลจากการจองอัตโนมัติ</span>
                  </div>

                  <div className="pdb-divider" />

                  <div className="pdb-field-row">
                    <div className="pdb-field">
                      <label>X (px)</label>
                      <input type="number" value={selectedEl.x}
                        onChange={e => updateElement(selectedElementIdx, 'x', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="pdb-field">
                      <label>Y (px)</label>
                      <input type="number" value={selectedEl.y}
                        onChange={e => updateElement(selectedElementIdx, 'y', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>

                  <div className="pdb-field">
                    <label>ขนาดตัวอักษร (px)</label>
                    <input type="range" min="12" max="300" value={selectedEl.fontSize}
                      onChange={e => updateElement(selectedElementIdx, 'fontSize', parseInt(e.target.value))} />
                    <span className="pdb-range-val">{selectedEl.fontSize}px</span>
                  </div>

                  <div className="pdb-field">
                    <label>รูปแบบตัวอักษร</label>
                    <select value={selectedEl.fontFamily}
                      onChange={e => updateElement(selectedElementIdx, 'fontFamily', e.target.value)}>
                      {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div className="pdb-field-row">
                    <div className="pdb-field">
                      <label>น้ำหนัก</label>
                      <select value={selectedEl.fontWeight}
                        onChange={e => updateElement(selectedElementIdx, 'fontWeight', e.target.value)}>
                        <option value="normal">ปกติ</option>
                        <option value="bold">หนา</option>
                        <option value="300">บาง (300)</option>
                        <option value="500">กลาง (500)</option>
                        <option value="700">หนา (700)</option>
                        <option value="900">หนามาก (900)</option>
                      </select>
                    </div>
                    <div className="pdb-field">
                      <label>ลีลา</label>
                      <select value={selectedEl.fontStyle}
                        onChange={e => updateElement(selectedElementIdx, 'fontStyle', e.target.value)}>
                        <option value="normal">ปกติ</option>
                        <option value="italic">เอียง</option>
                      </select>
                    </div>
                  </div>

                  <div className="pdb-field">
                    <label>สีตัวอักษร</label>
                    <div className="pdb-color-row">
                      <input type="color" value={selectedEl.color}
                        onChange={e => updateElement(selectedElementIdx, 'color', e.target.value)} />
                      <span>{selectedEl.color}</span>
                    </div>
                  </div>

                  <div className="pdb-field">
                    <label>สีพื้นหลังข้อความ</label>
                    <div className="pdb-color-row">
                      <input type="color"
                        value={selectedEl.backgroundColor === 'transparent' ? '#000000' : selectedEl.backgroundColor}
                        onChange={e => updateElement(selectedElementIdx, 'backgroundColor', e.target.value)} />
                      <button
                        className="pdb-transparent-btn"
                        onClick={() => updateElement(selectedElementIdx, 'backgroundColor', 'transparent')}
                      >
                        ใส
                      </button>
                    </div>
                  </div>

                  <div className="pdb-divider" />

                  <div className="pdb-field-row">
                    <div className="pdb-field">
                      <label>เส้นขอบ (px)</label>
                      <input type="number" min="0" max="20" value={selectedEl.borderWidth}
                        onChange={e => updateElement(selectedElementIdx, 'borderWidth', parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="pdb-field">
                      <label>มุมโค้ง (px)</label>
                      <input type="number" min="0" max="100" value={selectedEl.borderRadius}
                        onChange={e => updateElement(selectedElementIdx, 'borderRadius', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>

                  {selectedEl.borderWidth > 0 && (
                    <div className="pdb-field">
                      <label>สีเส้นขอบ</label>
                      <div className="pdb-color-row">
                        <input type="color"
                          value={selectedEl.borderColor === 'transparent' ? '#ffffff' : selectedEl.borderColor}
                          onChange={e => updateElement(selectedElementIdx, 'borderColor', e.target.value)} />
                        <span>{selectedEl.borderColor}</span>
                      </div>
                    </div>
                  )}

                  <div className="pdb-divider" />

                  <div className="pdb-field">
                    <label>เงา (blur px)</label>
                    <input type="range" min="0" max="40" value={selectedEl.shadowBlur}
                      onChange={e => updateElement(selectedElementIdx, 'shadowBlur', parseInt(e.target.value))} />
                    <span className="pdb-range-val">{selectedEl.shadowBlur}px</span>
                  </div>

                  {selectedEl.shadowBlur > 0 && (
                    <>
                      <div className="pdb-field-row">
                        <div className="pdb-field">
                          <label>เงา X</label>
                          <input type="number" min="-20" max="20" value={selectedEl.shadowX}
                            onChange={e => updateElement(selectedElementIdx, 'shadowX', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="pdb-field">
                          <label>เงา Y</label>
                          <input type="number" min="-20" max="20" value={selectedEl.shadowY}
                            onChange={e => updateElement(selectedElementIdx, 'shadowY', parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="pdb-field">
                        <label>สีเงา</label>
                        <div className="pdb-color-row">
                          <input type="color"
                            value={selectedEl.shadowColor.startsWith('rgba') ? '#000000' : selectedEl.shadowColor}
                            onChange={e => updateElement(selectedElementIdx, 'shadowColor', e.target.value)} />
                          <span>{selectedEl.shadowColor}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pdb-divider" />

                  <div className="pdb-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedEl.visible}
                        onChange={e => updateElement(selectedElementIdx, 'visible', e.target.checked)}
                        style={{ marginRight: '6px' }}
                      />
                      แสดงข้อความนี้
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicDisplayBuilder;
