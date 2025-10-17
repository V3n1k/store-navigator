import axios from 'axios';

/**
 * Centralized axios instance for the admin frontend.
 * - Uses REACT_APP_API_BASE_URL (set in .env) as baseURL
 * - Attaches Authorization header if a token exists in localStorage
 * - Handles simple 401 -> redirect-to-login behavior; extendable for refresh tokens
 *
 * Usage:
 * import api from '../api/axiosInstance';
 * api.get('/api/admin/stores/1/sectors')
 */

const baseURL = process.env.REACT_APP_API_BASE_URL || '';

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get token helper (reads from localStorage).
// If you use a different auth storage (AuthContext), you can write token into localStorage
// after login or extend this module to accept a setter.
function getToken() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token');
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Attach token automatically to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      // Do not override existing Authorization if already set
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Simple response interceptor: handle 401 globally.
// You can extend this to trigger a refresh token flow.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Clear token and redirect to login
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('token');
        }
        // simple redirect; the AuthContext can also handle this more gracefully
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export default api;