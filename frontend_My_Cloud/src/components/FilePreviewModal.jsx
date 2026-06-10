import { useState, useEffect } from 'react';
import { getPreviewUrl, getFileText, downloadFile, getShareLink } from '../api/files';

const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  
  const types = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
    video: ['mp4', 'webm', 'ogg', 'mov'],
    audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'],
    pdf: ['pdf'],
    text: ['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 
           'xml', 'csv', 'yaml', 'yml', 'sh', 'bat', 'log', 'ini', 'cfg', 'sql',
           'java', 'c', 'cpp', 'h', 'go', 'rs', 'rb', 'php'],
  };
  
  for (const [type, extensions] of Object.entries(types)) {
    if (extensions.includes(ext)) return type;
  }
  return 'other';
};

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

function FilePreviewModal({ file, isOpen, onClose, userId = null }) {
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && file) {
      loadPreview();
    }
    return () => {
      setTextContent('');
      setError('');
    };
  }, [isOpen, file]);

  const loadPreview = async () => {
    const fileType = getFileType(file.original_name);
    
    if (fileType === 'text') {
      setLoading(true);
      try {
        const text = await getFileText(file.id, userId);
        if (text.length > 100000) {
          setTextContent(text.substring(0, 100000) + '\n\n... [файл обрезан]');
        } else {
          setTextContent(text);
        }
      } catch (err) {
        setError('Не удалось загрузить файл');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownload = async () => {
    try {
      const response = await downloadFile(file.id, userId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Ошибка скачивания:', err);
    }
  };

  if (!isOpen || !file) return null;

  const fileType = getFileType(file.original_name);
  const previewUrl = getPreviewUrl(file.id, userId);

  const renderPreview = () => {
    if (loading) {
      return <div className="preview-loading">Загрузка...</div>;
    }

    if (error) {
      return <div className="preview-error">{error}</div>;
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="preview-image-container">
            <img src={previewUrl} alt={file.original_name} className="preview-image" />
          </div>
        );
      
      case 'video':
        return (
          <video controls className="preview-video">
            <source src={previewUrl} />
            Ваш браузер не поддерживает воспроизведение видео.
          </video>
        );
      
      case 'audio':
        return (
          <div className="preview-audio-container">
            <div className="audio-icon">🎵</div>
            <audio controls className="preview-audio">
              <source src={previewUrl} />
              Ваш браузер не поддерживает воспроизведение аудио.
            </audio>
          </div>
        );
      
      case 'pdf':
        // 🔹 Используем <object> вместо <iframe> — работает с cookies
        return (
          <object 
            data={previewUrl} 
            type="application/pdf"
            className="preview-pdf"
          >
            <div className="preview-unsupported">
              <p>PDF не отображается в предпросмотре.</p>
              <button onClick={handleDownload} className="btn btn-primary">
                ⬇️ Скачать PDF
              </button>
            </div>
          </object>
        );
      
      case 'text':
        return (
          <pre className="preview-text">{textContent}</pre>
        );
      
      default:
        return (
          <div className="preview-unsupported">
            <div className="unsupported-icon">📄</div>
            <h3>Предпросмотр недоступен</h3>
            <p>Этот тип файла нельзя просмотреть в браузере.</p>
            <button onClick={handleDownload} className="btn btn-primary">
              ⬇️ Скачать файл
            </button>
          </div>
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h3>{file.original_name}</h3>
          <button onClick={onClose} className="preview-close-btn">✕</button>
        </div>
        
        <div className="preview-body">
          {renderPreview()}
        </div>
        
        <div className="preview-footer">
          <span className="preview-info">
            {fileType.toUpperCase()} • {formatSize(file.size)}
          </span>
          <button onClick={handleDownload} className="btn btn-primary btn-small">
            ⬇️ Скачать
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilePreviewModal;