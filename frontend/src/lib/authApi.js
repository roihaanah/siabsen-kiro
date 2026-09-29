import { api } from './api.js';

export function loginRequest(email, password) {
  return api.post('/auth/login', { email, password }).then((r) => r.data);
}

export function fetchMe() {
  return api.get('/auth/me').then((r) => r.data.user);
}

export function logoutRequest() {
  return api.post('/auth/logout').then((r) => r.data);
}
