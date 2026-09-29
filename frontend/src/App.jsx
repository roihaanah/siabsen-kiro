import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import ManageTeachers from './pages/admin/ManageTeachers.jsx';
import ManageStudents from './pages/admin/ManageStudents.jsx';
import AiPage from './pages/AiPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';

// Semua role punya dashboard sebagai beranda.
function HomeRedirect() {
  return <Navigate to="/dashboard" replace />;
}

// Bungkus halaman terproteksi dengan layout, dengan opsi batasan role.
function Protected({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />

      <Route
        path="/attendance"
        element={
          <Protected roles={['guru', 'admin']}>
            <AttendancePage />
          </Protected>
        }
      />

      <Route
        path="/ai"
        element={
          <Protected>
            <AiPage />
          </Protected>
        }
      />

      <Route
        path="/admin/teachers"
        element={
          <Protected roles={['admin']}>
            <ManageTeachers />
          </Protected>
        }
      />
      <Route
        path="/admin/students"
        element={
          <Protected roles={['admin']}>
            <ManageStudents />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
