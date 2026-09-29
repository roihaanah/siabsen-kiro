import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Membungkus route yang butuh login. Opsional membatasi berdasarkan role.
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Batasi berdasarkan role bila ditentukan.
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-slate-900">Akses ditolak</p>
          <p className="mt-1 text-sm text-slate-500">
            Halaman ini tidak tersedia untuk role Anda ({user.role}).
          </p>
        </div>
      </div>
    );
  }

  return children;
}
