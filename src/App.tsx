import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CalendarView from './components/calendar/CalendarView';
import Dashboard from './components/admin/Dashboard';
import SettingsManagement from './components/admin/SettingsManagement';
import PendingBookings from './components/admin/PendingBookings';
import AdminCalendar from './components/admin/AdminCalendar';
import TrainerBookings from './components/admin/TrainerBookings';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import PublicRequest from './components/public/PublicRequest';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/request" element={<PublicRequest />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CalendarView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <SettingsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/requests"
              element={
                <ProtectedRoute requireAdmin>
                  <PendingBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trainer-bookings"
              element={
                <ProtectedRoute requireAdmin>
                  <TrainerBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/calendar"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminCalendar />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
