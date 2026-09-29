// Definisi status kehadiran terpusat agar warna & label konsisten
// di seluruh UI (selector, badge, kartu ringkasan).
export const STATUS = [
  {
    value: 'hadir',
    label: 'Hadir',
    short: 'H',
    dot: 'bg-emerald-500',
    solid: 'bg-emerald-600 text-white',
    soft: 'text-emerald-700 hover:bg-emerald-50',
    card: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    value: 'izin',
    label: 'Izin',
    short: 'I',
    dot: 'bg-sky-500',
    solid: 'bg-sky-600 text-white',
    soft: 'text-sky-700 hover:bg-sky-50',
    card: 'bg-sky-50 text-sky-700 ring-sky-200',
    badge: 'bg-sky-100 text-sky-700',
  },
  {
    value: 'sakit',
    label: 'Sakit',
    short: 'S',
    dot: 'bg-amber-500',
    solid: 'bg-amber-500 text-white',
    soft: 'text-amber-700 hover:bg-amber-50',
    card: 'bg-amber-50 text-amber-700 ring-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    value: 'alpa',
    label: 'Alfa',
    short: 'A',
    dot: 'bg-rose-500',
    solid: 'bg-rose-600 text-white',
    soft: 'text-rose-700 hover:bg-rose-50',
    card: 'bg-rose-50 text-rose-700 ring-rose-200',
    badge: 'bg-rose-100 text-rose-700',
  },
];

export const STATUS_BY_VALUE = Object.fromEntries(
  STATUS.map((s) => [s.value, s])
);
