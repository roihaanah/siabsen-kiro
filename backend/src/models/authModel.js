import { pool } from '../config/db.js';

/**
 * Cari user berdasarkan email di dua sumber:
 * - teachers (role: guru atau admin)
 * - students (role: siswa)
 *
 * Mengembalikan objek user termasuk password_hash, atau null bila tidak ada.
 * Field "kind" menandai tabel asal ('teacher' | 'student').
 */
export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `
    SELECT 'teacher' AS kind, t.id, t.full_name, t.email, t.password_hash,
           r.name AS role
    FROM teachers t
    JOIN roles r ON r.id = t.role_id
    WHERE lower(t.email) = lower($1)
    UNION ALL
    SELECT 'student' AS kind, s.id, s.full_name, s.email, s.password_hash,
           r.name AS role
    FROM students s
    JOIN roles r ON r.id = s.role_id
    WHERE lower(s.email) = lower($1)
    LIMIT 1;
    `,
    [email]
  );
  return rows[0] || null;
}

/**
 * Ambil profil user (tanpa password) berdasarkan kind + id.
 * Dipakai endpoint /me setelah token diverifikasi.
 */
export async function findUserByIdentity(kind, id) {
  if (kind === 'teacher') {
    const { rows } = await pool.query(
      `SELECT 'teacher' AS kind, t.id, t.full_name, t.email, r.name AS role
       FROM teachers t JOIN roles r ON r.id = t.role_id
       WHERE t.id = $1;`,
      [id]
    );
    return rows[0] || null;
  }
  if (kind === 'student') {
    const { rows } = await pool.query(
      `SELECT 'student' AS kind, s.id, s.full_name, s.email, r.name AS role,
              s.class_id
       FROM students s JOIN roles r ON r.id = s.role_id
       WHERE s.id = $1;`,
      [id]
    );
    return rows[0] || null;
  }
  return null;
}
