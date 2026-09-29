import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABEL = {
  admin: 'Administrator',
  guru: 'Guru',
  siswa: 'Siswa',
};

// Menu navigasi per role.
const NAV_BY_ROLE = {
  admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/admin/teachers', label: 'Kelola Guru' },
    { to: '/admin/students', label: 'Kelola Siswa' },
    { to: '/ai', label: 'Asisten AI' },
  ],
  guru: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/attendance', label: 'Absensi' },
    { to: '/ai', label: 'Asisten AI' },
  ],
  siswa: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/ai', label: 'Asisten AI' },
  ],
};

const ROLE_BADGE = {
  admin: 'bg-purple-100 text-purple-700',
  guru: 'bg-sky-100 text-sky-700',
  siswa: 'bg-emerald-100 text-emerald-700',
};

// Layout terproteksi: header dengan identitas user + tombol logout.
export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navItems = NAV_BY_ROLE[user?.role] || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                SA
              </div>
              <span className="text-lg font-semibold text-slate-900">SiAbsen</span>
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">
                {user?.full_name}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            {user?.role && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  ROLE_BADGE[user.role] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {ROLE_LABEL[user.role] || user.role}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
