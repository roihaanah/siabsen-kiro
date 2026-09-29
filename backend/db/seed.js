// Seed data realistis untuk pengujian sistem absensi.
// Idempotent: aman dijalankan berulang (memakai ON CONFLICT pada natural key).
// Membaca DATABASE_URL dari .env melalui konfigurasi pool aplikasi.
import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const ACADEMIC_YEAR = '2025/2026';

// Password default untuk SEMUA akun seed (khusus testing/dev).
// Ganti di produksi. Email dipakai untuk login.
const DEFAULT_PASSWORD = 'Password123!';

// Akun admin (disimpan di tabel teachers dengan role 'admin').
const admin = {
  nip: 'ADMIN0001',
  full_name: 'Administrator',
  email: 'admin@sekolah.sch.id',
};

// --- Data dasar -------------------------------------------------------------
const classes = [
  { name: 'X-IPA-1', academic_year: ACADEMIC_YEAR },
  { name: 'X-IPA-2', academic_year: ACADEMIC_YEAR },
  { name: 'XI-IPS-1', academic_year: ACADEMIC_YEAR },
];

const subjects = [
  { code: 'MTK', name: 'Matematika' },
  { code: 'BIO', name: 'Biologi' },
  { code: 'BIN', name: 'Bahasa Indonesia' },
  { code: 'BIG', name: 'Bahasa Inggris' },
  { code: 'SEJ', name: 'Sejarah' },
];

const teachers = [
  { nip: '198501012010011001', full_name: 'Budi Santoso', email: 'budi.santoso@sekolah.sch.id' },
  { nip: '198703152011012002', full_name: 'Siti Rahmawati', email: 'siti.rahmawati@sekolah.sch.id' },
  { nip: '199002102012011003', full_name: 'Agus Prasetyo', email: 'agus.prasetyo@sekolah.sch.id' },
  { nip: '199205252013012004', full_name: 'Dewi Lestari', email: 'dewi.lestari@sekolah.sch.id' },
];

// Siswa per kelas (dipetakan lewat nama kelas).
const studentsByClass = {
  'X-IPA-1': [
    { nis: '2025001', full_name: 'Ahmad Fauzi' },
    { nis: '2025002', full_name: 'Bella Anggraini' },
    { nis: '2025003', full_name: 'Candra Wijaya' },
    { nis: '2025004', full_name: 'Dinda Permata' },
  ],
  'X-IPA-2': [
    { nis: '2025005', full_name: 'Eko Nugroho' },
    { nis: '2025006', full_name: 'Fitri Handayani' },
    { nis: '2025007', full_name: 'Gilang Ramadhan' },
  ],
  'XI-IPS-1': [
    { nis: '2025008', full_name: 'Hana Salsabila' },
    { nis: '2025009', full_name: 'Irfan Maulana' },
    { nis: '2025010', full_name: 'Joko Susilo' },
    { nis: '2025011', full_name: 'Kartika Sari' },
  ],
};

// Assignment: guru -> (kelas, mapel). Menentukan akses guru.
// Dipetakan lewat nip + nama kelas + kode mapel.
const assignments = [
  // Budi mengajar Matematika di dua kelas X-IPA.
  { nip: '198501012010011001', class: 'X-IPA-1', subject: 'MTK' },
  { nip: '198501012010011001', class: 'X-IPA-2', subject: 'MTK' },
  // Siti mengajar Biologi di X-IPA-1 dan Bahasa Indonesia di X-IPA-2.
  { nip: '198703152011012002', class: 'X-IPA-1', subject: 'BIO' },
  { nip: '198703152011012002', class: 'X-IPA-2', subject: 'BIN' },
  // Agus mengajar Bahasa Inggris di X-IPA-1 dan XI-IPS-1.
  { nip: '199002102012011003', class: 'X-IPA-1', subject: 'BIG' },
  { nip: '199002102012011003', class: 'XI-IPS-1', subject: 'BIG' },
  // Dewi mengajar Sejarah di XI-IPS-1.
  { nip: '199205252013012004', class: 'XI-IPS-1', subject: 'SEJ' },
];

