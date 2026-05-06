import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('vcart_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('vcart_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem('vcart_token', token);
    } else {
      localStorage.removeItem('vcart_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('vcart_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vcart_user');
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      token,
      login: (newToken, newUser) => {
        setToken(newToken);
        setUser(newUser);
      },
      logout: () => {
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
