import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

// SSL aktif bila DATABASE_SSL=true ATAU connection string sudah meminta SSL
// (mis. Neon memakai "?sslmode=require"). Dengan begitu tidak perlu credential
// atau flag tambahan di source code.
const urlWantsSsl = /sslmode=require|sslmode=verify/i.test(
  config.database.url || ''
);
const useSsl = config.database.ssl || urlWantsSsl;

// Pool koneksi PostgreSQL dipakai bersama seluruh aplikasi.
export const pool = new Pool({
  connectionString: config.database.url,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[db] Kesalahan tak terduga pada koneksi pool:', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}

// Cek koneksi database, dipanggil saat startup.
export async function checkConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}
