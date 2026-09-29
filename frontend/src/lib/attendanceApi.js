import { api } from './api.js';

// Assignment milik guru yang sedang login.
export function fetchMyAssignments() {
  return api.get('/me/assignments').then((r) => r.data);
}

// Buka sesi absensi. teacherId diambil dari token di backend (guru),
// jadi cukup kirim classId, subjectId, date.
export function openSession({ classId, subjectId, date }) {
  return api
    .get('/attendance/session', { params: { classId, subjectId, date } })
    .then((r) => r.data);
}

export function saveSession(payload) {
  return api.post('/attendance/session', payload).then((r) => r.data);
}
