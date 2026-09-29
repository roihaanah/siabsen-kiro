import { useState } from 'react';
import { detectPatterns } from '../../lib/aiApi.js';
import FilterForm from './FilterForm.jsx';

export default function PatternDetection() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(filters) {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await detectPatterns(filters);
      setResult(res);
    } catch (err) {
      setError(err?.response?.data?.error || 'Gagal menganalisis pola.');
    } finally {
      setLoading(false);
    }
  }

  const monthly = result?.data?.monthly || [];
  const topAbsent = result?.data?.top_absent || [];

  return (
    <div className="space-y-5">
      <FilterForm onSubmit={run} loading={loading} />

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Analisis Pola (AI)
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {result.analysis}
            </p>
          </div>

          {monthly.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h4 className="border-b px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Tren per Periode
              </h4>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2 font-medium">Periode</th>
                    <th className="px-4 py-2 font-medium">Hadir</th>
                    <th className="px-4 py-2 font-medium">Izin</th>
                    <th className="px-4 py-2 font-medium">Sakit</th>
                    <th className="px-4 py-2 font-medium">Alfa</th>
                    <th className="px-4 py-2 font-medium">% Hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthly.map((m) => (
                    <tr key={m.period} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-medium text-slate-800">{m.period}</td>
                      <td className="px-4 py-2 tabular-nums text-emerald-700">{m.hadir}</td>
                      <td className="px-4 py-2 tabular-nums text-sky-700">{m.izin}</td>
                      <td className="px-4 py-2 tabular-nums text-amber-700">{m.sakit}</td>
                      <td className="px-4 py-2 tabular-nums text-rose-700">{m.alpa}</td>
                      <td className="px-4 py-2 tabular-nums font-medium">{m.attendance_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {topAbsent.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <h4 className="border-b px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Siswa dengan Alfa Tertinggi
              </h4>
              <ul className="divide-y divide-slate-100">
                {topAbsent.map((s) => (
                  <li key={s.student_id} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.full_name}</p>
                      <p className="text-xs text-slate-400">{s.class_name} · NIS {s.nis}</p>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                      {s.alpa} alfa
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {monthly.length === 0 && (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Tidak ada data pada periode ini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
