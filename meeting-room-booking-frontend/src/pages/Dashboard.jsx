import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูลห้องประชุม
        const roomsRes = await api.get('/rooms');
        setRooms(roomsRes.data.rooms || roomsRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) return <div className="loading">กำลังโหลด...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 หน้าหลัก</h1>
        <p className="welcome-text">ยินดีต้อนรับกลับมา, <strong>{user?.fullName}</strong>! 👋</p>
      </div>

      {/* Quick Actions Section */}
      <div className="quick-actions-section">
        <h2>ยินดีต้อนรับ</h2>
        <div className="quick-actions">
          <button 
            onClick={() => navigate('/bookings/my-bookings')} 
            className="action-btn primary"
          >
            <span className="btn-icon">📋</span>
            <div className="btn-content">
              <strong>การจองของคุณ</strong>
              <small>เริ่มจอง</small>
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/bookings')} 
            className="action-btn secondary"
          >
            <span className="btn-icon">📅</span>
            <div className="btn-content">
              <strong>ตารางการจองห้องทั้งหมด</strong>
              <small>ดูการจองห้องทั้งหมด</small>
            </div>
          </button>

          {user?.role === 'admin' && (
            <button 
              onClick={() => navigate('/admin')} 
              className="action-btn admin"
            >
              <span className="btn-icon">👨‍💼</span>
              <div className="btn-content">
                <strong>เมนูแอดมิน</strong>
                <small>จัดการการตั้งค่าระบบ</small>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Rooms Section - แสดงห้องประชุมทั้งหมด */}
      <div className="rooms-section">
        <h2>🏨 ปฏิทินการจองห้องประชุม</h2>
        <p className="section-subtitle">เลือกห้องเพื่อดูปฏิทินและรายละเอียดการจอง</p>
        
        {loading ? (
          <div className="loading">กำลังโหลดข้อมูลห้อง...</div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <p>ไม่พบห้องประชุม</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room._id} className="room-card">
                <div className="room-card-header">
                  <h3>🏢 {room.roomNumber}</h3>
                  <span className="room-capacity">👥 {room.capacity} คน</span>
                </div>
                <div className="room-card-body">
                  <p className="room-name">{room.roomName}</p>
                  {room.equipment && room.equipment.length > 0 && (
                    <p className="room-equipment">🎯 {room.equipment.join(', ')}</p>
                  )}
                </div>
                <div className="room-card-actions">
                  <button
                    onClick={() => navigate(`/rooms/${room._id}/calendar`)}
                    className="btn-view-calendar"
                  >
                    📅 ดูปฏิทินการจอง
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Section (Non-Admin) */}
      {user?.role !== 'admin' && (
        <div className="user-info-section">
          <h2>ℹ️ ข้อมูลของคุณ</h2>
          <div className="info-card">
            <p><strong>ชื่อ:</strong> {user?.fullName}</p>
            <p><strong>อีเมล:</strong> {user?.email}</p>
            <p><strong>สังกัด/กอง:</strong> {user?.department}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;