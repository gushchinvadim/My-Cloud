import { useState, useEffect, useCallback } from 'react';
import { getUsers, deleteUser, toggleAdmin } from '../api/admin';

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError('');
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
      setError('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (userId, userName) => {
    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setConfirmDelete(null);
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError(`Не удалось удалить пользователя ${userName}`);
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const response = await toggleAdmin(userId);
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_admin: response.is_admin } : u
      ));
    } catch (err) {
      console.error('Ошибка изменения прав:', err);
      setError('Не удалось изменить права пользователя');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="admin-page"><p>Загрузка...</p></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Административная панель</h2>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Всего пользователей</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{users.filter(u => u.is_admin).length}</div>
            <div className="stat-label">Администраторов</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {formatSize(users.reduce((sum, u) => sum + (u.total_size || 0), 0))}
            </div>
            <div className="stat-label">Общий объём хранилищ</div>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="users-grid">
        {users.map((user) => (
          <div key={user.id} className={`user-card ${user.is_admin ? 'admin' : ''}`}>
            <div className="user-card-header">
              <div className="user-avatar">
                {user.fullname.charAt(0).toUpperCase()}
              </div>
              {user.is_admin && <span className="admin-badge">Админ</span>}
            </div>
            
            <div className="user-card-body">
              <h3>{user.fullname}</h3>
              <p className="user-login">@{user.login}</p>
              <p className="user-email">{user.email}</p>
              
              <div className="user-stats">
                <div className="user-stat">
                  <span className="stat-icon">📁</span>
                  <span>{user.files_count || 0} файлов</span>
                </div>
                <div className="user-stat">
                  <span className="stat-icon">💾</span>
                  <span>{formatSize(user.total_size)}</span>
                </div>
              </div>
            </div>

            <div className="user-card-actions">
              <a 
                href={`/storage?user_id=${user.id}`}
                className="btn btn-small btn-info"
              >
                📂 Хранилище
              </a>
              
              <button
                onClick={() => handleToggleAdmin(user.id)}
                className={`btn btn-small ${user.is_admin ? 'btn-secondary' : 'btn-success'}`}
              >
                {user.is_admin ? 'Снять админа' : 'Сделать админом'}
              </button>
              
              <button
                onClick={() => setConfirmDelete(user)}
                className="btn btn-small btn-danger"
              >
                🗑️ Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Подтверждение удаления</h3>
            <p>
              Вы уверены, что хотите удалить пользователя{' '}
              <strong>{confirmDelete.fullname}</strong>?
            </p>
            <p className="warning-text">
              ⚠️ Это действие необратимо. Все файлы пользователя также будут удалены!
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.id, confirmDelete.fullname)}
                className="btn btn-danger"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;