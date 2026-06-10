import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">My-Cloud</Link>
        <div className="nav-links">
          <Link to="/" className="nav-link">Главная</Link>
          
          {!isAuthenticated ? (
            <>
              <Link to="/register" className="nav-link">Регистрация</Link>
              <Link to="/login" className="nav-link">Вход</Link>
            </>
          ) : (
            <>
              {isAdmin && <Link to="/admin" className="nav-link">Админка</Link>}
              <Link to="/storage" className="nav-link">Хранилище</Link>
              
              <div className="user-info">
                <span className="user-nickname">
                   {user?.nickname || user?.login}
                </span>
                <button onClick={handleLogout} className="nav-link btn-logout">
                  Выход
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;