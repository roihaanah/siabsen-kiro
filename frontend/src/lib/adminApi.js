import { api } from './api.js';

// Classes (untuk dropdown siswa)
export function fetchClasses() {
  return api.get('/admin/classes').then((r) => r.data);
}

// Teachers
export function fetchTeachersAdmin() {
  return api.get('/admin/teachers').then((r) => r.data);
}
export function createTeacher(payload) {
  return api.post('/admin/teachers', payload).then((r) => r.data);
}
export function updateTeacher(id, payload) {
  return api.put(`/admin/teachers/${id}`, payload).then((r) => r.data);
}

// Students
export function fetchStudentsAdmin() {
  return api.get('/admin/students').then((r) => r.data);
}
export function createStudent(payload) {
  return api.post('/admin/students', payload).then((r) => r.data);
}
export function updateStudent(id, payload) {
  return api.put(`/admin/students/${id}`, payload).then((r) => r.data);
}
