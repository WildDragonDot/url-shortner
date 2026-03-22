/**
 * API client — backend se communicate karne ke liye
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token localStorage se attach karo
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;

// ─── Auth ────────────────────────────────────────────────────────
export const authAPI = {
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }),
  
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),

  deleteAccount: () => api.delete('/auth/account'),
};

// ─── URLs ────────────────────────────────────────────────────────
export const urlAPI = {
  create: (data: {
    url: string;
    alias?: string;
    expires_at?: string;
    password?: string;
    utm?: Record<string, string>;
  }) => api.post('/create', data),

  bulkCreate: (urls: Array<{ url: string; alias?: string }>) =>
    api.post('/bulk/create', { urls }),

  getAll: (page = 1, limit = 20) =>
    api.get(`/urls?page=${page}&limit=${limit}`),

  update: (code: string, data: { long_url?: string; expires_at?: string }) =>
    api.patch(`/urls/${code}`, data),

  delete: (code: string) => api.delete(`/urls/${code}`),

  toggle: (code: string) => api.patch(`/urls/${code}/toggle`),

  bulkDelete: (codes: string[]) =>
    Promise.all(codes.map(code => api.delete(`/urls/${code}`))),
};

// ─── Analytics ───────────────────────────────────────────────────
export const analyticsAPI = {
  getSummary: (code: string) => api.get(`/urls/${code}/analytics/summary`),
  
  getBreakdown: (code: string, dimension: string) =>
    api.get(`/urls/${code}/analytics/breakdown?by=${dimension}`),
  
  getTimeseries: (code: string, interval = 'day', days = 7) =>
    api.get(`/urls/${code}/analytics/timeseries?period=${days}d`),
};

// ─── QR Code ─────────────────────────────────────────────────────
export const qrAPI = {
  download: (code: string, format: 'png' | 'svg' = 'png', size = 512) =>
    `${API_URL}/${code}/qr?format=${format}&size=${size}`,
  
  getShareLink: (code: string) => api.get(`/${code}/qr/share`),
  
  getEmbedCode: (code: string) => api.get(`/${code}/qr/embed`),
};

// ─── API Keys ────────────────────────────────────────────────────
export const apiKeyAPI = {
  create: (name: string, expiresAt?: string) =>
    api.post('/api-keys', { name, expires_at: expiresAt }),
  
  getAll: () => api.get('/api-keys'),
  
  revoke: (id: string) => api.delete(`/api-keys/${id}`),
};

// ─── Webhooks ────────────────────────────────────────────────────
export const webhookAPI = {
  create: (data: { endpoint: string; short_url?: string; events?: string[] }) =>
    api.post('/webhooks', data),
  
  getAll: () => api.get('/webhooks'),
  
  update: (id: string, data: { endpoint?: string; events?: string[] }) =>
    api.patch(`/webhooks/${id}`, data),
  
  delete: (id: string) => api.delete(`/webhooks/${id}`),
};

// ─── Collections ─────────────────────────────────────────────────
export const collectionAPI = {
  create: (data: { slug: string; title?: string; description?: string; theme?: string }) =>
    api.post('/collections', data),
  
  getAll: () => api.get('/collections'),
  
  update: (slug: string, data: { title?: string; description?: string; theme?: string }) =>
    api.patch(`/collections/${slug}`, data),
  
  delete: (slug: string) => api.delete(`/collections/${slug}`),
  
  addLink: (slug: string, data: { short_url: string; label?: string; position?: number }) =>
    api.post(`/collections/${slug}/links`, data),
  
  removeLink: (slug: string, linkId: string) =>
    api.delete(`/collections/${slug}/links/${linkId}`),
  
  reorderLinks: (slug: string, order: string[]) =>
    api.patch(`/collections/${slug}/links/reorder`, { order }),
};

// ─── A/B Tests ───────────────────────────────────────────────────
export const abTestAPI = {
  create: (code: string, variants: Array<{ url: string; weight: number; label?: string }>) =>
    api.post(`/urls/${code}/ab-test`, { variants }),
  
  get: (code: string) => api.get(`/urls/${code}/ab-test`),
  
  delete: (code: string) => api.delete(`/urls/${code}/ab-test`),
};

// ─── Routing Rules ───────────────────────────────────────────────
export const routingAPI = {
  create: (code: string, data: {
    rule_type: 'geo' | 'device' | 'os';
    condition: string;
    target_url: string;
    priority?: number;
  }) => api.post(`/urls/${code}/routing-rules`, data),
  
  getAll: (code: string) => api.get(`/urls/${code}/routing-rules`),
  
  delete: (code: string, ruleId: string) =>
    api.delete(`/urls/${code}/routing-rules/${ruleId}`),
};

// ─── URL Info ────────────────────────────────────────────────
export const urlInfoAPI = {
  get: (code: string) => api.get(`/urls/${code}`),
};
