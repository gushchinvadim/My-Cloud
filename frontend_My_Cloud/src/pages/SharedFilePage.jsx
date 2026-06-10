import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function SharedFilePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const downloadSharedFile = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/shared/${token}/`);
      
      if (!response.ok) {
        throw new Error('Ошибка при скачивании файла');
      }

      const blob = await response.blob();
      
      // 1. Пытаемся получить имя из заголовка Content-Disposition
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = 'downloaded_file';
      
      if (contentDisposition) {
        // Извлекаем имя между filename=" и "
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          fileName = decodeURIComponent(match[1].trim());
        }
      }

      // 2. Создаём ссылку и инициируем скачивание
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName; // ← Чистое имя из заголовка
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      setError('Не удалось скачать файл');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    downloadSharedFile();
  }, [downloadSharedFile]);

  if (loading) {
    return (
      <div className="shared-page">
        <div className="shared-content">
          <h2>Подготовка файла к скачиванию...</h2>
          <p>Пожалуйста, подождите</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-page">
        <div className="shared-content error">
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            На главную
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default SharedFilePage;