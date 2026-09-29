import { askBedrock } from '../services/bedrock.js';
import {
  askYourData,
  attendanceReport,
  patternDetection,
} from '../services/aiService.js';
import { listFilterOptions } from '../models/aiModel.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Bangun scope authorization dari user login.
function scopeFromUser(user) {
  if (user.role === 'admin') return { role: 'admin' };
  if (user.role === 'guru' && user.kind === 'teacher')
    return { role: 'guru', teacherId: user.id };
  if (user.role === 'siswa' && user.kind === 'student')
    return { role: 'siswa', studentId: user.id };
  return null;
}

// Bungkus error Bedrock agar pesannya jelas ke klien alih-alih 500 mentah.
function bedrockError(err, res) {
  const name = err?.name || '';

  // Kredensial / otorisasi AWS.
  if (
    name.includes('Credential') ||
    name.includes('UnrecognizedClient') ||
    name.includes('AccessDenied') ||
    err?.code === 'CredentialsProviderError'
  ) {
    return res.status(502).json({
      error:
        'Layanan AI belum dapat diakses. Periksa konfigurasi AWS Bedrock (kredensial/region) di environment.',
    });
  }

  // Model tidak ditemukan / EOL / tidak valid untuk region.
  if (name.includes('ResourceNotFound') || name.includes('Validation')) {
    return res.status(502).json({
      error:
        'Model AI tidak tersedia. Periksa BEDROCK_MODEL_ID (mis. gunakan inference profile Claude yang aktif untuk region Anda).',
    });
  }

  // Kuota / throttling.
  if (name.includes('Throttling') || name.includes('TooManyRequests')) {
    return res.status(503).json({
      error: 'Layanan AI sedang sibuk. Coba lagi beberapa saat.',
    });
  }

  return null;
}

// POST /api/ai/ask — endpoint lama (prompt bebas). Dipertahankan.
export async function askAi(req, res, next) {
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Field "prompt" wajib diisi.' });
    }
    const answer = await askBedrock(prompt);
    return res.json({ answer });
  } catch (err) {
    if (bedrockError(err, res)) return;
    return next(err);
  }
}

// GET /api/ai/filter-options — opsi kelas & mapel sesuai role (untuk form).
export async function getFilterOptions(req, res, next) {
  try {
    const scope = scopeFromUser(req.user);
    if (!scope) return res.status(403).json({ error: 'Role tidak didukung.' });
    if (scope.role === 'siswa') return res.json([]); // siswa tak memilih filter
    return res.json(await listFilterOptions(scope));
  } catch (err) {
    return next(err);
  }
}

// POST /api/ai/ask-data  { question }
export async function askData(req, res, next) {
  try {
    const scope = scopeFromUser(req.user);
    if (!scope) return res.status(403).json({ error: 'Role tidak didukung.' });

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Pertanyaan wajib diisi.' });
    }
    const result = await askYourData({ scope, question: question.trim() });
    return res.json(result);
  } catch (err) {
    if (bedrockError(err, res)) return;
    return next(err);
  }
}

// POST /api/ai/report  { classId, subjectId, from, to }
export async function generateReport(req, res, next) {
  try {
    const scope = scopeFromUser(req.user);
    if (!scope || scope.role === 'siswa') {
      return res.status(403).json({ error: 'Fitur ini untuk guru dan admin.' });
    }

    const classId = toInt(req.body?.classId);
    const subjectId = toInt(req.body?.subjectId);
    const from = String(req.body?.from || '');
    const to = String(req.body?.to || '');

    if (!classId || !subjectId || !DATE_RE.test(from) || !DATE_RE.test(to)) {
      return res.status(400).json({
        error: 'classId, subjectId, from & to (YYYY-MM-DD) wajib.',
      });
    }

    const result = await attendanceReport({ scope, classId, subjectId, from, to });
    return res.json(result);
  } catch (err) {
    if (bedrockError(err, res)) return;
    return next(err);
  }
}

// POST /api/ai/patterns  { classId?, subjectId?, from, to }
export async function detectPatterns(req, res, next) {
  try {
    const scope = scopeFromUser(req.user);
    if (!scope || scope.role === 'siswa') {
      return res.status(403).json({ error: 'Fitur ini untuk guru dan admin.' });
    }

    const classId = req.body?.classId ? toInt(req.body.classId) : null;
    const subjectId = req.body?.subjectId ? toInt(req.body.subjectId) : null;
    const from = String(req.body?.from || '');
    const to = String(req.body?.to || '');

    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return res.status(400).json({ error: 'from & to (YYYY-MM-DD) wajib.' });
    }

    const result = await patternDetection({ scope, classId, subjectId, from, to });
    return res.json(result);
  } catch (err) {
    if (bedrockError(err, res)) return;
    return next(err);
  }
}
