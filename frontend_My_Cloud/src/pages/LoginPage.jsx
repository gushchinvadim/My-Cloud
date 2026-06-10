import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // ← Используем Context
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData); // ← Используем login из Context
      
      if (response.is_admin) {
        navigate('/admin');
      } else {
        navigate('/storage');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      if (error.response && error.response.data) {
        setError(error.response.data.error || 'Неверный логин или пароль');
      } else {
        setError('Ошибка соединения с сервером');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <h2>Вход в систему</h2>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="login">Логин:</label>
          <input
            type="text"
            id="login"
            name="login"
            value={formData.login}
            onChange={handleChange}
            placeholder="Введите логин"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Введите пароль"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <p className="register-link">
        Нет аккаунта? <a href="/register">Зарегистрироваться</a>
      </p>
    </div>
  );
}

export default LoginPage;