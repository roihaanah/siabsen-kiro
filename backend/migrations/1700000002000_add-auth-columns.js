/* eslint-disable camelcase */

/**
 * Menambahkan kolom untuk autentikasi berbasis email + password.
 *
 * - teachers.password_hash : hash bcrypt (nullable; diisi lewat seed / pendaftaran).
 * - students.email         : email login siswa (unik, nullable).
 * - students.password_hash : hash bcrypt (nullable).
 *
 * Nullable agar aman terhadap data lama; kelengkapan divalidasi di aplikasi.
 */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.addColumn('teachers', {
    password_hash: { type: 'varchar(255)' },
  });

  pgm.addColumn('students', {
    email: { type: 'varchar(160)' },
    password_hash: { type: 'varchar(255)' },
  });

  // Email siswa unik bila diisi (NULL diperbolehkan berulang).
  pgm.addConstraint('students', 'students_email_unique', {
    unique: ['email'],
  });
}

export async function down(pgm) {
  pgm.dropConstraint('students', 'students_email_unique');
  pgm.dropColumn('students', ['email', 'password_hash']);
  pgm.dropColumn('teachers', 'password_hash');
}
