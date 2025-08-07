// API Configuration
export const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE}/auth/login`,
    REGISTER: `${API_BASE}/auth/register`,
    ME: `${API_BASE}/auth/me`
  },
  ANALYTICS: `${API_BASE}/analytics/summary`,
  CLICK_ANALYTICS: `${API_BASE}/analytics/clicks`,
  CAMPAIGNS: `${API_BASE}/campaigns`,
  LINKS: `${API_BASE}/tracking_links`,
  HEALTH: `${API_BASE}/health`,
  USERS: `${API_BASE}/admin/users`,
  CHANGE_PASSWORD: `${API_BASE}/auth/change_password`
};

