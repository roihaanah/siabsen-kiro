import { useEffect, useMemo, useState } from 'react';
import { fetchAiFilterOptions } from '../../lib/aiApi.js';

function firstOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
}
function todayIso() {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Form filter kelas & mapel + rentang tanggal.
 * requireSubjectClass: bila true, kelas & mapel wajib (untuk Report).
 * Memanggil onSubmit({ classId, subjectId, from, to }).
 */
export default function FilterForm({ onSubmit, loading, requireSubjectClass }) {
  const [options, setOptions] = useState([]);
  const [key, setKey] = useState(''); // "classId:subjectId"
  const [from, setFrom] = useState(firstOfMonthIso());
  const [to, setTo] = useState(todayIso());
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    fetchAiFilterOptions()
      .then(setOptions)
      .catch(() => setLoadErr('Gagal memuat opsi kelas & mapel.'));
  }, []);

  const selected = useMemo(() => {
    if (!key) return null;
    const [classId, subjectId] = key.split(':').map(Number);
    return { classId, subjectId };
  }, [key]);

  function submit(e) {
    e.preventDefault();
    onSubmit({
      classId: selected?.classId ?? null,
      subjectId: selected?.subjectId ?? null,
      from,
      to,
    });
  }

  const canSubmit =
    from && to && (!requireSubjectClass || Boolean(selected));

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium text-slate-700">
          Kelas &amp; Mata Pelajaran{requireSubjectClass ? '' : ' (opsional)'}
        </span>
        <select
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        >
          <option value="">
            {requireSubjectClass ? 'Pilih kelas & mapel…' : 'Semua (yang boleh diakses)'}
          </option>
          {options.map((o) => (
            <option key={`${o.class_id}:${o.subject_id}`} value={`${o.class_id}:${o.subject_id}`}>
              {o.class_name} — {o.subject_name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700">Dari</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-slate-700">Sampai</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <div className="sm:col-span-2 lg:col-span-4">
        {loadErr && <p className="mb-2 text-sm text-rose-600">{loadErr}</p>}
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {loading ? 'Memproses…' : 'Buat dengan AI'}
        </button>
      </div>
    </form>
  );
}
