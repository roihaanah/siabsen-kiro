import { api } from './api.js';

// Opsi kelas & mapel sesuai role (untuk form report/pattern).
export function fetchAiFilterOptions() {
  return api.get('/ai/filter-options').then((r) => r.data);
}

// Ask Your Data (chat).
export function askData(question) {
  return api.post('/ai/ask-data', { question }).then((r) => r.data);
}

// Attendance Report.
export function generateReport({ classId, subjectId, from, to }) {
  return api
    .post('/ai/report', { classId, subjectId, from, to })
    .then((r) => r.data);
}

// Pattern Detection.
export function detectPatterns({ classId, subjectId, from, to }) {
  return api
    .post('/ai/patterns', { classId, subjectId, from, to })
    .then((r) => r.data);
}
