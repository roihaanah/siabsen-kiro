import { createApp } from './app.js';
import { config } from './config/env.js';
import { checkConnection } from './config/db.js';

const app = createApp();

// Jalankan HTTP listener hanya saat dijalankan sebagai server biasa (lokal /
// VM / container), BUKAN di lingkungan serverless Vercel. Vercel mendeteksi
// default export di bawah dan menangani request tanpa perlu app.listen().
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

// Default export dipakai Vercel (zero-config) sebagai handler Express.
export default app;
