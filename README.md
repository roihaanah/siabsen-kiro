# SiAbsen — Sistem Absensi Siswa

Aplikasi web untuk membantu guru melakukan absensi siswa. Monorepo dengan dua bagian:

- `frontend/` — React + Vite + Tailwind CSS (JavaScript)
- `backend/` — Node.js + Express + PostgreSQL, dengan integrasi AWS Bedrock untuk fitur AI

## Prasyarat

- Node.js 18 atau lebih baru
- PostgreSQL (lokal atau managed seperti Neon/Supabase)
- Kredensial AWS dengan akses ke Bedrock (untuk fitur AI)

## Struktur Project

```
siabsen_kiro/
├── backend/
│   ├── db/README.md           # dokumentasi skema & relasi
│   ├── migrations/            # migration node-pg-migrate
│   └── src/
│       ├── config/            # env & koneksi database
│       ├── controllers/       # handler request
│       ├── middleware/        # error handler
│       ├── routes/            # definisi endpoint
│       ├── services/          # integrasi AWS Bedrock
│       ├── app.js             # setup Express
│       └── server.js          # entry point
└── frontend/
    └── src/
        ├── lib/api.js         # axios client
        ├── pages/             # halaman
        ├── App.jsx
        └── main.jsx
```

## Menjalankan Backend

```bash
cd backend
cp .env.example .env        # lalu isi nilainya
npm install
npm run migrate:up          # buat seluruh tabel (butuh DATABASE_URL valid)
npm run dev
```

Backend berjalan di `http://localhost:4000`. Cek `GET /api/health`.

Detail skema dan relasi tabel ada di `backend/db/README.md`.

### Skema Database

Tujuh tabel: `classes`, `subjects`, `teachers`, `students`, `teacher_assignments`,
`attendance_sessions`, `attendance_records`. Aturan integritas utama:

- Satu siswa tepat satu kelas (`students.class_id` NOT NULL).
- `teacher_assignments` menentukan guru yang boleh mengajar suatu mapel pada kelas tertentu (unik per kombinasi guru+kelas+mapel).
- Satu `attendance_session` unik per kombinasi kelas+mapel+guru+tanggal, dan hanya bisa dibuat untuk penugasan guru yang sah (composite FK ke `teacher_assignments`).
- Satu siswa tidak bisa punya record ganda dalam satu sesi (unik `session_id`+`student_id`), dan siswa yang diabsen dipastikan berasal dari kelas sesi tersebut.

## Menjalankan Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

## Endpoint yang Tersedia

- `GET /api/health` — status server dan koneksi database
- `POST /api/ai/ask` — contoh integrasi AWS Bedrock, body: `{ "prompt": "..." }`

## Deploy ke Vercel

Frontend dan backend di-deploy sebagai dua project Vercel terpisah (masing-masing punya `vercel.json`).

- **Frontend**: set root directory ke `frontend/`, tambahkan env `VITE_API_URL` yang menunjuk ke URL backend.
- **Backend**: set root directory ke `backend/`, tambahkan env `DATABASE_URL`, `DATABASE_SSL`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BEDROCK_MODEL_ID`, dan `CORS_ORIGIN` (URL frontend).

## Catatan

Ini baru struktur dan konfigurasi dasar. Fitur absensi (CRUD siswa, pencatatan kehadiran, laporan) ditambahkan bertahap.
