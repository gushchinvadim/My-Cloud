import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { AuthContext } from './context';

export { AuthContext };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('auth/me/');
      setUser(response.data);
    } catch (err) {
      console.error('Ошибка проверки аутентификации:', err);
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
    await checkAuth();
    return response.data;
  };

  const logout = async () => {
    await api.post('auth/logout/');
    setUser(null);
  };

  const register = async (registerData) => {
    const response = await api.post('auth/register/', registerData);
    await checkAuth();
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
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};