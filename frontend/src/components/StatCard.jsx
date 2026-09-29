// Kartu statistik sederhana untuk dashboard.
export default function StatCard({ label, value, hint, accent = 'slate' }) {
  const accents = {
    slate: 'bg-slate-100 text-slate-700',
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            (accents[accent] || accents.slate).split(' ')[0]
          }`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
