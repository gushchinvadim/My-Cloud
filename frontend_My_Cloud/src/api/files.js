import api from './axios';

// Получить список файлов текущего пользователя
export const getFiles = async () => {
  const response = await api.get('files/');
  return response.data;
};

// Получить список файлов конкретного пользователя (для админа)
export const getUserFiles = async (userId) => {
  const response = await api.get(`files/?user_id=${userId}`);
  return response.data;
};

// Загрузить файл
export const uploadFile = async (file, comment = '') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('comment', comment);
  
  const response = await api.post('files/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Удалить файл
export const deleteFile = async (fileId) => {
  const response = await api.delete(`files/${fileId}/`);
  return response.data;
};

// Переименовать файл
export const renameFile = async (fileId, newName) => {
  const response = await api.patch(`files/${fileId}/`, {
    new_name: newName,
  });
  return response.data;
};

// Изменить комментарий
export const updateComment = async (fileId, comment) => {
  const response = await api.patch(`files/${fileId}/`, {
    comment: comment,
  });
  return response.data;
};

// Скачать файл (с поддержкой user_id для админа)
export const downloadFile = async (fileId, userId = null) => {
  const params = userId ? { user_id: userId } : {};
  const response = await api.get(`files/${fileId}/download/`, {
    responseType: 'blob',
    params,
  });
  return response;
};

// Получить ссылку для скачивания (с поддержкой user_id для админа)
export const getShareLink = async (fileId, userId = null) => {
  const params = userId ? { user_id: userId } : {};
  const response = await api.post(`files/${fileId}/share/`, null, { params });
  return response.data;
};

// Получить URL для предпросмотра файла (с поддержкой user_id для админа)
// Возвращает URL для предпросмотра файла
export const getPreviewUrl = (fileId, params = '') => {
  return `/api/files/${fileId}/preview/${params}`;
};

// Получить содержимое текстового файла
export const getFileText = async (fileId, userId = null) => {
  const params = userId ? { user_id: userId } : {};
  const response = await api.get(`files/${fileId}/preview/`, {
    responseType: 'text',
    transformResponse: [(data) => data],
    params,
  });
  return response.data;
};