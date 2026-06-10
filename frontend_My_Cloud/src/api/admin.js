import api from './axios';

// Получить список всех пользователей (только для админов)
export const getUsers = async () => {
  const response = await api.get('admin/users/');
  return response.data;
};

// Удалить пользователя
export const deleteUser = async (userId) => {
  const response = await api.delete(`admin/users/${userId}/delete/`);
  return response.data;
};

// Переключить статус администратора
export const toggleAdmin = async (userId) => {
  const response = await api.patch(`admin/users/${userId}/toggle-admin/`);
  return response.data;
};