import api from '@/shared/lib/api';

export const listProblems = () => api.getCached('/problems', {}, 10000);

export const searchProblems = (query) =>
  api.get(`/problems/search?q=${encodeURIComponent(query)}`);

export const createProblem = (payload) => api.post('/problems', payload);

export const updateProblemStatus = (problemId, status) =>
  api.post(`/problems/${problemId}/status`, { status });

export const deleteProblem = (problemId) => api.delete(`/problems/${problemId}`);

export const syncLeetcode = (payload) => api.post('/leetcode/sync', payload);

export const importLeetcode = (payload) => api.post('/leetcode/import', payload);
