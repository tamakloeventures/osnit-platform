import axios from 'axios';

// Hardcode the URL temporarily for testing
const API_BASE_URL = 'https://osnit-api.onrender.com/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const getAlerts = () => api.get('/alerts');
export const getProtectees = () => api.get('/protectees');
export const getStats = () => api.get('/stats');
export const createProtectee = (data: any) => api.post('/protectees', data);
export const createAlert = (data: any) => api.post('/alerts', data);
export const updateAlert = (id: string, data: any) => api.put(`/alerts/${id}`, data);
export const getVettingPending = () => api.get('/vetting/pending');
export const reviewAlert = (id: string, data: any) => api.post(`/vetting/review/${id}`, data);
export const getThreatSearch = (protecteeId: string, params: any) => api.get(`/threats/search/${protecteeId}`, { params });
export const getThreatTimeline = (protecteeId: string, params: any) => api.get(`/threats/timeline/${protecteeId}`, { params });
export const getThreatReport = (protecteeId: string) => api.get(`/threats/report/${protecteeId}`);

// Combined dashboard data - ONE API CALL
export const getDashboardData = () => api.get('/dashboard');
