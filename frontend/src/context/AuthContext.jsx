import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  getToken,
  setToken,
  setUnauthorizedHandler,
} from '../lib/api.js';
import { loginRequest, fetchMe, logoutRequest } from '../lib/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // memuat sesi awal

  const doLogout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Auto-logout bila server mengembalikan 401.
  useEffect(() => {
    setUnauthorizedHandler(() => doLogout());
    return () => setUnauthorizedHandler(null);
  }, [doLogout]);

  // Saat aplikasi dibuka, jika ada token, ambil profil user.
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        if (active) setUser(me);
      } catch {
        if (active) doLogout();
      } finally {
        if (active) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [doLogout]);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // abaikan; token tetap dihapus di klien
    }
    doLogout();
  }, [doLogout]);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