// Email siswa dibuat dari NIS agar unik & konsisten.
function studentEmail(nis) {
  return `siswa${nis}@sekolah.sch.id`;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Hash password default sekali, dipakai untuk semua akun seed.
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // Pastikan role ada (roles di-seed oleh migration; ambil id-nya).
    const { rows: roleRows } = await client.query(
      `SELECT id, name FROM roles WHERE name IN ('admin', 'guru', 'siswa');`
    );
    const roleId = Object.fromEntries(roleRows.map((r) => [r.name, r.id]));
    if (!roleId.admin || !roleId.guru || !roleId.siswa) {
      throw new Error('Role admin/guru/siswa belum ada. Jalankan migration dulu.');
    }

    // Akun admin (di tabel teachers, role admin).
    await client.query(
      `INSERT INTO teachers (nip, full_name, email, password_hash, role_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (nip) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role_id = EXCLUDED.role_id;`,
      [admin.nip, admin.full_name, admin.email, passwordHash, roleId.admin]
    );

    // classes
    const classId = {};
    for (const c of classes) {
      const { rows } = await client.query(
        `INSERT INTO classes (name, academic_year)
         VALUES ($1, $2)
         ON CONFLICT (name, academic_year) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name;`,
        [c.name, c.academic_year]
      );
      classId[rows[0].name] = rows[0].id;
    }

    // subjects
    const subjectId = {};
    for (const s of subjects) {
      const { rows } = await client.query(
        `INSERT INTO subjects (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code;`,
        [s.code, s.name]
      );
      subjectId[rows[0].code] = rows[0].id;
    }

    // teachers
    const teacherId = {};
    for (const t of teachers) {
      const { rows } = await client.query(
        `INSERT INTO teachers (nip, full_name, email, password_hash, role_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (nip) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role_id = EXCLUDED.role_id
         RETURNING id, nip;`,
        [t.nip, t.full_name, t.email, passwordHash, roleId.guru]
      );
      teacherId[rows[0].nip] = rows[0].id;
    }

    // students (per kelas)
    let studentCount = 0;
    for (const [className, list] of Object.entries(studentsByClass)) {
      const cid = classId[className];
      for (const st of list) {
        await client.query(
          `INSERT INTO students (nis, full_name, class_id, email, password_hash, role_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (nis) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             class_id = EXCLUDED.class_id,
             email = EXCLUDED.email,
             password_hash = EXCLUDED.password_hash,
             role_id = EXCLUDED.role_id;`,
          [
            st.nis,
            st.full_name,
            cid,
            studentEmail(st.nis),
            passwordHash,
            roleId.siswa,
          ]
        );
        studentCount += 1;
      }
    }

    // teacher_assignments
    for (const a of assignments) {
      await client.query(
        `INSERT INTO teacher_assignments (teacher_id, class_id, subject_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (teacher_id, class_id, subject_id) DO NOTHING;`,
        [teacherId[a.nip], classId[a.class], subjectId[a.subject]]
      );
    }

    await client.query('COMMIT');
    console.log('Seed berhasil:');
    console.log(`  admin     : 1 (${admin.email})`);
    console.log(`  classes   : ${classes.length}`);
    console.log(`  subjects  : ${subjects.length}`);
    console.log(`  teachers  : ${teachers.length}`);
    console.log(`  students  : ${studentCount}`);
    console.log(`  assignments: ${assignments.length}`);
    console.log('\nKredensial testing (semua akun):');
    console.log(`  password  : ${DEFAULT_PASSWORD}`);
    console.log(`  admin     : ${admin.email}`);
    console.log(`  guru      : ${teachers[0].email}`);
    console.log(`  siswa     : ${studentEmail('2025001')}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed gagal, transaksi di-rollback:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
