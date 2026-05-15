import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import './Admin.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      showAlert('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      showAlert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('รหัสผ่านไม่ตรงกัน', 'error');
      return;
    }

    try {
      console.log('🔐 Changing password for user:', selectedUser._id);
      const response = await api.patch(`/admin/users/${selectedUser._id}/password`, { 
        newPassword 
      });
      console.log('✅ Password change response:', response.data);
      showAlert('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('❌ Password change error:', err);
      console.error('Error response:', err.response?.data);
      showAlert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error');
    }
  };

  const handleChangeStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      console.log('🔄 Changing status for user:', userId, 'to:', newStatus);
      const res = await api.patch(`/admin/users/${userId}/status`, { 
        status: newStatus 
      });
      console.log('✅ Status change response:', res.data);
      
      // อัพเดทข้อมูลใน state
      setUsers(users.map(u => u._id === userId ? res.data.user : u));
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(res.data.user);
      }
      
      showAlert(`เปลี่ยนสถานะเป็น ${newStatus === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} สำเร็จ`, 'success');
    } catch (err) {
      console.error('❌ Status change error:', err);
      console.error('Error response:', err.response?.data);
      showAlert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'error');
    }
  };

  const handleChangeRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (!window.confirm(`คุณต้องการเปลี่ยนสิทธิ์เป็น ${newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'} หรือไม่?`)) {
      return;
    }

    try {
      console.log('👑 Changing role for user:', userId, 'to:', newRole);
      const res = await api.patch(`/admin/users/${userId}/role`, { 
        role: newRole 
      });
      console.log('✅ Role change response:', res.data);
      
      // อัพเดทข้อมูลใน state
      setUsers(users.map(u => u._id === userId ? res.data.user : u));
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(res.data.user);
      }
      
      showAlert(`เปลี่ยนสิทธิ์เป็น ${newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'} สำเร็จ`, 'success');
    } catch (err) {
      console.error('❌ Role change error:', err);
      console.error('Error response:', err.response?.data);
      showAlert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์', 'error');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`คุณต้องการลบผู้ใช้ "${userName}" หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    try {
      console.log('🗑️ Deleting user:', userId);
      const response = await api.delete(`/admin/users/${userId}`);
      console.log('✅ Delete response:', response.data);
      setUsers(users.filter(u => u._id !== userId));
      showAlert('ลบผู้ใช้สำเร็จ', 'success');
      handleCloseModal();
    } catch (err) {
      console.error('❌ Delete user error:', err);
      console.error('Error response:', err.response?.data);
      showAlert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลบผู้ใช้', 'error');
    }
  };

  if (loading) return <div className="loading">กำลังโหลด...</div>;

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>👥 จัดการผู้ใช้</h2>
        <p>ผู้ใช้ทั้งหมด: {users.length} คน</p>
      </div>

      <div className="users-grid">
        {users.map(user => (
          <div 
            key={user._id} 
            className={`user-card ${user.status === 'inactive' ? 'inactive' : ''}`}
            onClick={() => handleUserClick(user)}
          >
            <div className="user-card-header">
              <div className="user-avatar">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <h3>{user.fullName}</h3>
                <p className="user-email">{user.email}</p>
              </div>
            </div>
            
            <div className="user-card-body">
              <div className="user-detail">
                <span className="label">แผนก:</span>
                <span className="value">{user.department}</span>
              </div>
              <div className="user-detail">
                <span className="label">สิทธิ์:</span>
                <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                  {user.role === 'admin' ? '👑 ผู้ดูแล' : '👤 ผู้ใช้'}
                </span>
              </div>
              <div className="user-detail">
                <span className="label">สถานะ:</span>
                <span className={`badge ${(user.status || 'active') === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                  {(user.status || 'active') === 'active' ? '✅ เปิดใช้งาน' : '🚫 ปิดใช้งาน'}
                </span>
              </div>
            </div>

            <div className="user-card-footer">
              <small>สร้างเมื่อ: {new Date(user.createdAt).toLocaleDateString('th-TH')}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Modal สำหรับจัดการผู้ใช้ */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>จัดการผู้ใช้</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="user-details-section">
                <div className="user-avatar-large">
                  {selectedUser.fullName.charAt(0).toUpperCase()}
                </div>
                <h3>{selectedUser.fullName}</h3>
                <p>{selectedUser.email}</p>
                <div className="user-badges">
                  <span className={`badge ${selectedUser.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                    {selectedUser.role === 'admin' ? '👑 ผู้ดูแล' : '👤 ผู้ใช้'}
                  </span>
                  <span className={`badge ${(selectedUser.status || 'active') === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                    {(selectedUser.status || 'active') === 'active' ? '✅ เปิดใช้งาน' : '🚫 ปิดใช้งาน'}
                  </span>
                </div>
              </div>

              {/* เปลี่ยนรหัสผ่าน */}
              <div className="management-section">
                <h4>🔐 เปลี่ยนรหัสผ่าน</h4>
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>รหัสผ่านใหม่:</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>ยืนยันรหัสผ่าน:</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านอีกครั้ง"
                      minLength={6}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    เปลี่ยนรหัสผ่าน
                  </button>
                </form>
              </div>

              {/* เปลี่ยนสถานะและสิทธิ์ */}
              <div className="management-section">
                <h4>⚙️ จัดการสถานะและสิทธิ์</h4>
                <div className="action-buttons">
                  <button 
                    className={`btn ${(selectedUser.status || 'active') === 'active' ? 'btn-warning' : 'btn-success'}`}
                    onClick={() => handleChangeStatus(selectedUser._id, selectedUser.status || 'active')}
                  >
                    {(selectedUser.status || 'active') === 'active' ? '🚫 ปิดใช้งาน' : '✅ เปิดใช้งาน'}
                  </button>
                  <button 
                    className="btn btn-info"
                    onClick={() => handleChangeRole(selectedUser._id, selectedUser.role)}
                  >
                    {selectedUser.role === 'admin' ? '👤 เปลี่ยนเป็นผู้ใช้' : '👑 เปลี่ยนเป็นผู้ดูแล'}
                  </button>
                </div>
              </div>

              {/* ลบผู้ใช้ */}
              <div className="management-section danger-zone">
                <h4>⚠️ โซนอันตราย</h4>
                <p>การลบผู้ใช้จะไม่สามารถกู้คืนได้</p>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteUser(selectedUser._id, selectedUser.fullName)}
                >
                  🗑️ ลบผู้ใช้
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
