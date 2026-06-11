import { useState, useEffect } from 'react';
import api from '../../services/api';
import './Admin.css';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchBookings = async () => {
    try {
      let url = '/admin/bookings';
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      const res = await api.get(url);
      setBookings(res.data.bookings || res.data);
      setExpandedRows(new Set());
      setAllExpanded(false);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedRows(new Set());
      setAllExpanded(false);
    } else {
      setExpandedRows(new Set(bookings.map(b => b._id)));
      setAllExpanded(true);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const statusLabel = (status) => {
    if (status === 'pending') return 'รออนุมัติ';
    if (status === 'approved') return 'อนุมัติแล้ว';
    if (status === 'rejected') return 'ปฏิเสธ';
    return status;
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await api.put(`/admin/bookings/${bookingId}/status`, { status: newStatus });
      alert(`✅ Booking ${newStatus} successfully`);
      fetchBookings();
    } catch (err) {
      alert('❌ Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการจองนี้?')) {
      try {
        await api.delete(`/admin/bookings/${bookingId}`);
        alert('✅ ลบรายการจองแล้ว');
        fetchBookings();
      } catch (err) {
        alert('❌ Error: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleViewImage = (booking) => {
    if (booking.bookingImage && booking.bookingImage.data) {
      setSelectedImage({
        data: booking.bookingImage.data,
        fileName: booking.bookingImage.fileName || 'หนังสือการจอง',
        booking: booking
      });
      setShowImageModal(true);
    } else {
      alert('ℹ️ ไม่มีรูปภาพหนังสือการจอง');
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="booking-management">
      <div className="management-header">
        <h2>📋 จัดการรายการจอง</h2>
        <div className="filter-buttons">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>ทั้งหมด</button>
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>⏳ รออนุมัติ</button>
          <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>✅ อนุมัติแล้ว</button>
          <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>❌ ปฏิเสธ</button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">ไม่พบรายการจอง</div>
      ) : (
        <div className="bookings-table">
          <table>
            <thead>
              <tr>
                <th>
                  <button className="btn-expand-all" onClick={toggleAll} title={allExpanded ? 'ยุบทั้งหมด' : 'ขยายทั้งหมด'}>
                    {allExpanded ? '▲' : '▼'} รายละเอียด
                  </button>
                </th>
                <th>ห้องประชุม</th>
                <th>วันเวลาการจอง</th>
                <th>วันที่จองใช้ห้อง</th>
                <th>เวลาใช้ห้อง</th>
                <th>สถานะ</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <>
                  <tr key={booking._id} className={expandedRows.has(booking._id) ? 'row-expanded' : ''}>
                    <td>
                      <button
                        className="btn-expand-row"
                        onClick={() => toggleRow(booking._id)}
                        title={expandedRows.has(booking._id) ? 'ยุบ' : 'ขยาย'}
                      >
                        {expandedRows.has(booking._id) ? '▲' : '▼'}
                      </button>
                    </td>
                    <td data-label="ห้องประชุม">
                      <div>
                        <strong>{booking.roomId?.roomNumber}</strong>
                        <br />
                        <small>{booking.roomId?.roomName}</small>
                      </div>
                    </td>
                    <td data-label="วันเวลาการจอง">
                      <small>{formatDateTime(booking.createdAt)}</small>
                    </td>
                    <td data-label="วันที่จองใช้ห้อง">
                      {formatDate(booking.bookingDate)}
                    </td>
                    <td data-label="เวลาใช้ห้อง">
                      {booking.startTime} – {booking.endTime}
                    </td>
                    <td data-label="สถานะ">
                      <span className={`status-badge ${booking.status}`}>
                        {statusLabel(booking.status)}
                      </span>
                    </td>
                    <td data-label="Actions" className="action-buttons">
                      {booking.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatusChange(booking._id, 'approved')} className="btn-approve" title="อนุมัติ">✅</button>
                          <button onClick={() => handleStatusChange(booking._id, 'rejected')} className="btn-reject" title="ปฏิเสธ">❌</button>
                        </>
                      )}
                      <button onClick={() => handleDelete(booking._id)} className="btn-delete-row" title="ลบ">🗑️</button>
                    </td>
                  </tr>
                  {expandedRows.has(booking._id) && (
                    <tr key={`${booking._id}-detail`} className="expanded-detail-row">
                      <td colSpan={7}>
                        <div className="expanded-details">
                          <div className="expanded-item">
                            <span className="expanded-label">👤 ผู้จอง</span>
                            <span className="expanded-value">{booking.userId?.fullName || booking.fullName}</span>
                          </div>
                          <div className="expanded-item">
                            <span className="expanded-label">🏢 สังกัด</span>
                            <span className="expanded-value">{booking.department}</span>
                          </div>
                          <div className="expanded-item">
                            <span className="expanded-label">📝 หัวข้อการประชุม</span>
                            <span className="expanded-value">{booking.purpose}</span>
                          </div>
                          {booking.bookingImage?.data && (
                            <div className="expanded-item">
                              <span className="expanded-label">📄 หนังสือการจอง</span>
                              <button onClick={() => handleViewImage(booking)} className="btn-view-image">🖼️ ดูรูป</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>📄 หนังสือการจอง</h3>
              <button onClick={closeImageModal} className="btn-close-modal">✕</button>
            </div>
            <div className="image-modal-body">
              <div className="booking-info-section">
                <p><strong>ห้อง:</strong> {selectedImage.booking.roomId?.roomNumber} - {selectedImage.booking.roomId?.roomName}</p>
                <p><strong>ผู้จอง:</strong> {selectedImage.booking.userId?.fullName || selectedImage.booking.fullName}</p>
                <p><strong>แผนก:</strong> {selectedImage.booking.department}</p>
                <p><strong>วันที่:</strong> {formatDate(selectedImage.booking.bookingDate)}</p>
                <p><strong>เวลา:</strong> {selectedImage.booking.startTime} - {selectedImage.booking.endTime}</p>
              </div>
              <div className="image-container">
                <img src={selectedImage.data} alt={selectedImage.fileName} className="booking-image-preview" />
              </div>
              <div className="image-modal-actions">
                <a href={selectedImage.data} download={selectedImage.fileName} className="btn-download">💾 ดาวน์โหลด</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;