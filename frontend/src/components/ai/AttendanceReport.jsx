import { useState } from 'react';
import { generateReport } from '../../lib/aiApi.js';
import FilterForm from './FilterForm.jsx';
import AttendanceSummary from '../AttendanceSummary.jsx';

export default function AttendanceReport() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(filters) {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await generateReport(filters);
      setResult(res);
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal membuat laporan.');
    } finally {
      setLoading(false);
    }
  }

  const stats = result?.stats;

  return (
    <div className="space-y-5">
      <FilterForm onSubmit={run} loading={loading} requireSubjectClass />

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {stats && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">
              {stats.class_name} — {stats.subject_name}
            </h3>
            <p className="text-sm text-slate-500">
              {stats.period.from} s/d {stats.period.to} · {stats.session_count} sesi ·{' '}
              {stats.total} pertemuan
              {stats.attendanceRate !== null
                ? ` · kehadiran ${stats.attendanceRate}%`
                : ''}
            </p>
            <div className="mt-4">
              <AttendanceSummary summary={stats.counts} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Laporan Naratif (AI)
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {result.narrative}
            </p>
          </div>

          {stats.per_student?.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h4 className="border-b px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Rekap per Siswa
              </h4>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Nama</th>
                    <th className="px-4 py-2 font-medium">Hadir</th>
                    <th className="px-4 py-2 font-medium">Izin</th>
                    <th className="px-4 py-2 font-medium">Sakit</th>
                    <th className="px-4 py-2 font-medium">Alfa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.per_student.map((s) => (
                    <tr key={s.student_id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-medium text-slate-800">{s.full_name}</td>
                      <td className="px-4 py-2 tabular-nums text-emerald-700">{s.hadir}</td>
                      <td className="px-4 py-2 tabular-nums text-sky-700">{s.izin}</td>
                      <td className="px-4 py-2 tabular-nums text-amber-700">{s.sakit}</td>
                      <td className="px-4 py-2 tabular-nums text-rose-700">{s.alpa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
