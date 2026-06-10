import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getFiles,
  getUserFiles,
  uploadFile,
  deleteFile,
  renameFile,
  updateComment,
  downloadFile,
  getShareLink,
} from '../api/files';
import { getUsers } from '../api/admin';
import FilePreviewModal from '../components/FilePreviewModal';

function StoragePage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const viewingUserId = searchParams.get('user_id');

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [comment, setComment] = useState('');
  const [editingFile, setEditingFile] = useState(null);
  const [editName, setEditName] = useState('');
  const [editComment, setEditComment] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [shareModal, setShareModal] = useState({
    isOpen: false,
    url: '',
    fileName: '',
  });
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isOwnStorage = !viewingUserId || viewingUserId === user?.id?.toString();

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      
      let data;
      if (viewingUserId && isAdmin) {
        data = await getUserFiles(viewingUserId);
        const users = await getUsers();
        const owner = users.find(u => u.id === parseInt(viewingUserId));
        setOwnerInfo(owner);
      } else {
        data = await getFiles();
        setOwnerInfo(null);
      }
      
      setFiles(data);
      setError('');
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('У вас нет доступа к этому хранилищу');
      } else {
        setError('Не удалось загрузить файлы');
      }
    } finally {
      setLoading(false);
    }
  }, [viewingUserId, isAdmin, navigate]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

// ================

  // Обработчики
  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!isOwnStorage) {
      setError('Вы можете загружать файлы только в своё хранилище');
      return;
    }
    
    if (!selectedFile) {
      setError('Выберите файл');
      return;
    }

    setUploading(true);
    try {
      await uploadFile(selectedFile, comment);
      setSelectedFile(null);
      setComment('');
      await loadFiles();
      setError('');
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setError('Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот файл?')) {
      return;
    }

    try {
      await deleteFile(fileId);
      await loadFiles();
    } catch (error) {
      console.error('Ошибка удаления:', error);
      setError('Не удалось удалить файл');
    }
  };

  const startEditing = (file) => {
    setEditingFile(file.id);
    setEditName(file.original_name);
    setEditComment(file.comment);
  };

  const handleSaveEdit = async (fileId) => {
    try {
      await renameFile(fileId, editName);
      await updateComment(fileId, editComment);
      setEditingFile(null);
      await loadFiles();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      setError('Не удалось сохранить изменения');
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await downloadFile(fileId, viewingUserId);  // ← передаём userId
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      setError('Не удалось скачать файл');
    }
  };

  const handleCopyLink = async (fileId, fileName) => {
    try {
      const data = await getShareLink(fileId, viewingUserId);  // ← передаём userId
      const token = data.share_url.split('/').filter(Boolean).pop();
      const shareUrl = `${window.location.origin}/shared/${token}`;
      
      setShareModal({
        isOpen: true,
        url: shareUrl,
        fileName: fileName,
      });
    } catch (error) {
      console.error('Ошибка получения ссылки:', error);
      setError('Не удалось получить ссылку');
    }
  };

  const closeShareModal = () => {
    setShareModal({ isOpen: false, url: '', fileName: '' });
  };

  const copyFromModal = async () => {
    const textArea = document.createElement('textarea');
    textArea.value = shareModal.url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopiedId('modal');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  };

  const handlePreview = (file) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  // Утилиты
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  // Рендер
  if (loading) {
    return <div className="storage-page"><p>Загрузка...</p></div>;
  }

  return (
    <div className="storage-page">
      <div className="storage-header">
        <h2>
          {isOwnStorage ? 'Моё хранилище' : 'Хранилище пользователя'}
        </h2>
        
        {ownerInfo && (
          <div className="owner-info">
            <div className="owner-avatar">
              {ownerInfo.fullname.charAt(0).toUpperCase()}
            </div>
            <div className="owner-details">
              <h3>{ownerInfo.fullname}</h3>
              <p>@{ownerInfo.login}</p>
              <p className="owner-stats">
                {ownerInfo.files_count || 0} файлов • {formatSize(ownerInfo.total_size)}
              </p>
            </div>
          </div>
        )}
        
        {!isOwnStorage && isAdmin && (
          <Link to="/storage" className="btn btn-secondary">
            ← Вернуться в моё хранилище
          </Link>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {isOwnStorage && (
        <div className="upload-section">
          <h3>Загрузить новый файл</h3>
          <form onSubmit={handleUpload} className="upload-form">
            <input
              type="file"
              onChange={handleFileSelect}
              className="file-input"
            />
            <input
              type="text"
              placeholder="Комментарий (необязательно)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="comment-input"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !selectedFile}
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </form>
        </div>
      )}

      <div className="files-list">
        <h3>
          {isOwnStorage ? 'Мои файлы' : 'Файлы пользователя'} ({files.length})
        </h3>
        
        {files.length === 0 ? (
          <p className="empty-message">
            {isOwnStorage 
              ? 'Хранилище пусто. Загрузите первый файл!' 
              : 'У пользователя пока нет файлов'}
          </p>
        ) : (
          <table className="files-table">
            <thead>
              <tr>
                <th>Имя файла</th>
                <th>Размер</th>
                <th>Дата загрузки</th>
                <th>Последнее скачивание</th>
                <th>Комментарий</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>
                    {editingFile === file.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      file.original_name
                    )}
                  </td>
                  <td>{formatSize(file.size)}</td>
                  <td>{formatDate(file.uploaded_at)}</td>
                  <td>{formatDate(file.last_downloaded_at)}</td>
                  <td>
                    {editingFile === file.id ? (
                      <input
                        type="text"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      file.comment || '—'
                    )}
                  </td>
                  <td className="actions-cell">
                    {editingFile === file.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(file.id)}
                          className="btn btn-small btn-success"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingFile(null)}
                          className="btn btn-small btn-secondary"
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePreview(file)}
                          className="btn btn-small btn-secondary"
                          title="Предпросмотр"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleDownload(file.id, file.original_name)}
                          className="btn btn-small btn-primary"
                          title="Скачать"
                        >
                          ⬇️
                        </button>
                        
                        {isOwnStorage && (
                          <button
                            onClick={() => startEditing(file)}
                            className="btn btn-small btn-secondary"
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleCopyLink(file.id, file.original_name)}
                          className="btn btn-small btn-info"
                          title="Копировать ссылку"
                        >
                          {copiedId === file.id ? '✓' : '🔗'}
                        </button>
                        
                        {isOwnStorage && (
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="btn btn-small btn-danger"
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {shareModal.isOpen && (
        <div className="modal-overlay" onClick={closeShareModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Ссылка для скачивания файла</h3>
            <p className="modal-filename"><strong>{shareModal.fileName}</strong></p>
            
            <div className="share-url-container">
              <input
                type="text"
                value={shareModal.url}
                readOnly
                className="share-url-input"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={copyFromModal}
                className="btn btn-primary"
              >
                {copiedId === 'modal' ? '✓ Скопировано' : 'Копировать'}
              </button>
            </div>
            
            <p className="modal-hint">
              Отправьте эту ссылку любому пользователю для скачивания файла
            </p>
            
            <div className="modal-actions">
              <button onClick={closeShareModal} className="btn btn-secondary">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      
      <FilePreviewModal 
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={closePreview}
        userId={viewingUserId}  // ← передаём userId
      />
    </div>
  );
}

export default StoragePage;
