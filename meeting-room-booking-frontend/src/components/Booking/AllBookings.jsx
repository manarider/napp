import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Booking.css';

const AllBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    date: '',
    status: '',
    room: ''
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookings');
      
      let data = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data.bookings && Array.isArray(res.data.bookings)) {
        data = res.data.bookings;
      }
      
      setBookings(data);
      setFilteredBookings(data);
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err);
      setBookings([]);
      setFilteredBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!Array.isArray(bookings)) {
      setFilteredBookings([]);
      return;
    }

    let filtered = [...bookings];

    if (filter.date) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.bookingDate).toISOString().split('T')[0];
        return bookingDate === filter.date;
      });
    }

    if (filter.status) {
      filtered = filtered.filter(booking => booking.status === filter.status);
    }

    if (filter.room) {
      filtered = filtered.filter(booking => 
        booking.roomId?.roomName?.toLowerCase().includes(filter.room.toLowerCase()) ||
        booking.roomId?.roomNumber?.toLowerCase().includes(filter.room.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  const handleFilterChange = (e) => {
    setFilter({
      ...filter,
      [e.target.name]: e.target.value
    });
  };

  const handleClearFilters = () => {
    setFilter({
      date: '',
      status: '',
      room: ''
    });
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'approved': return 'status-badge approved';
      case 'pending': return 'status-badge pending';
      case 'rejected': return 'status-badge rejected';
      default: return 'status-badge';
    }
  };

  if (loading) return <div className="loading">🔄 กำลังโหลด...</div>;

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h1>📋 การจองทั้งหมด</h1>
        <p className="subtitle">ดูการจองห้องประชุมทั้งหมด</p>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="date-filter">📅 ค้นหาตามวันที่:</label>
          <input
            id="date-filter"
            type="date"
            name="date"
            value={filter.date}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">🏷️ ค้นหาตามสถานะ:</label>
          <select 
            id="status-filter"
            name="status" 
            value={filter.status} 
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="pending">⏳ รออนุมัติ</option>
            <option value="approved">✅ อนุมัติแล้ว</option>
            <option value="rejected">❌ ปฏิเสธ</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="room-filter">🏨 ค้นหาตามห้อง:</label>
          <input
            id="room-filter"
            type="text"
            name="room"
            value={filter.room}
            onChange={handleFilterChange}
            placeholder="ค้นหาชื่อห้องหรือหมายเลข..."
            className="filter-input"
          />
        </div>

        {(filter.date || filter.status || filter.room) && (
          <button onClick={handleClearFilters} className="btn-clear-filter">
            🔄 ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="results-info">
        <p>
          แสดง <strong>{filteredBookings.length}</strong> จาก <strong>{bookings.length}</strong> การจอง
        </p>
      </div>

      {/* Bookings Table */}
      {!Array.isArray(filteredBookings) || filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔭</div>
          <h3>ไม่พบการจอง</h3>
          <p>ลองปรับตัวกรองหรือกลับมาดูใหม่ภายหลัง</p>
          {(filter.date || filter.status || filter.room) && (
            <button onClick={handleClearFilters} className="btn-secondary">
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
      ) : (
        <div className="bookings-table-wrapper">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>ห้อง</th>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>ผู้ใช้</th>
                <th>สังกัด/กอง</th>
                <th>หัวข้อการประชุม</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking._id}>
                  <td data-label="ห้อง">
                    <div 
                      className="room-info room-link"
                      onClick={() => navigate(`/rooms/${booking.roomId?._id}/calendar`)}
                      title="คลิกเพื่อดูปฏิทินห้องนี้"
                    >
                      <strong>{booking.roomId?.roomNumber || '-'}</strong>
                      <small>{booking.roomId?.roomName || 'ไม่มีข้อมูล'}</small>
                      <span className="view-calendar-hint">📅 ดูปฏิทิน</span>
                    </div>
                  </td>
                  <td data-label="วันที่">
                    <div className="date-info">
                      <strong>{new Date(booking.bookingDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</strong>
                    </div>
                  </td>
                  <td data-label="เวลา">
                    <div className="time-slot">
                      {booking.startTime} - {booking.endTime}
                    </div>
                  </td>
                  <td data-label="ผู้ใช้">
                    <div className="user-info">
                      <strong>{booking.userId?.fullName || 'ไม่มีข้อมูลผู้ใช้'}</strong>
                      <small>{booking.userId?.email || '-'}</small>
                    </div>
                  </td>
                  <td data-label="สังกัด/กอง">{booking.department || '-'}</td>
                  <td data-label="หัวข้อการประชุม">
                    <div className="purpose-cell" title={booking.purpose}>
                      {booking.purpose?.length > 50 
                        ? booking.purpose.substring(0, 50) + '...' 
                        : booking.purpose || '-'}
                    </div>
                  </td>
                  <td data-label="สถานะ">
                    <span className={getStatusBadgeClass(booking.status)}>
                      {booking.status === 'pending' && '⏳ รออนุมัติ'}
                      {booking.status === 'approved' && '✅ อนุมัติแล้ว'}
                      {booking.status === 'rejected' && '❌ ปฏิเสธ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllBookings;