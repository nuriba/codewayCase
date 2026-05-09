import axios from 'axios';
import { auth } from './firebase.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && unauthorizedHandler) {
      try { await unauthorizedHandler(); } catch { /* swallow */ }
    }
    return Promise.reject(err);
  },
);

export function apiErrorMessage(err, fallback = 'Something went wrong.') {
  return err?.response?.data?.error?.message || err?.message || fallback;
}

export default api;
