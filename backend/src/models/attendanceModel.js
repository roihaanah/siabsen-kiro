import { pool } from '../config/db.js';

// Daftar guru (untuk pemilihan; belum ada auth).
export async function listTeachers() {
  const { rows } = await pool.query(
    `SELECT id, nip, full_name, email FROM teachers ORDER BY full_name;`
  );
  return rows;
}

// Assignment milik seorang guru: kelas + mapel yang boleh diajar.
export async function listAssignmentsByTeacher(teacherId) {
  const { rows } = await pool.query(
    `SELECT ta.id AS assignment_id,
            c.id AS class_id, c.name AS class_name, c.academic_year,
            s.id AS subject_id, s.code AS subject_code, s.name AS subject_name
     FROM teacher_assignments ta
     JOIN classes c ON c.id = ta.class_id
     JOIN subjects s ON s.id = ta.subject_id
     WHERE ta.teacher_id = $1
     ORDER BY c.name, s.name;`,
    [teacherId]
  );
  return rows;
}

// Cek apakah kombinasi (guru, kelas, mapel) adalah assignment yang sah.
export async function assignmentExists(teacherId, classId, subjectId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM teacher_assignments
     WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3
     LIMIT 1;`,
    [teacherId, classId, subjectId]
  );
  return rows.length > 0;
}

// Daftar siswa pada suatu kelas.
export async function listStudentsByClass(classId) {
  const { rows } = await pool.query(
    `SELECT id, nis, full_name FROM students
     WHERE class_id = $1 ORDER BY full_name;`,
    [classId]
  );
  return rows;
}

// Ambil sesi absensi yang sudah ada beserta record-nya (jika ada),
// untuk kombinasi kelas+mapel+guru+tanggal.
export async function getSessionWithRecords({
  teacherId,
  classId,
  subjectId,
  date,
}) {
  const { rows: sessions } = await pool.query(
    `SELECT id, class_id, subject_id, teacher_id, session_date, note, created_at
     FROM attendance_sessions
     WHERE teacher_id = $1 AND class_id = $2 AND subject_id = $3 AND session_date = $4
     LIMIT 1;`,
    [teacherId, classId, subjectId, date]
  );
  if (sessions.length === 0) return { session: null, records: [] };

  const session = sessions[0];
  const { rows: records } = await pool.query(
    `SELECT ar.student_id, ar.status, ar.note
     FROM attendance_records ar
     WHERE ar.session_id = $1;`,
    [session.id]
  );
  return { session, records };
}

const VALID_STATUS = new Set(['hadir', 'izin', 'sakit', 'alpa']);

/**
 * Simpan (buat atau perbarui) sesi absensi beserta record siswa.
 * - Membuat sesi bila belum ada; jika sudah ada, dipakai ulang (tanpa duplikat sesi).
 * - Upsert record per siswa dengan ON CONFLICT (session_id, student_id),
 *   sehingga tidak mungkin ada record duplikat untuk siswa yang sama dalam satu sesi.
 * - Semua siswa yang tidak dikirim eksplisit dianggap 'hadir' (default).
 *
 * @param {object} p
 * @param {number} p.teacherId
 * @param {number} p.classId
 * @param {number} p.subjectId
 * @param {string} p.date - YYYY-MM-DD
 * @param {string=} p.note
 * @param {Array<{student_id:number,status:string,note?:string}>} p.records
 */
export async function saveSession({
  teacherId,
  classId,
  subjectId,
  date,
  note,
  records,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Daftar siswa sah di kelas ini (sumber kebenaran).
    const { rows: students } = await client.query(
      `SELECT id FROM students WHERE class_id = $1;`,
      [classId]
    );
    const validStudentIds = new Set(students.map((s) => s.id));

    // Petakan status yang dikirim guru (hanya yang bukan hadir yang biasanya dikirim).
    const statusByStudent = new Map();
    for (const r of records || []) {
      if (!validStudentIds.has(r.student_id)) {
        throw Object.assign(
          new Error(`Siswa ${r.student_id} bukan anggota kelas ini.`),
          { status: 400 }
        );
      }
      const status = String(r.status || 'hadir').toLowerCase();
      if (!VALID_STATUS.has(status)) {
        throw Object.assign(new Error(`Status tidak valid: ${r.status}`), {
          status: 400,
        });
      }
      statusByStudent.set(r.student_id, { status, note: r.note ?? null });
    }

    // Buat sesi bila belum ada; kalau sudah ada, pakai yang lama.
    const { rows: sessionRows } = await client.query(
      `INSERT INTO attendance_sessions (class_id, subject_id, teacher_id, session_date, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (class_id, subject_id, teacher_id, session_date)
       DO UPDATE SET note = EXCLUDED.note
       RETURNING id;`,
      [classId, subjectId, teacherId, date, note ?? null]
    );
    const sessionId = sessionRows[0].id;

    // Upsert satu record per siswa kelas. Default 'hadir'.
    let saved = 0;
    for (const studentId of validStudentIds) {
      const entry = statusByStudent.get(studentId) || {
        status: 'hadir',
        note: null,
      };
      await client.query(
        `INSERT INTO attendance_records (session_id, student_id, class_id, status, note)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;`,
        [sessionId, studentId, classId, entry.status, entry.note]
      );
      saved += 1;
    }

    await client.query('COMMIT');
    return { sessionId, savedRecords: saved };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
