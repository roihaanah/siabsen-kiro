import { pool } from '../config/db.js';

/**
 * Model data untuk fitur AI. Semua ANGKA dihitung di sini (deterministik)
 * agar AI hanya menarasikan, bukan mengarang.
 *
 * "scope" membatasi data sesuai role:
 *   - admin  : { role:'admin' } — akses semua
 *   - guru   : { role:'guru', teacherId } — hanya sesi/kelas/mapel miliknya
 *   - siswa  : { role:'siswa', studentId, classId } — hanya dirinya
 */

const EMPTY_STATUS = () => ({ hadir: 0, izin: 0, sakit: 0, alpa: 0 });

function withPercentages(counts) {
  const total = counts.hadir + counts.izin + counts.sakit + counts.alpa;
  const pct = (n) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    counts,
    total,
    percentages: {
      hadir: pct(counts.hadir),
      izin: pct(counts.izin),
      sakit: pct(counts.sakit),
      alpa: pct(counts.alpa),
    },
    attendanceRate: total > 0 ? pct(counts.hadir) : null,
  };
}

// Opsi filter yang boleh dipilih user (untuk dropdown report/pattern).
export async function listFilterOptions(scope) {
  if (scope.role === 'guru') {
    const { rows } = await pool.query(
      `SELECT DISTINCT c.id AS class_id, c.name AS class_name,
              sub.id AS subject_id, sub.name AS subject_name
       FROM teacher_assignments ta
       JOIN classes c ON c.id = ta.class_id
       JOIN subjects sub ON sub.id = ta.subject_id
       WHERE ta.teacher_id = $1
       ORDER BY c.name, sub.name;`,
      [scope.teacherId]
    );
    return rows;
  }
  // admin: semua kombinasi kelas & mapel yang pernah/akan dipakai.
  const { rows } = await pool.query(
    `SELECT c.id AS class_id, c.name AS class_name,
            sub.id AS subject_id, sub.name AS subject_name
     FROM classes c CROSS JOIN subjects sub
     ORDER BY c.name, sub.name;`
  );
  return rows;
}

/**
 * Statistik laporan absensi untuk (class, subject, periode).
 * teacherId dipakai untuk membatasi guru ke sesinya sendiri.
 */
export async function attendanceStats({ scope, classId, subjectId, from, to }) {
  const params = [classId, subjectId, from, to];
  let teacherFilter = '';
  if (scope.role === 'guru') {
    params.push(scope.teacherId);
    teacherFilter = `AND ase.teacher_id = $${params.length}`;
  }

  // Distribusi status keseluruhan pada periode.
  const { rows: statusRows } = await pool.query(
    `SELECT ar.status, count(*)::int AS n
     FROM attendance_records ar
     JOIN attendance_sessions ase ON ase.id = ar.session_id
     WHERE ase.class_id = $1 AND ase.subject_id = $2
       AND ase.session_date BETWEEN $3 AND $4
       ${teacherFilter}
     GROUP BY ar.status;`,
    params
  );
  const counts = EMPTY_STATUS();
  for (const r of statusRows) counts[r.status] = r.n;

  // Jumlah sesi & pertemuan.
  const { rows: sessionRows } = await pool.query(
    `SELECT count(*)::int AS session_count
     FROM attendance_sessions ase
     WHERE ase.class_id = $1 AND ase.subject_id = $2
       AND ase.session_date BETWEEN $3 AND $4
       ${teacherFilter};`,
    params
  );

  // Per siswa: rekap status pada periode.
  const { rows: perStudent } = await pool.query(
    `SELECT s.id AS student_id, s.nis, s.full_name,
            count(*) FILTER (WHERE ar.status = 'hadir')::int AS hadir,
            count(*) FILTER (WHERE ar.status = 'izin')::int  AS izin,
            count(*) FILTER (WHERE ar.status = 'sakit')::int AS sakit,
            count(*) FILTER (WHERE ar.status = 'alpa')::int  AS alpa
     FROM attendance_records ar
     JOIN attendance_sessions ase ON ase.id = ar.session_id
     JOIN students s ON s.id = ar.student_id
     WHERE ase.class_id = $1 AND ase.subject_id = $2
       AND ase.session_date BETWEEN $3 AND $4
       ${teacherFilter}
     GROUP BY s.id, s.nis, s.full_name
     ORDER BY alpa DESC, s.full_name;`,
    params
  );

  // Konteks nama kelas & mapel.
  const { rows: ctx } = await pool.query(
    `SELECT c.name AS class_name, sub.name AS subject_name
     FROM classes c, subjects sub WHERE c.id = $1 AND sub.id = $2;`,
    [classId, subjectId]
  );

  return {
    class_name: ctx[0]?.class_name ?? null,
    subject_name: ctx[0]?.subject_name ?? null,
    period: { from, to },
    session_count: sessionRows[0] ? sessionRows[0].session_count : 0,
    ...withPercentages(counts),
    per_student: perStudent,
  };
}

/**
 * Data untuk deteksi pola: agregasi per bulan pada periode + daftar siswa
 * dengan ketidakhadiran (alpa) tertinggi. Dibatasi scope.
 */
