import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function SharedFilePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    downloadSharedFile();
  }, [token]);

  const downloadSharedFile = async () => {
    try {
      setLoading(true);
      // Скачиваем напрямую с бэкенда
      const response = await fetch(`http://localhost:8000/api/shared/${token}/`);
      
      if (!response.ok) {
        throw new Error('Файл не найден или ссылка недействительна');
      }
      
      // Получаем оригинальное имя из заголовка Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName = 'downloaded_file';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }
      
      // Создаём blob и скачиваем
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Перенаправляем на главную после скачивания
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      setError(error.message || 'Не удалось скачать файл');
      setLoading(false);
    }
  };

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