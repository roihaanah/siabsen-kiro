/* eslint-disable camelcase */

/**
 * Skema awal sistem absensi siswa.
 *
 * Relasi utama:
 * - students.class_id -> classes.id  (satu siswa tepat satu kelas)
 * - teacher_assignments (teacher, class, subject) unik
 *     menentukan guru yang boleh mengajar mata pelajaran pada kelas tertentu
 * - attendance_sessions (class, subject, teacher, date) unik
 *     satu sesi = satu guru, satu kelas, satu mapel, satu tanggal
 * - attendance_records (session, student) unik
 *     satu siswa tidak bisa punya record duplikat dalam satu sesi
 */

export const shorthands = undefined;

export async function up(pgm) {
  // Enum status kehadiran agar nilai konsisten.
  pgm.createType('attendance_status', ['hadir', 'izin', 'sakit', 'alpa']);

  // ---- classes -------------------------------------------------------------
  pgm.createTable('classes', {
    id: 'id',
    name: { type: 'varchar(50)', notNull: true },
    academic_year: { type: 'varchar(9)', notNull: true }, // mis. 2025/2026
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  // Nama kelas unik per tahun ajaran.
  pgm.addConstraint('classes', 'classes_name_year_unique', {
    unique: ['name', 'academic_year'],
  });

  // ---- subjects ------------------------------------------------------------
  pgm.createTable('subjects', {
    id: 'id',
    code: { type: 'varchar(20)', notNull: true, unique: true },
    name: { type: 'varchar(100)', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // ---- teachers ------------------------------------------------------------
  pgm.createTable('teachers', {
    id: 'id',
    nip: { type: 'varchar(30)', notNull: true, unique: true },
    full_name: { type: 'varchar(120)', notNull: true },
    email: { type: 'varchar(160)', unique: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // ---- students ------------------------------------------------------------
  // Satu siswa tepat satu kelas: class_id NOT NULL + FK ke classes.
  pgm.createTable('students', {
    id: 'id',
    nis: { type: 'varchar(30)', notNull: true, unique: true },
    full_name: { type: 'varchar(120)', notNull: true },
    class_id: {
      type: 'integer',
      notNull: true,
      references: '"classes"',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('students', 'class_id');
  // Unique (id, class_id) agar bisa jadi target composite FK dari records.
  pgm.addConstraint('students', 'students_id_class_key', {
    unique: ['id', 'class_id'],
  });

  // ---- teacher_assignments -------------------------------------------------
  // Menentukan guru yang boleh mengajar (subject) pada (class) tertentu.
  pgm.createTable('teacher_assignments', {
    id: 'id',
    teacher_id: {
      type: 'integer',
      notNull: true,
      references: '"teachers"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    class_id: {
      type: 'integer',
      notNull: true,
      references: '"classes"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    subject_id: {
      type: 'integer',
      notNull: true,
      references: '"subjects"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  // Kombinasi guru+kelas+mapel tidak boleh dobel.
  pgm.addConstraint(
    'teacher_assignments',
    'teacher_assignments_unique',
    { unique: ['teacher_id', 'class_id', 'subject_id'] }
  );
  // Unique tambahan agar bisa dijadikan target composite FK dari sesi absensi.
  pgm.addConstraint(
    'teacher_assignments',
    'teacher_assignments_combo_key',
    { unique: ['class_id', 'subject_id', 'teacher_id'] }
  );
  pgm.createIndex('teacher_assignments', 'class_id');
  pgm.createIndex('teacher_assignments', 'subject_id');

  // ---- attendance_sessions -------------------------------------------------
  // Satu sesi = satu guru, satu kelas, satu mapel, satu tanggal (unik).
  pgm.createTable('attendance_sessions', {
    id: 'id',
    class_id: {
      type: 'integer',
      notNull: true,
      references: '"classes"',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    subject_id: {
      type: 'integer',
      notNull: true,
      references: '"subjects"',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    teacher_id: {
      type: 'integer',
      notNull: true,
      references: '"teachers"',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    session_date: { type: 'date', notNull: true },
    note: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.addConstraint(
    'attendance_sessions',
    'attendance_sessions_unique',
    { unique: ['class_id', 'subject_id', 'teacher_id', 'session_date'] }
  );
  // Unique (id, class_id) agar bisa jadi target composite FK dari records,
  // sehingga siswa yang diabsen dipastikan berasal dari kelas sesi.
  pgm.addConstraint('attendance_sessions', 'attendance_sessions_id_class_key', {
    unique: ['id', 'class_id'],
  });
  // Composite FK: (class, subject, teacher) sesi harus cocok dengan
  // penugasan yang sah di teacher_assignments. Ini menegakkan aturan
  // "guru hanya boleh membuat sesi untuk mapel & kelas yang ditugaskan".
  pgm.addConstraint(
    'attendance_sessions',
    'attendance_sessions_assignment_fk',
    {
      foreignKeys: {
        columns: ['class_id', 'subject_id', 'teacher_id'],
        references: 'teacher_assignments (class_id, subject_id, teacher_id)',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
    }
  );
  pgm.createIndex('attendance_sessions', 'session_date');
  pgm.createIndex('attendance_sessions', 'teacher_id');

  // ---- attendance_records --------------------------------------------------
  // Satu siswa tidak boleh punya record duplikat dalam satu sesi.
  pgm.createTable('attendance_records', {
    id: 'id',
    session_id: {
      type: 'integer',
      notNull: true,
      references: '"attendance_sessions"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    student_id: {
      type: 'integer',
      notNull: true,
      references: '"students"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    // Didenormalisasi dari sesi & siswa untuk menegakkan bahwa siswa yang
    // diabsen benar-benar berasal dari kelas sesi (lewat composite FK).
    class_id: {
      type: 'integer',
      notNull: true,
      references: '"classes"',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    status: { type: 'attendance_status', notNull: true, default: 'hadir' },
    note: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.addConstraint(
    'attendance_records',
    'attendance_records_session_student_unique',
    { unique: ['session_id', 'student_id'] }
  );
  // (session_id, class_id) harus cocok dengan kelas sesinya.
  pgm.addConstraint('attendance_records', 'attendance_records_session_class_fk', {
    foreignKeys: {
      columns: ['session_id', 'class_id'],
      references: 'attendance_sessions (id, class_id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
  // (student_id, class_id) harus cocok dengan kelas siswanya.
  // Dua FK ini bersama menjamin siswa berasal dari kelas sesi.
  pgm.addConstraint('attendance_records', 'attendance_records_student_class_fk', {
    foreignKeys: {
      columns: ['student_id', 'class_id'],
      references: 'students (id, class_id)',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  });
  pgm.createIndex('attendance_records', 'student_id');
  pgm.createIndex('attendance_records', 'class_id');
}

export async function down(pgm) {
  pgm.dropTable('attendance_records');
  pgm.dropTable('attendance_sessions');
  pgm.dropTable('teacher_assignments');
  pgm.dropTable('students');
  pgm.dropTable('teachers');
  pgm.dropTable('subjects');
  pgm.dropTable('classes');
  pgm.dropType('attendance_status');
}
