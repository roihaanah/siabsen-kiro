/* eslint-disable camelcase */

/**
 * Menambahkan tabel roles (admin, guru, siswa) dan menautkannya ke data.
 *
 * Desain (Opsi A):
 * - Tabel roles berisi 3 peran.
 * - teachers.role_id  -> default 'guru' (admin disimpan di sini dengan role 'admin').
 * - students.role_id  -> default 'siswa'.
 */

export const shorthands = undefined;

export async function up(pgm) {
  // Tabel roles.
  pgm.createTable('roles', {
    id: 'id',
    name: { type: 'varchar(20)', notNull: true, unique: true },
    description: { type: 'varchar(120)' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Seed 3 role.
  pgm.sql(`
    INSERT INTO roles (name, description) VALUES
      ('admin', 'Administrator sistem'),
      ('guru', 'Guru pengajar'),
      ('siswa', 'Peserta didik')
    ON CONFLICT (name) DO NOTHING;
  `);

  // --- teachers.role_id -----------------------------------------------------
  // Awalnya nullable agar bisa mengisi baris lama, lalu dijadikan NOT NULL.
  pgm.addColumn('teachers', {
    role_id: {
      type: 'integer',
      references: '"roles"',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  });
  // Guru yang sudah ada diberi role 'guru', lalu set default ke id role 'guru'.
  // Default kolom tidak boleh berisi subquery, jadi id di-resolve saat migrasi
  // berjalan lewat EXECUTE.
  pgm.sql(`
    DO $$
    DECLARE guru_id integer;
    BEGIN
      SELECT id INTO guru_id FROM roles WHERE name = 'guru';
      UPDATE teachers SET role_id = guru_id WHERE role_id IS NULL;
      EXECUTE format('ALTER TABLE teachers ALTER COLUMN role_id SET DEFAULT %s', guru_id);
    END $$;
  `);
  pgm.alterColumn('teachers', 'role_id', { notNull: true });
  pgm.createIndex('teachers', 'role_id');

  // --- students.role_id -----------------------------------------------------
  pgm.addColumn('students', {
    role_id: {
      type: 'integer',
      references: '"roles"',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  });
  pgm.sql(`
    DO $$
    DECLARE siswa_id integer;
    BEGIN
      SELECT id INTO siswa_id FROM roles WHERE name = 'siswa';
      UPDATE students SET role_id = siswa_id WHERE role_id IS NULL;
      EXECUTE format('ALTER TABLE students ALTER COLUMN role_id SET DEFAULT %s', siswa_id);
    END $$;
  `);
  pgm.alterColumn('students', 'role_id', { notNull: true });
  pgm.createIndex('students', 'role_id');
}

export async function down(pgm) {
  pgm.dropColumn('students', 'role_id');
  pgm.dropColumn('teachers', 'role_id');
  pgm.dropTable('roles');
}
