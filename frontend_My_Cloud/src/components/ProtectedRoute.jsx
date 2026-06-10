import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api/axios';

function ProtectedRoute({ children, adminOnly = false }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthorized' | 'forbidden'
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('auth/me/');
      setUser(response.data);
      
      if (adminOnly && !response.data.is_admin) {
        setStatus('forbidden');
      } else {
        setStatus('authenticated');
      }
    } catch (error) {
      setStatus('unauthorized');
    }
  };

  if (status === 'loading') {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'forbidden') {
    return (
      <div className="forbidden-page">
        <h2>Доступ запрещён</h2>
        <p>У вас нет прав для просмотра этой страницы.</p>
        <a href="/storage" className="btn btn-primary">В моё хранилище</a>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;