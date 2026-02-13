import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false); // ปิด menu หลัง logout
  };

  // ปิด menu เมื่อคลิกลิงก์
  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  // ปิด menu เมื่อหน้าจอใหญ่ขึ้น
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ป้องกันการ scroll เมื่อเปิด menu
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={handleLinkClick}>
          <img src={`${process.env.PUBLIC_URL}/logo1.webp`} alt="Logo" className="navbar-logo-image" />
          <span className="navbar-logo-text">ระบบจองห้องประชุม</span>
        </Link>

        {/* Hamburger Button */}
        <button 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Menu Overlay */}
        {isMenuOpen && (
          <div 
            className="menu-overlay" 
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Navigation Menu */}
        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link" onClick={handleLinkClick}>
                🏠 หน้าหลัก
              </Link>
              <Link to="/bookings/my-bookings" className="nav-link" onClick={handleLinkClick}>
                📝 การจองของฉัน
              </Link>
              <Link to="/bookings" className="nav-link" onClick={handleLinkClick}>
                🗓️ ตารางการจอง
              </Link>
              
              {user.role === 'admin' && (
                <Link to="/admin" className="nav-link admin-link" onClick={handleLinkClick}>
                  ⚙️ เมนูแอดมิน
                </Link>
              )}

              <span className="nav-user">👤 {user.fullName}</span>
              <button onClick={handleLogout} className="nav-logout">
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={handleLinkClick}>
                เข้าสู่ระบบ
              </Link>
             
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;