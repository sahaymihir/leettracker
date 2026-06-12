import api from '@/shared/lib/api';

export const getDashboard = () => api.getCached('/dashboard', {}, 15000);

export const getHeatmap = () => api.getCached('/dashboard/heatmap?groupId=me', {}, 30000);
