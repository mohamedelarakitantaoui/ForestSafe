import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'forestsafe_refresh_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.accessToken);
    sessionStorage.setItem(TOKEN_KEY, data.refreshToken);
    return data.user;
  }, [BASE_URL]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(TOKEN_KEY);
  }, []);

  const refresh = useCallback(async () => {
    const refreshToken = sessionStorage.getItem(TOKEN_KEY);
    if (!refreshToken) {
      setLoading(false);
      return null;
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      setUser(data.user);
      setToken(data.accessToken);
      sessionStorage.setItem(TOKEN_KEY, data.refreshToken);
      return data.accessToken;
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [BASE_URL]);

  // Try to restore session on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    refresh,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isStaff: user?.role === 'staff' || user?.role === 'admin' || user?.role === 'superadmin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
