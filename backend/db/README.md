# Database

Skema database dikelola dengan migration (`node-pg-migrate`), bukan file SQL manual.
File migration ada di `backend/migrations/`.

## Diagram relasi (ringkas)

```
classes 1───* students
classes 1───* teacher_assignments *───1 teachers
subjects 1───* teacher_assignments
(teacher_assignments menentukan guru boleh mengajar subject pada class tertentu)

attendance_sessions  (class + subject + teacher + date, unik)
  └─ composite FK ke teacher_assignments (class, subject, teacher)
     → sesi hanya bisa dibuat untuk penugasan guru yang sah
attendance_sessions 1───* attendance_records *───1 students
  └─ (session_id, student_id) unik  → tidak ada record ganda per sesi
  └─ composite FK memastikan siswa berasal dari kelas sesi
```

## Menjalankan migration

Pastikan `DATABASE_URL` sudah di-set di `backend/.env`, lalu dari folder `backend/`:

```bash
npm install
npm run migrate:up      # jalankan semua migration
npm run migrate:down    # rollback satu migration terakhir
npm run migrate:create -- nama-migration   # buat migration baru
```

`node-pg-migrate` otomatis membaca `.env` di folder `backend/`.

Untuk melihat SQL tanpa mengeksekusi (dry run):

```bash
npm run migrate:up -- --dry-run
```
