import { generateNarrative } from './bedrock.js';
import {
  attendanceStats,
  patternData,
  dataSnapshot,
} from '../models/aiModel.js';

// Aturan main global untuk semua fitur AI: dilarang mengarang.
const BASE_RULES = [
  'Anda asisten analitik untuk sistem absensi sekolah "SiAbsen".',
  'HANYA gunakan data JSON yang diberikan. JANGAN mengarang angka, nama, kelas, atau fakta apa pun.',
  'Jika data tidak cukup untuk menjawab, katakan dengan jujur bahwa datanya tidak tersedia.',
  'Jangan menebak ALASAN siswa tidak hadir; data hanya berisi status kehadiran, bukan alasannya.',
  'Jawab dalam Bahasa Indonesia yang ringkas, jelas, dan profesional.',
].join(' ');

/**
 * 1) Ask Your Data — menjawab pertanyaan HANYA berdasarkan snapshot data
 *    yang boleh dilihat user (scope). Mengembalikan { answer, data }.
 */
export async function askYourData({ scope, question }) {
  const snapshot = await dataSnapshot(scope);

  const system =
    BASE_RULES +
    ' Anda menerima snapshot data yang menjadi SATU-SATUNYA sumber kebenaran. ' +
    'Bila pertanyaan menyangkut data di luar snapshot (mis. siswa/kelas yang tidak ada di dalamnya), ' +
    'jawab bahwa data tersebut tidak tersedia untuk Anda.';

  const prompt = [
    `Pertanyaan pengguna: "${question}"`,
    '',
    'Snapshot data (JSON) yang tersedia untuk pengguna ini:',
    '```json',
    JSON.stringify(snapshot, null, 2),
    '```',
    '',
    'Jawab pertanyaan hanya berdasarkan snapshot di atas.',
  ].join('\n');

  const answer = await generateNarrative({ system, prompt, maxTokens: 700 });
  return { answer, data: snapshot };
}

/**
 * 2) Attendance Report — statistik dihitung backend; AI hanya menarasikan.
 *    Mengembalikan { stats, narrative }.
 */
export async function attendanceReport({ scope, classId, subjectId, from, to }) {
  const stats = await attendanceStats({ scope, classId, subjectId, from, to });

  if (stats.total === 0) {
    return {
      stats,
      narrative:
        'Tidak ada data absensi pada kelas, mata pelajaran, dan periode yang dipilih.',
    };
  }

  const system =
    BASE_RULES +
    ' Buat laporan naratif absensi. WAJIB memakai angka persis seperti pada data. ' +
    'Jangan menambah atau mengubah angka. Sertakan gambaran umum, sorotan siswa dengan alpa tertinggi (bila ada), dan catatan singkat.';

  const prompt = [
    'Data statistik absensi (JSON) — gunakan angka ini apa adanya:',
    '```json',
    JSON.stringify(stats, null, 2),
    '```',
    '',
    'Tulis laporan naratif 2–4 paragraf yang mudah dipahami guru/kepala sekolah.',
  ].join('\n');

  const narrative = await generateNarrative({ system, prompt, maxTokens: 900 });
  return { stats, narrative };
}

/**
 * 3) Pattern Detection — AI menyoroti pola yang DIDUKUNG data lintas periode.
 *    Mengembalikan { data, analysis }.
 */
export async function patternDetection({ scope, classId, subjectId, from, to }) {
  const data = await patternData({ scope, classId, subjectId, from, to });

  const hasData = data.monthly.some((m) => m.total > 0);
  if (!hasData) {
    return {
      data,
      analysis: 'Tidak ada data absensi yang cukup pada periode ini untuk menganalisis pola.',
    };
  }

  const system =
    BASE_RULES +
    ' Analisis pola/tren absensi lintas periode. HANYA sebutkan pola yang benar-benar terlihat pada data ' +
    '(mis. kenaikan/penurunan alpa, perubahan persentase kehadiran antar bulan, siswa dengan alpa tinggi). ' +
    'Jangan menyimpulkan penyebab atau alasan. Bila tren tidak jelas, katakan demikian.';

  const prompt = [
    'Data pola absensi per periode (JSON):',
    '```json',
    JSON.stringify(data, null, 2),
    '```',
    '',
    'Sebutkan pola dan perubahan yang terlihat dalam poin-poin ringkas, lalu satu paragraf kesimpulan.',
  ].join('\n');

  const analysis = await generateNarrative({ system, prompt, maxTokens: 900 });
  return { data, analysis };
}
