import { STATUS } from '../lib/attendanceStatus.js';

// Ringkasan jumlah kehadiran per status (hadir/izin/sakit/alpa).
export default function AttendanceSummary({ summary }) {
  const total = STATUS.reduce((acc, s) => acc + (summary[s.value] || 0), 0);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STATUS.map((s) => {
        const count = summary[s.value] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div
            key={s.value}
            className={`rounded-xl px-4 py-3 ring-1 ${s.card}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
              <span className="text-sm font-medium">{s.label}</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
            <p className="text-xs opacity-70">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}
