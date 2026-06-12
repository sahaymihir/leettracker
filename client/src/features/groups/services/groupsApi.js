import api from '@/shared/lib/api';

export const listGroups = () => api.getCached('/groups', {}, 15000);

export const getGroup = (groupId) => api.getCached(`/groups/${groupId}`, {}, 10000);

export const createGroup = (name) => api.post('/groups', { name });

export const deleteGroup = (groupId, name) =>
  api.delete(`/groups/${groupId}`, { data: { name } });

export const addGroupMember = (groupId, username) =>
  api.post(`/groups/${groupId}/members`, { username });

export const addProblemToGroup = (groupId, problemId) =>
  api.post(`/groups/${groupId}/problems`, { problem_id: problemId });

export const bulkAddProblemsToGroup = (groupId, problemIds) =>
  api.post(`/groups/${groupId}/problems/bulk`, { problem_ids: problemIds });
