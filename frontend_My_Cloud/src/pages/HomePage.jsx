import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="home-page">
      <h1>Добро пожаловать в My-Cloud!</h1>
      <p className="description">
        My-Cloud — это облачное хранилище файлов, которое позволяет вам:
      </p>
      <ul className="features">
        <li> Загружать и хранить файлы в безопасном облаке</li>
        <li> Делиться файлами с другими пользователями через специальные ссылки</li>
        <li>📝 Добавлять комментарии к файлам для удобства организации</li>
        <li>👥 Управлять пользователями (для администраторов)</li>
      </ul>
      <div className="actions">
        <Link to="/register" className="btn btn-primary">Зарегистрироваться</Link>
        <Link to="/login" className="btn btn-secondary">Войти</Link>
      </div>
    </div>
  );
}

export default HomePage;