import { STATUS } from '../lib/attendanceStatus.js';

// Segmented control untuk memilih status kehadiran satu siswa.
export default function StatusSelector({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Status kehadiran"
      className="inline-flex overflow-hidden rounded-lg border border-slate-200 shadow-sm"
    >
      {STATUS.map((opt, i) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition ${
              i > 0 ? 'border-l border-slate-200' : ''
            } ${selected ? opt.solid : `bg-white ${opt.soft}`}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                selected ? 'bg-white/90' : opt.dot
              }`}
              aria-hidden="true"
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
