import {
  listTeachers,
  listAssignmentsByTeacher,
  listStudentsByClass,
  assignmentExists,
  getSessionWithRecords,
  saveSession,
} from '../models/attendanceModel.js';

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Tentukan teacherId efektif untuk sebuah request absensi.
 * - Guru: selalu memakai id dirinya sendiri (dari token). Tidak bisa atas nama guru lain.
 * - Admin: boleh menyertakan teacherId eksplisit; jika tidak, dianggap tidak valid
 *   (admin bukan guru pengajar, jadi harus memilih guru).
 * Mengembalikan { teacherId, error } .
 */
function resolveTeacherId(req, explicitTeacherId) {
  const { kind, role, id } = req.user || {};
  if (role === 'guru' && kind === 'teacher') {
    return { teacherId: id };
  }
  if (role === 'admin') {
    const tid = toInt(explicitTeacherId);
    if (!tid) {
      return { error: 'Admin harus menyertakan teacherId yang valid.' };
    }
    return { teacherId: tid };
  }
  return { error: 'Role Anda tidak dapat melakukan absensi.' };
}

// GET /api/teachers  (untuk admin memilih guru)
export async function getTeachers(_req, res, next) {
  try {
    res.json(await listTeachers());
  } catch (err) {
    next(err);
  }
}

// GET /api/me/assignments — assignment milik guru yang sedang login.
export async function getMyAssignments(req, res, next) {
  try {
    const { role, kind, id } = req.user || {};
    if (role !== 'guru' || kind !== 'teacher') {
      // Admin/siswa tidak punya assignment mengajar.
      return res.json([]);
    }
    res.json(await listAssignmentsByTeacher(id));
  } catch (err) {
    next(err);
  }
}

// GET /api/teachers/:teacherId/assignments  (admin)
export async function getTeacherAssignments(req, res, next) {
  try {
    const teacherId = toInt(req.params.teacherId);
    if (!teacherId) return res.status(400).json({ error: 'teacherId tidak valid.' });
    res.json(await listAssignmentsByTeacher(teacherId));
  } catch (err) {
    next(err);
  }
}

// GET /api/attendance/session?classId=&subjectId=&date=[&teacherId=]
// Membuka sesi: kembalikan daftar siswa (default hadir) + record tersimpan.
export async function openSession(req, res, next) {
  try {
    const { teacherId, error } = resolveTeacherId(req, req.query.teacherId);
    if (error) return res.status(400).json({ error });

    const classId = toInt(req.query.classId);
    const subjectId = toInt(req.query.subjectId);
    const date = String(req.query.date || '');

    if (!classId || !subjectId || !DATE_RE.test(date)) {
      return res
        .status(400)
        .json({ error: 'Parameter classId, subjectId, date (YYYY-MM-DD) wajib.' });
    }

    // Guru hanya boleh membuka kelas/mapel yang menjadi assignment-nya.
    if (!(await assignmentExists(teacherId, classId, subjectId))) {
      return res.status(403).json({
        error: 'Kombinasi guru, kelas, dan mata pelajaran ini bukan assignment yang sah.',
      });
    }

    const students = await listStudentsByClass(classId);
    const { session, records } = await getSessionWithRecords({
      teacherId,
      classId,
      subjectId,
      date,
    });

    const savedByStudent = new Map(records.map((r) => [r.student_id, r]));
    const roster = students.map((s) => {
      const saved = savedByStudent.get(s.id);
      return {
        student_id: s.id,
        nis: s.nis,
        full_name: s.full_name,
        status: saved?.status || 'hadir',
        note: saved?.note || '',
      };
    });

    res.json({
      exists: Boolean(session),
      session_id: session?.id ?? null,
      note: session?.note ?? '',
      students: roster,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/attendance/session
// Body: { classId, subjectId, date, note?, records:[{student_id,status,note?}] [, teacherId (admin)] }
export async function submitSession(req, res, next) {
  try {
    const { classId, subjectId, date, note, records, teacherId: bodyTeacherId } =
      req.body || {};

    const { teacherId, error } = resolveTeacherId(req, bodyTeacherId);
    if (error) return res.status(400).json({ error });

    const cId = toInt(classId);
    const sId = toInt(subjectId);

    if (!cId || !sId || !DATE_RE.test(String(date || ''))) {
      return res
        .status(400)
        .json({ error: 'Field classId, subjectId, date (YYYY-MM-DD) wajib.' });
    }
    if (records && !Array.isArray(records)) {
      return res.status(400).json({ error: 'records harus berupa array.' });
    }

    // Validasi assignment guru sebelum menyimpan.
    if (!(await assignmentExists(teacherId, cId, sId))) {
      return res.status(403).json({
        error: 'Kombinasi guru, kelas, dan mata pelajaran ini bukan assignment yang sah.',
      });
    }

    const result = await saveSession({
      teacherId,
      classId: cId,
      subjectId: sId,
      date: String(date),
      note,
      records: records || [],
    });

    res.status(201).json({
      message: 'Absensi tersimpan.',
      session_id: result.sessionId,
      saved_records: result.savedRecords,
    });
  } catch (err) {
    next(err);
  }
}
