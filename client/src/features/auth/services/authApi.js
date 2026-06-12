import api from '@/shared/lib/api';

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const register = (username, email, password) =>
  api.post('/auth/register', { username, email, password });

export const getCurrentUser = () => api.get('/auth/me');

export const updateLeetcodeUsername = (leetcodeUsername) =>
  api.put('/auth/me/leetcode-username', { leetcodeUsername });
