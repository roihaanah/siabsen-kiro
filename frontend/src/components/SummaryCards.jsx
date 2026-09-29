import { STATUS } from '../lib/attendanceStatus.js';

// Kartu ringkasan jumlah per status. Bisa diklik untuk memfilter daftar.
export default function SummaryCards({ summary, total, activeFilter, onFilter }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATUS.map((s) => {
        const count = summary[s.value] || 0;
        const active = activeFilter === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onFilter(active ? 'all' : s.value)}
            className={`rounded-xl px-4 py-3 text-left ring-1 transition ${s.card} ${
              active ? 'ring-2 ring-offset-1' : 'hover:ring-2'
            }`}
            aria-pressed={active}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {count}
              {total ? (
                <span className="ml-1 text-sm font-normal opacity-70">/ {total}</span>
              ) : null}
            </p>
          </button>
        );
      })}
    </div>
  );
}
