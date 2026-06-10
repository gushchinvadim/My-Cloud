import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('auth/me/');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (loginData) => {
    const response = await api.post('auth/login/', loginData);
    await checkAuth(); // ← Принудительно обновляем состояние
    return response.data;
  };

  const logout = async () => {
    await api.post('auth/logout/');
    setUser(null); // ← Сразу очищаем состояние
  };

  const register = async (registerData) => {
    const response = await api.post('auth/register/', registerData);
    await checkAuth(); // ← Принудительно обновляем состояние
    return response.data;
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    login,
    logout,
    register,
    checkAuth, // ← Экспортируем для ручного вызова
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};