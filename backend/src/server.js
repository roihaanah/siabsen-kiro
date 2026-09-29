import app from './app.js';
import { config } from './config/env.js';
import { checkConnection } from './config/db.js';

// Jalankan HTTP listener hanya saat dijalankan sebagai server biasa (lokal /
// VM / container), BUKAN di lingkungan serverless Vercel. Di Vercel, entry
// point (src/app.js) di-handle sebagai Vercel Function tanpa app.listen().
if (!process.env.VERCEL) {
  app.listen(config.port, async () => {
    console.log(`[server] Berjalan di port ${config.port}`);
    try {
      await checkConnection();
      console.log('[server] Koneksi database berhasil.');
    } catch (err) {
      console.warn('[server] Gagal terhubung ke database:', err.message);
    }
  });
}

export default app;
