import { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    roomName: '',
    capacity: '',
    facilities: ''
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      setRooms(res.data);
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลห้อง:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        capacity: parseInt(formData.capacity),
        facilities: formData.facilities.split(',').map(f => f.trim()).filter(f => f)
      };

      if (editingRoom) {
        await api.put(`/rooms/${editingRoom._id}`, submitData);
        alert('✅ อัปเดตห้องประชุมเรียบร้อยแล้ว');
      } else {
        await api.post('/rooms', submitData);
        alert('✅ สร้างห้องประชุมเรียบร้อยแล้ว');
      }

      resetForm();
      fetchRooms();
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      capacity: room.capacity.toString(),
      facilities: room.facilities.join(', ')
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบห้องนี้?')) {
      try {
        await api.delete(`/rooms/${id}`);
        alert('✅ ลบห้องประชุมเรียบร้อยแล้ว');
        fetchRooms();
      } catch (err) {
        alert('❌ เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      roomNumber: '',
      roomName: '',
      capacity: '',
      facilities: ''
    });
    setEditingRoom(null);
    setShowForm(false);
  };

  if (loading) return <div className="loading">กำลังโหลด...</div>;

  return (
    <div className="room-management">
      <div className="management-header">
        <h2>🏨 จัดการห้องประชุม</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-new">
            ➕ เพิ่มห้องใหม่
          </button>
        )}
      </div>

      {showForm && (
        <div className="room-form-card">
          <h3>{editingRoom ? '✏️ แก้ไขห้อง' : '➕ เพิ่มห้องใหม่'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>หมายเลขห้อง: *</label>
                <input
                  type="text"
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  required
                  placeholder="เช่น 201"
                />
              </div>

              <div className="form-group">
                <label>ชื่อห้อง: *</label>
                <input
                  type="text"
                  name="roomName"
                  value={formData.roomName}
                  onChange={handleChange}
                  required
                  placeholder="เช่น ห้องประชุม A"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ความจุ (คน): *</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="เช่น 10"
                />
              </div>

              <div className="form-group">
                <label>สิ่งอำนวยความสะดวก (คั่นด้วยเครื่องหมายจุลภาค):</label>
                <input
                  type="text"
                  name="facilities"
                  value={formData.facilities}
                  onChange={handleChange}
                  placeholder="เช่น โปรเจคเตอร์, กระดานไวท์บอร์ด, ทีวี"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingRoom ? 'อัปเดตห้อง' : 'สร้างห้อง'}
              </button>
              <button type="button" onClick={resetForm} className="btn-cancel">
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rooms-grid">
        {rooms.length === 0 ? (
          <div className="empty-state">
            <p>ไม่พบห้องประชุม</p>
            <button onClick={() => setShowForm(true)} className="btn-new">
              เพิ่มห้องแรก
            </button>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room._id} className="room-card">
              <div className="room-card-header">
                <h3>🏨 {room.roomNumber}</h3>
                <span className="capacity-badge">👥 {room.capacity} คน</span>
              </div>
              
              <div className="room-card-body">
                <h4>{room.roomName}</h4>
                
                {room.facilities && room.facilities.length > 0 && (
                  <div className="facilities">
                    <strong>สิ่งอำนวยความสะดวก:</strong>
                    <div className="facility-tags">
                      {room.facilities.map((facility, index) => (
                        <span key={index} className="facility-tag">
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="room-meta">
                  <small>สร้างเมื่อ: {new Date(room.createdAt).toLocaleDateString('th-TH')}</small>
                </div>
              </div>

              <div className="room-card-actions">
                <button onClick={() => handleEdit(room)} className="btn-edit">
                  ✏️ แก้ไข
                </button>
                <button onClick={() => handleDelete(room._id)} className="btn-delete">
                  🗑️ ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RoomManagement;