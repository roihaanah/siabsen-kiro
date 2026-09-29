import { pool } from '../config/db.js';

/**
 * Dashboard ADMIN: ringkasan sistem menyeluruh.
 */
export async function adminDashboard() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*) FROM teachers t JOIN roles r ON r.id = t.role_id WHERE r.name = 'guru')  AS teacher_count,
      (SELECT count(*) FROM teachers t JOIN roles r ON r.id = t.role_id WHERE r.name = 'admin')  AS admin_count,
      (SELECT count(*) FROM students)                    AS student_count,
      (SELECT count(*) FROM classes)                     AS class_count,
      (SELECT count(*) FROM subjects)                    AS subject_count,
      (SELECT count(*) FROM teacher_assignments)         AS assignment_count,
      (SELECT count(*) FROM attendance_sessions)         AS session_count,
      (SELECT count(*) FROM attendance_records)          AS record_count;
  `);
  const counts = rows[0];

  // Distribusi status kehadiran keseluruhan.
  const { rows: statusRows } = await pool.query(`
    SELECT status, count(*)::int AS n
    FROM attendance_records GROUP BY status;
  `);
  const attendanceByStatus = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  for (const r of statusRows) attendanceByStatus[r.status] = r.n;

  // Jumlah siswa per kelas.
  const { rows: perClass } = await pool.query(`
    SELECT c.id, c.name AS class_name, c.academic_year,
           count(s.id)::int AS student_count
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id
    GROUP BY c.id, c.name, c.academic_year
    ORDER BY c.name;
  `);

  // Sesi absensi terbaru.
  const { rows: recentSessions } = await pool.query(`
    SELECT ase.id, ase.session_date, c.name AS class_name,
           sub.name AS subject_name, t.full_name AS teacher_name
    FROM attendance_sessions ase
    JOIN classes c ON c.id = ase.class_id
    JOIN subjects sub ON sub.id = ase.subject_id
    JOIN teachers t ON t.id = ase.teacher_id
    ORDER BY ase.session_date DESC, ase.id DESC
    LIMIT 5;
  `);

  return {
    role: 'admin',
    counts: {
      teachers: Number(counts.teacher_count),
      admins: Number(counts.admin_count),
      students: Number(counts.student_count),
      classes: Number(counts.class_count),
      subjects: Number(counts.subject_count),
      assignments: Number(counts.assignment_count),
      sessions: Number(counts.session_count),
      records: Number(counts.record_count),
    },
    attendanceByStatus,
    studentsPerClass: perClass,
    recentSessions,
  };
}

/**
 * Dashboard GURU: profil, assignment, dan ringkasan absensi untuk
 * kelas & mapel yang menjadi assignment-nya SAJA.
 */
export async function teacherDashboard(teacherId) {
  const { rows: profileRows } = await pool.query(
    `SELECT t.id, t.full_name, t.email, t.nip
     FROM teachers t WHERE t.id = $1;`,
    [teacherId]
  );
  const profile = profileRows[0] || null;

  const { rows: assignments } = await pool.query(
    `SELECT ta.id AS assignment_id,
            c.id AS class_id, c.name AS class_name,
            sub.id AS subject_id, sub.name AS subject_name
     FROM teacher_assignments ta
     JOIN classes c ON c.id = ta.class_id
     JOIN subjects sub ON sub.id = ta.subject_id
     WHERE ta.teacher_id = $1
     ORDER BY c.name, sub.name;`,
    [teacherId]
  );

  // Ringkasan sesi milik guru ini.
  const { rows: sessionAgg } = await pool.query(
    `SELECT count(*)::int AS session_count,
            count(DISTINCT class_id)::int AS class_count
     FROM attendance_sessions WHERE teacher_id = $1;`,
    [teacherId]
  );

  // Distribusi status kehadiran hanya dari sesi guru ini.
  const { rows: statusRows } = await pool.query(
    `SELECT ar.status, count(*)::int AS n
     FROM attendance_records ar
     JOIN attendance_sessions ase ON ase.id = ar.session_id
     WHERE ase.teacher_id = $1
     GROUP BY ar.status;`,
    [teacherId]
  );
  const attendanceByStatus = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  for (const r of statusRows) attendanceByStatus[r.status] = r.n;

  // Sesi terbaru guru ini.
  const { rows: recentSessions } = await pool.query(
    `SELECT ase.id, ase.session_date, c.name AS class_name, sub.name AS subject_name,
            (SELECT count(*)::int FROM attendance_records ar WHERE ar.session_id = ase.id) AS total_records
     FROM attendance_sessions ase
     JOIN classes c ON c.id = ase.class_id
     JOIN subjects sub ON sub.id = ase.subject_id
     WHERE ase.teacher_id = $1
     ORDER BY ase.session_date DESC, ase.id DESC
     LIMIT 5;`,
    [teacherId]
  );

  return {
    role: 'guru',
    profile,
    assignments,
    summary: {
      sessions: sessionAgg[0] ? Number(sessionAgg[0].session_count) : 0,
      classes: sessionAgg[0] ? Number(sessionAgg[0].class_count) : 0,
      assignments: assignments.length,
    },
    attendanceByStatus,
    recentSessions,
  };
}

/**
 * Dashboard SISWA: data dirinya sendiri, kelasnya, dan ringkasan kehadiran
 * miliknya SAJA.
 */
export async function studentDashboard(studentId) {
  const { rows: profileRows } = await pool.query(
    `SELECT s.id, s.full_name, s.nis, s.email,
            c.id AS class_id, c.name AS class_name, c.academic_year
     FROM students s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1;`,
    [studentId]
  );
  const profile = profileRows[0] || null;

  // Ringkasan kehadiran siswa ini.
  const { rows: statusRows } = await pool.query(
    `SELECT status, count(*)::int AS n
     FROM attendance_records WHERE student_id = $1
     GROUP BY status;`,
    [studentId]
  );
  const attendanceByStatus = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
  let total = 0;
  for (const r of statusRows) {
    attendanceByStatus[r.status] = r.n;
    total += r.n;
  }

  // Riwayat kehadiran terbaru siswa ini.
  const { rows: recentRecords } = await pool.query(
    `SELECT ar.status, ase.session_date,
            sub.name AS subject_name, t.full_name AS teacher_name
     FROM attendance_records ar
     JOIN attendance_sessions ase ON ase.id = ar.session_id
     JOIN subjects sub ON sub.id = ase.subject_id
     JOIN teachers t ON t.id = ase.teacher_id
     WHERE ar.student_id = $1
     ORDER BY ase.session_date DESC, ar.id DESC
     LIMIT 8;`,
    [studentId]
  );

  const attendanceRate =
    total > 0 ? Math.round((attendanceByStatus.hadir / total) * 100) : null;

  return {
    role: 'siswa',
    profile,
    attendanceByStatus,
    totalRecords: total,
    attendanceRate, // persentase hadir, null bila belum ada data
    recentRecords,
  };
}
