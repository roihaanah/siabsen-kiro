# Panduan Deploy ke Vercel

Repo ini berisi dua bagian yang di-deploy sebagai **dua project Vercel terpisah**:

- `frontend/` — React + Vite (static build)
- `backend/` — Node.js + Express (Vercel Function, zero-config)

Jangan pernah commit file `.env` (sudah diabaikan di `.gitignore`). Semua rahasia
di-set lewat Environment Variables di dashboard Vercel.

---

## 1. Deploy Backend (`backend/`)

Vercel mendeteksi Express secara otomatis (zero-config): `src/server.js` meng-export
Express app sebagai default dan menjalankan seluruh routing (termasuk prefix `/api`).
Saat berjalan di Vercel, `app.listen()` dilewati; saat lokal (`npm start`) tetap
membuka port.

**Root Directory:** `backend`

**Environment Variables (wajib):**

| Variabel | Contoh / Catatan |
| --- | --- |
| `DATABASE_URL` | Connection string Neon, harus mengandung `?sslmode=require` |
| `JWT_SECRET` | String acak panjang (mis. `openssl rand -hex 48`) |
| `CORS_ORIGIN` | URL frontend produksi, mis. `https://siabsen-fe.vercel.app` |
| `AWS_REGION` | mis. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Kredensial AWS Bedrock |
| `AWS_SECRET_ACCESS_KEY` | Kredensial AWS Bedrock |
| `BEDROCK_MODEL_ID` | mis. `amazon.nova-lite-v1:0` |

**Opsional:** `JWT_EXPIRES_IN` (default `8h`), `DATABASE_SSL` (SSL sudah otomatis
aktif bila `DATABASE_URL` memakai `sslmode=require`).

**Migration:** jalankan sekali dari mesin lokal yang menunjuk ke database produksi:

```bash
cd backend
# set DATABASE_URL ke Neon produksi lalu:
npm run migrate:up
```

---

## 2. Deploy Frontend (`frontend/`)

**Root Directory:** `frontend`
**Build Command:** `npm run build` · **Output Directory:** `dist`
(sudah tercantum di `frontend/vercel.json`).

**Environment Variables (wajib):**

| Variabel | Nilai |
| --- | --- |
| `VITE_API_URL` | URL backend + `/api`, mis. `https://siabsen-be.vercel.app/api` |

> `VITE_*` di-baca saat build. Setelah mengubahnya, lakukan redeploy frontend.

---

## 3. Checklist setelah deploy

1. Buka `https://<backend>/api/health` — harus `{"status":"ok","db":"connected"}`.
2. Set `CORS_ORIGIN` backend = domain frontend, lalu redeploy backend.
3. Set `VITE_API_URL` frontend = `https://<backend>/api`, lalu redeploy frontend.
4. Login dari frontend untuk memastikan koneksi FE → BE → DB berjalan.
