import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth(); // ← Используем Context
  const [formData, setFormData] = useState({
    login: '',
    fullname: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const LOGIN_REGEX = /^[a-zA-Z][a-zA-Z0-9]{3,19}$/;
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;

  const validateForm = () => {
    const newErrors = {};

    if (!LOGIN_REGEX.test(formData.login)) {
      newErrors.login = 'Логин: 4-20 символов, начинается с буквы, только латиница и цифры';
    }

    if (formData.fullname.trim().length < 2) {
      newErrors.fullname = 'Полное имя должно содержать минимум 2 символа';
    }

    if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = 'Некорректный формат email';
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = 'Пароль: мин. 6 символов, 1 заглавная буква, 1 цифра, 1 спецсимвол (@$!%*?&)';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await register(formData); // ← Используем register из Context
      navigate('/');
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      if (error.response && error.response.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'Ошибка соединения с сервером' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <h2>Регистрация нового пользователя</h2>
      
      {errors.general && (
        <div className="error-message">{errors.general}</div>
      )}

      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label htmlFor="login">Логин:</label>
          <input
            type="text"
            id="login"
            name="login"
            value={formData.login}
            onChange={handleChange}
            placeholder="Введите логин"
          />
          {errors.login && <span className="error-text">{errors.login}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="fullname">Полное имя:</label>
          <input
            type="text"
            id="fullname"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            placeholder="Введите полное имя"
          />
          {errors.fullname && <span className="error-text">{errors.fullname}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="example@domain.com"
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Минимум 6 символов"
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="login-link">
        Уже есть аккаунт? <a href="/login">Войти</a>
      </p>
    </div>
  );
}

export default RegisterPage;