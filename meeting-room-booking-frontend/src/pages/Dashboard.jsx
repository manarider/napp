import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/admin/dashboard/statistics')
        .then((res) => setStats(res.data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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

      {/* Admin Statistics */}
      {user?.role === 'admin' && stats && (
        <div className="stats-section">
          <h2>📈 ภาพรวมระบบ</h2>
          <div className="stats-grid">
            <div className="stat-card users">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>ผู้ใช้ทั้งหมด</h3>
                <p className="stat-number">{stats.users.total}</p>
                <small>ผู้ใช้งานในระบบ</small>
              </div>
            </div>

            <div className="stat-card rooms">
              <div className="stat-icon">🏨</div>
              <div className="stat-content">
                <h3>ห้องประชุม</h3>
                <p className="stat-number">{stats.rooms.total}</p>
                <small>ห้องที่พร้อมใช้งาน</small>
              </div>
            </div>

            <div className="stat-card bookings">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <h3>การจองทั้งหมด</h3>
                <p className="stat-number">{stats.bookings.total}</p>
                <small>การจองตลอดเวลา</small>
              </div>
            </div>

            <div className="stat-card pending">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>รออนุมัติ</h3>
                <p className="stat-number">{stats.bookings.pending}</p>
                <small>รอการอนุมัติ</small>
              </div>
            </div>

            <div className="stat-card approved">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>อนุมัติแล้ว</h3>
                <p className="stat-number">{stats.bookings.approved}</p>
                <small>การจองที่ได้รับการยืนยัน</small>
              </div>
            </div>
          </div>
        </div>
      )}

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