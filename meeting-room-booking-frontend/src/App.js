import { Routes, Route, Navigate } from 'react-router-dom';
// ลบ BrowserRouter ออกจาก import เพราะเราใช้ที่ index.js แล้ว
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Components (Layouts & Pages)
import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import MyBookings from './components/Booking/MyBookings';
import MultiDayBookingForm from './components/Booking/MultiDayBookingForm';
import AllBookings from './components/Booking/AllBookings';
import AdminDashboard from './components/Admin/AdminDashboard';
import RoomCalendar from './components/Booking/RoomCalendar';
import Home from './pages/Home';
import PublicDisplay from './pages/PublicDisplay';
import './App.css';

// --- Protected Route Component ---
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  
  // ถ้ายังไม่ Login ให้ไปหน้า Login
  if (!user) return <Navigate to="/login" />;
  
  // ถ้าเป็น Admin Route แต่ User ไม่ใช่ Admin ให้ดีดกลับ Dashboard
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;

  return children;
};

// --- Main Routes ---
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        
        {/* Public View (ใครก็ดูห้องได้ แต่จองต้อง Login) */}
        <Route path="/bookings" element={<AllBookings />} />
        <Route path="/rooms/:roomId/calendar" element={<RoomCalendar />} />

        {/* Protected Routes (ต้อง Login) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookings/multi-day"
          element={
            <ProtectedRoute>
              <MultiDayBookingForm onClose={() => window.history.back()} />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes (ต้องเป็น Admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch all - ถ้าไม่เจอหน้าไหนให้กลับไปหน้าแรก */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* ✅ หน้าจอสาธารณะ - ไม่ต้องผ่าน AuthProvider เลย */}
        <Route path="/display/room/:roomId" element={<PublicDisplay />} />

        {/* ทุก route อื่น ๆ ผ่าน AuthProvider + AlertProvider */}
        <Route
          path="*"
          element={
            <AuthProvider>
              <AlertProvider>
                <AppRoutes />
              </AlertProvider>
            </AuthProvider>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;