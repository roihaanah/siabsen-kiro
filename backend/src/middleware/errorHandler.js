// Handler 404 untuk route yang tidak ditemukan.
export function notFound(_req, res) {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
}

// Handler error terpusat.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Terjadi kesalahan pada server.',
  });
}