export async function patternData({ scope, classId, subjectId, from, to }) {
  const params = [from, to];
  const filters = ['ase.session_date BETWEEN $1 AND $2'];
  if (classId) { params.push(classId); filters.push(`ase.class_id = $${params.length}`); }
  if (subjectId) { params.push(subjectId); filters.push(`ase.subject_id = $${params.length}`); }
  if (scope.role === 'guru') { params.push(scope.teacherId); filters.push(`ase.teacher_id = $${params.length}`); }
  const where = filters.join(' AND ');

  // Per bulan (YYYY-MM): distribusi status.
  const { rows: monthly } = await pool.query(
    `SELECT to_char(ase.session_date, 'YYYY-MM') AS period,
            count(*) FILTER (WHERE ar.status = 'hadir')::int AS hadir,
            count(*) FILTER (WHERE ar.status = 'izin')::int  AS izin,
            count(*) FILTER (WHERE ar.status = 'sakit')::int AS sakit,
            count(*) FILTER (WHERE ar.status = 'alpa')::int  AS alpa,
            count(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions ase ON ase.id = ar.session_id
     WHERE ${where}
     GROUP BY period ORDER BY period;`,
    params
  );

  const monthlyWithRate = monthly.map((m) => ({
    ...m,
    attendance_rate: m.total > 0 ? Math.round((m.hadir / m.total) * 1000) / 10 : 0,
  }));

  // Siswa dengan alpa terbanyak (top 10) pada periode.
  const { rows: topAbsent } = await pool.query(
    `SELECT s.id AS student_id, s.nis, s.full_name, c.name AS class_name,
            count(*) FILTER (WHERE ar.status = 'alpa')::int  AS alpa,
            count(*) FILTER (WHERE ar.status = 'sakit')::int AS sakit,
            count(*) FILTER (WHERE ar.status = 'izin')::int  AS izin,
            count(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions ase ON ase.id = ar.session_id
     JOIN students s ON s.id = ar.student_id
     JOIN classes c ON c.id = s.class_id
     WHERE ${where}
     GROUP BY s.id, s.nis, s.full_name, c.name
     HAVING count(*) FILTER (WHERE ar.status = 'alpa') > 0
     ORDER BY alpa DESC, s.full_name
     LIMIT 10;`,
    params
  );

  return { period: { from, to }, monthly: monthlyWithRate, top_absent: topAbsent };
}

/**
 * Snapshot ringkas untuk "Ask Your Data": fakta yang boleh dilihat user.
 * Dibatasi scope agar AI tidak menjawab di luar data yang tersedia.
 */
export async function dataSnapshot(scope) {
  if (scope.role === 'siswa') {
    const { rows: prof } = await pool.query(
      `SELECT s.full_name, s.nis, c.name AS class_name, c.academic_year
       FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = $1;`,
      [scope.studentId]
    );
    const { rows: st } = await pool.query(
      `SELECT status, count(*)::int AS n FROM attendance_records
       WHERE student_id = $1 GROUP BY status;`,
      [scope.studentId]
    );
    const counts = EMPTY_STATUS();
    for (const r of st) counts[r.status] = r.n;
    return {
      scope: 'siswa',
      student: prof[0] || null,
      my_attendance: withPercentages(counts),
    };
  }

  if (scope.role === 'guru') {
    const { rows: prof } = await pool.query(
      `SELECT full_name, nip, email FROM teachers WHERE id = $1;`,
      [scope.teacherId]
    );
    const { rows: asg } = await pool.query(
      `SELECT c.name AS class_name, sub.name AS subject_name
       FROM teacher_assignments ta
       JOIN classes c ON c.id = ta.class_id
       JOIN subjects sub ON sub.id = ta.subject_id
       WHERE ta.teacher_id = $1 ORDER BY c.name, sub.name;`,
      [scope.teacherId]
    );
    const { rows: st } = await pool.query(
      `SELECT ar.status, count(*)::int AS n
       FROM attendance_records ar
       JOIN attendance_sessions ase ON ase.id = ar.session_id
       WHERE ase.teacher_id = $1 GROUP BY ar.status;`,
      [scope.teacherId]
    );
    const counts = EMPTY_STATUS();
    for (const r of st) counts[r.status] = r.n;
    const { rows: sess } = await pool.query(
      `SELECT count(*)::int AS n FROM attendance_sessions WHERE teacher_id = $1;`,
      [scope.teacherId]
    );
    return {
      scope: 'guru',
      teacher: prof[0] || null,
      assignments: asg,
      session_count: sess[0].n,
      attendance_summary: withPercentages(counts),
    };
  }

  // admin: ringkasan sistem.
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*) FROM teachers t JOIN roles r ON r.id=t.role_id WHERE r.name='guru')::int AS teachers,
      (SELECT count(*) FROM teachers t JOIN roles r ON r.id=t.role_id WHERE r.name='admin')::int AS admins,
      (SELECT count(*) FROM students)::int AS students,
      (SELECT count(*) FROM classes)::int AS classes,
      (SELECT count(*) FROM subjects)::int AS subjects,
      (SELECT count(*) FROM attendance_sessions)::int AS sessions,
      (SELECT count(*) FROM attendance_records)::int AS records;
  `);
  const { rows: st } = await pool.query(
    `SELECT status, count(*)::int AS n FROM attendance_records GROUP BY status;`
  );
  const counts = EMPTY_STATUS();
  for (const r of st) counts[r.status] = r.n;
  const { rows: perClass } = await pool.query(
    `SELECT c.name AS class_name, count(s.id)::int AS students
     FROM classes c LEFT JOIN students s ON s.class_id = c.id
     GROUP BY c.name ORDER BY c.name;`
  );
  return {
    scope: 'admin',
    totals: rows[0],
    attendance_summary: withPercentages(counts),
    students_per_class: perClass,
  };
}
