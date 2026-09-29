import {
  adminDashboard,
  teacherDashboard,
  studentDashboard,
} from '../models/dashboardModel.js';

// GET /api/dashboard — data disesuaikan dengan role user yang login.
// Authorization: setiap role hanya menerima data yang boleh dilihatnya.
export async function getDashboard(req, res, next) {
  try {
    const { role, kind, id } = req.user || {};

    if (role === 'admin') {
      return res.json(await adminDashboard());
    }

    if (role === 'guru' && kind === 'teacher') {
      return res.json(await teacherDashboard(id));
    }

    if (role === 'siswa' && kind === 'student') {
      return res.json(await studentDashboard(id));
    }

    return res.status(403).json({ error: 'Role tidak dikenali untuk dashboard.' });
  } catch (err) {
    next(err);
  }
}
