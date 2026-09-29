import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const SALT_ROUNDS = 10;

// --- Classes (untuk dropdown) ----------------------------------------------
export async function listClasses() {
  const { rows } = await pool.query(
    `SELECT id, name, academic_year FROM classes ORDER BY name;`
  );
  return rows;
}

// --- Teachers ---------------------------------------------------------------
export async function listTeachersFull() {
  const { rows } = await pool.query(
    `SELECT t.id, t.nip, t.full_name, t.email, r.name AS role,
            (t.password_hash IS NOT NULL) AS has_password
     FROM teachers t JOIN roles r ON r.id = t.role_id
     ORDER BY t.full_name;`
  );
  return rows;
}

async function roleIdByName(client, name) {
  const { rows } = await client.query(`SELECT id FROM roles WHERE name = $1;`, [
    name,
  ]);
  return rows[0]?.id ?? null;
}

/**
 * Buat guru/admin. role harus 'guru' atau 'admin'.
 */
export async function createTeacher({ nip, full_name, email, password, role }) {
  const client = await pool.connect();
  try {
    const roleName = role === 'admin' ? 'admin' : 'guru';
    const roleId = await roleIdByName(client, roleName);
    const passwordHash = password
      ? await bcrypt.hash(String(password), SALT_ROUNDS)
      : null;

    const { rows } = await client.query(
      `INSERT INTO teachers (nip, full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nip, full_name, email;`,
      [nip, full_name, email, passwordHash, roleId]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

/**
 * Update guru. Field opsional; password hanya di-update bila diisi.
 */
export async function updateTeacher(id, { nip, full_name, email, password, role }) {
  const client = await pool.connect();
  try {
    const sets = [];
    const vals = [];
    let i = 1;

    if (nip !== undefined) { sets.push(`nip = $${i++}`); vals.push(nip); }
    if (full_name !== undefined) { sets.push(`full_name = $${i++}`); vals.push(full_name); }
    if (email !== undefined) { sets.push(`email = $${i++}`); vals.push(email); }
    if (role !== undefined) {
      const roleId = await roleIdByName(client, role === 'admin' ? 'admin' : 'guru');
      sets.push(`role_id = $${i++}`); vals.push(roleId);
    }
    if (password) {
      const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
      sets.push(`password_hash = $${i++}`); vals.push(hash);
    }
    if (sets.length === 0) return null;

    vals.push(id);
    const { rows } = await client.query(
      `UPDATE teachers SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, nip, full_name, email;`,
      vals
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

// --- Students ---------------------------------------------------------------
export async function listStudentsFull() {
  const { rows } = await pool.query(
    `SELECT s.id, s.nis, s.full_name, s.email, s.class_id,
            c.name AS class_name, r.name AS role,
            (s.password_hash IS NOT NULL) AS has_password
     FROM students s
     JOIN classes c ON c.id = s.class_id
     JOIN roles r ON r.id = s.role_id
     ORDER BY s.full_name;`
  );
  return rows;
}

export async function createStudent({ nis, full_name, email, password, class_id }) {
  const client = await pool.connect();
  try {
    const roleId = await roleIdByName(client, 'siswa');
    const passwordHash = password
      ? await bcrypt.hash(String(password), SALT_ROUNDS)
      : null;

    const { rows } = await client.query(
      `INSERT INTO students (nis, full_name, email, password_hash, class_id, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nis, full_name, email, class_id;`,
      [nis, full_name, email, passwordHash, class_id, roleId]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

export async function updateStudent(id, { nis, full_name, email, password, class_id }) {
  const client = await pool.connect();
  try {
    const sets = [];
    const vals = [];
    let i = 1;

    if (nis !== undefined) { sets.push(`nis = $${i++}`); vals.push(nis); }
    if (full_name !== undefined) { sets.push(`full_name = $${i++}`); vals.push(full_name); }
    if (email !== undefined) { sets.push(`email = $${i++}`); vals.push(email); }
    if (class_id !== undefined) { sets.push(`class_id = $${i++}`); vals.push(class_id); }
    if (password) {
      const hash = await bcrypt.hash(String(password), SALT_ROUNDS);
      sets.push(`password_hash = $${i++}`); vals.push(hash);
    }
    if (sets.length === 0) return null;

    vals.push(id);
    const { rows } = await client.query(
      `UPDATE students SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, nis, full_name, email, class_id;`,
      vals
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}
