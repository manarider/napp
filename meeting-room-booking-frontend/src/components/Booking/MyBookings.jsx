import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import BookingForm from './BookingForm';
import './Booking.css';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my-bookings');
      setBookings(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่?')) {
      try {
        await api.delete(`/bookings/${id}`);
        setBookings(bookings.filter((b) => b._id !== id));
        alert('✅ ลบการจองแล้ว');
      } catch (err) {
        alert('❌ ' + (err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบ'));
      }
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    fetchBookings();
  };

  if (loading) return <div className="loading">กำลังโหลด...</div>;

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h1>📅 รายการการจองของคุณ</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowForm(true)} className="btn-new">
            ➕ จองห้องประชุม (1 วัน)
          </button>
          <button onClick={() => navigate('/bookings/multi-day')} className="btn-new" style={{ backgroundColor: '#10b981' }}>
            📅 จองหลายวัน
          </button>
        </div>
      </div>

      {showForm && (
        <BookingForm
          bookingId={editingId}
          onClose={handleCloseForm}
        />
      )}

      {error && <div className="error-message">{error}</div>}

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>ยังไม่มีการจอง</p>
          <button onClick={() => setShowForm(true)} className="btn-new">
            เริ่มจองห้องประชุม
          </button>
        </div>
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-header">
                <h3>🏨 {booking.roomId.roomName}</h3>
                <span className={`status ${booking.status}`}>
                  {booking.status === 'pending' && 'รออนุมัติ'}
                  {booking.status === 'approved' && 'อนุมัติแล้ว'}
                  {booking.status === 'rejected' && 'ปฏิเสธ'}
                </span>
              </div>

              <div className="booking-details">
                <p><strong>🏢 ห้อง:</strong> {booking.roomId.roomNumber}</p>
                <p><strong>📅 วันที่:</strong> {new Date(booking.bookingDate).toLocaleDateString('th-TH')}</p>
                <p><strong>⏰ เวลา:</strong> {booking.startTime} - {booking.endTime}</p>
                <p><strong>📝 วัตถุประสงค์:</strong> {booking.purpose}</p>
                <p><strong>🏢 สังกัด/กอง:</strong> {booking.department}</p>
              </div>

              <div className="booking-actions">
                <button
                  onClick={() => {
                    setEditingId(booking._id);
                    setShowForm(true);
                  }}
                  className="btn-edit"
                >
                  ✏️ แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(booking._id)}
                  className="btn-delete"
                >
                  🗑️ ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;