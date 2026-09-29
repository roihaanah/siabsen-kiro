import { api } from './api.js';

// Data dashboard sesuai role user yang login (ditentukan backend).
export function fetchDashboard() {
  return api.get('/dashboard').then((r) => r.data);
}
