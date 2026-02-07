import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth.js';
import { getToken } from '../api/client.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);
  const [loading, setLoading] = useState(!!getToken());
  const [error, setError] = useState(null);

  const setSession = useCallback((token, userData) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      if (userData) {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
    setError(null);
  }, []);

  const login = useCallback(
    async (email, password) => {
      setError(null);
      const res = await authApi.login({ email, password });
      setSession(res.token, res.user);
      return res.user;
    },
    [setSession]
  );

  const signup = useCallback(
    async (email, password, extra = {}) => {
      setError(null);
      const res = await authApi.signup({ email, password, ...extra });
      setSession(res.token, res.user);
      return res.user;
    },
    [setSession]
  );

  const logout = useCallback(() => {
    setSession(null);
  }, [setSession]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    if (user) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        } catch {
          // ignore
        }
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setSession(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [setSession]);

  const value = {
    user,
    loading,
    error,
    setError,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
