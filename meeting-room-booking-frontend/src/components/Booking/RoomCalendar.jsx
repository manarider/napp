import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RoomCalendar.css';

const RoomCalendar = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);

  useEffect(() => {
    fetchRoomData();
  }, [roomId]);

  useEffect(() => {
    if (room) {
      fetchMonthBookings();
    }
  }, [room, currentDate]);

  const fetchRoomData = async () => {
    try {
      const res = await api.get(`/rooms/${roomId}`);
      setRoom(res.data);
    } catch (err) {
      console.error('เกิดข้อผิดพลาด:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthBookings = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // ดึงการจองทั้งหมดของห้องนี้
      const res = await api.get('/bookings', {
        params: { roomId: roomId }
      });

      let data = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data.bookings) {
        data = res.data.bookings;
      }

      // กรองเฉพาะเดือนปัจจุบัน
      const monthBookings = data.filter(booking => {
        const bookingDate = new Date(booking.bookingDate);
        return bookingDate.getFullYear() === year && 
               bookingDate.getMonth() === month;
      });

      setBookings(monthBookings);
    } catch (err) {
      console.error('เกิดข้อผิดพลาด:', err);
    }
  };

  // สร้างปฏิทิน
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // เติมวันว่างก่อนวันที่ 1
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, type: 'empty' });
    }

    // เติมวันในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      
      const dayBookings = getBookingsForDay(day);
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();

      let type = 'available';
      if (isPast) {
        type = 'past';
      } else if (dayBookings.length >= 5) {
        type = 'full'; // มีการจอง 5 ช่วงเวลาขึ้นไป ถือว่าเต็ม
      } else if (dayBookings.length > 0) {
        type = 'partial';
      }

      days.push({
        day,
        date,
        type,
        isToday,
        bookingCount: dayBookings.length,
        bookings: dayBookings
      });
    }

    return days;
  };

  const getBookingsForDay = (day) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.bookingDate);
      return bookingDate.getDate() === day;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (dayData) => {
    if (dayData.type === 'empty' || dayData.type === 'past') return;
    setSelectedDay(dayData);
    setDayBookings(dayData.bookings);
  };

  const closeModal = () => {
    setSelectedDay(null);
    setDayBookings([]);
  };

  // สร้างช่วงเวลาทั้งหมด (08:00 - 18:00)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const isTimeSlotBooked = (slot) => {
    const [slotHour] = slot.split(':').map(Number);
    
    return dayBookings.some(booking => {
      const [startHour] = booking.startTime.split(':').map(Number);
      const [endHour] = booking.endTime.split(':').map(Number);
      return slotHour >= startHour && slotHour < endHour;
    });
  };

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  if (loading) return <div className="loading">🔄 กำลังโหลด...</div>;

  if (!room) {
    return (
      <div className="room-calendar-container">
        <div className="empty-state">
          <h3>ไม่พบห้องประชุม</h3>
          <button onClick={() => navigate('/bookings')} className="btn-back">
            ← กลับ
          </button>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendar();

  return (
    <div className="room-calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <div>
          <h1>📅 ปฏิทินห้องประชุม</h1>
          <div className="room-info-badge">
            <span>🏨</span>
            <div>
              <strong>{room.roomNumber} - {room.roomName}</strong>
              <small> | ความจุ {room.capacity} คน</small>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/bookings')} className="btn-back">
          ← กลับไปหน้าการจอง
        </button>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>ว่างทั้งวัน</span>
        </div>
        <div className="legend-item">
          <div className="legend-color partial"></div>
          <span>มีบางช่วงไม่ว่าง</span>
        </div>
        <div className="legend-item">
          <div className="legend-color full"></div>
          <span>ไม่ว่างเกือบทั้งวัน</span>
        </div>
        <div className="legend-item">
          <div className="legend-color past"></div>
          <span>วันที่ผ่านมาแล้ว</span>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="calendar-nav">
        <button onClick={handlePrevMonth} className="nav-btn">
          ◀ เดือนก่อน
        </button>
        <h2>{thaiMonths[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</h2>
        <button onClick={handleNextMonth} className="nav-btn">
          เดือนถัดไป ▶
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-wrapper">
        <div className="calendar-weekdays">
          {thaiDays.map((day, idx) => (
            <div key={idx} className="weekday">{day}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((dayData, idx) => (
            <div
              key={idx}
              className={`calendar-day ${dayData.type} ${dayData.isToday ? 'today' : ''}`}
              onClick={() => handleDayClick(dayData)}
            >
              {dayData.day && (
                <>
                  <div className="day-number">{dayData.day}</div>
                  {dayData.bookingCount > 0 && (
                    <>
                      <div className="booking-count">
                        📌 {dayData.bookingCount} การจอง
                      </div>
                      <div className="booking-indicator">
                        {Array(Math.min(dayData.bookingCount, 5)).fill(0).map((_, i) => (
                          <span key={i} className="booking-dot"></span>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="day-detail-overlay" onClick={closeModal}>
          <div className="day-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                📅 {selectedDay.day} {thaiMonths[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
              </h3>
              <button onClick={closeModal} className="btn-close">✕</button>
            </div>

            <div className="modal-body">
              {/* Time Slots */}
              <div className="time-slots-header">
                <h4>⏰ สถานะช่วงเวลา</h4>
                <p>เวลาทำการ 08:00 - 18:00 น.</p>
              </div>

              <div className="time-slots-grid">
                {generateTimeSlots().map((slot, idx) => (
                  <div
                    key={idx}
                    className={`time-slot-item ${isTimeSlotBooked(slot) ? 'booked' : 'available'}`}
                  >
                    {slot}
                    <br />
                    <small>{isTimeSlotBooked(slot) ? '❌ ไม่ว่าง' : '✅ ว่าง'}</small>
                  </div>
                ))}
              </div>

              {/* Bookings List */}
              <div className="bookings-list-section">
                <h4>📋 รายการจองในวันนี้ ({dayBookings.length} รายการ)</h4>
                
                {dayBookings.length === 0 ? (
                  <div className="no-bookings">
                    <div className="no-bookings-icon">✨</div>
                    <p>ไม่มีการจองในวันนี้ - ห้องว่างทั้งวัน!</p>
                  </div>
                ) : (
                  dayBookings
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((booking, idx) => (
                      <div key={idx} className="booking-item">
                        <div className="booking-time">
                          🕐 {booking.startTime} - {booking.endTime}
                        </div>
                        <div className="booking-info">
                          <span>👤 {booking.userId?.fullName || booking.fullName}</span>
                          <span>🏢 {booking.department}</span>
                          <span>📝 {booking.purpose}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCalendar;