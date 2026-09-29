import { Router } from 'express';
import { checkConnection } from '../config/db.js';
import {
  askAi,
  getFilterOptions,
  askData,
  generateReport,
  detectPatterns,
} from '../controllers/aiController.js';
import {
  getTeachers,
  getMyAssignments,
  getTeacherAssignments,
  openSession,
  submitSession,
} from '../controllers/attendanceController.js';
import {
  getClasses,
  getTeachersAdmin,
  postTeacher,
  putTeacher,
  getStudentsAdmin,
  postStudent,
  putStudent,
} from '../controllers/adminController.js';
import { login, me, logout } from '../controllers/authController.js';
import { getDashboard } from '../controllers/dashboardController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Health check dasar + status koneksi database.
router.get('/health', async (_req, res) => {
  let db = 'unknown';
  try {
    await checkConnection();
    db = 'connected';
  } catch {
    db = 'disconnected';
  }
  res.json({ status: 'ok', db, timestamp: new Date().toISOString() });
});

// --- Auth ------------------------------------------------------------------
router.post('/auth/login', login);
router.get('/auth/me', requireAuth, me);
router.post('/auth/logout', requireAuth, logout);

// --- Dashboard (data sesuai role user login) -------------------------------
router.get('/dashboard', requireAuth, getDashboard);

// --- Absensi (butuh login) -------------------------------------------------
router.get('/me/assignments', requireAuth, getMyAssignments);
router.get('/attendance/session', requireAuth, openSession);
router.post('/attendance/session', requireAuth, submitSession);

// --- Admin: kelola guru & siswa (khusus role admin) ------------------------
router.get('/admin/classes', requireAuth, requireRole('admin'), getClasses);
router.get('/admin/teachers', requireAuth, requireRole('admin'), getTeachersAdmin);
router.post('/admin/teachers', requireAuth, requireRole('admin'), postTeacher);
router.put('/admin/teachers/:id', requireAuth, requireRole('admin'), putTeacher);
router.get('/admin/students', requireAuth, requireRole('admin'), getStudentsAdmin);
router.post('/admin/students', requireAuth, requireRole('admin'), postStudent);
router.put('/admin/students/:id', requireAuth, requireRole('admin'), putStudent);

// Admin memilih guru & assignment-nya (untuk absensi atas nama guru bila perlu).
router.get('/teachers', requireAuth, requireRole('admin'), getTeachers);
router.get(
  '/teachers/:teacherId/assignments',
  requireAuth,
  requireRole('admin'),
  getTeacherAssignments
);

// --- Fitur AI (AWS Bedrock; butuh login) -----------------------------------
router.post('/ai/ask', requireAuth, askAi); // prompt bebas (legacy)
router.get('/ai/filter-options', requireAuth, getFilterOptions);
router.post('/ai/ask-data', requireAuth, askData);
router.post('/ai/report', requireAuth, generateReport);
router.post('/ai/patterns', requireAuth, detectPatterns);

export default router;
