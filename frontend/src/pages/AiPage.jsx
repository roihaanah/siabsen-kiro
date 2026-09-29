import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import AskYourData from '../components/ai/AskYourData.jsx';
import AttendanceReport from '../components/ai/AttendanceReport.jsx';
import PatternDetection from '../components/ai/PatternDetection.jsx';

export default function AiPage() {
  const { user } = useAuth();

  // Report & Pattern hanya untuk guru/admin.
  const tabs = useMemo(() => {
    const base = [{ id: 'ask', label: 'Ask Your Data' }];
    if (user?.role === 'guru' || user?.role === 'admin') {
      base.push(
        { id: 'report', label: 'Laporan Absensi' },
        { id: 'pattern', label: 'Deteksi Pola' }
      );
    }
    return base;
  }, [user]);

  const [active, setActive] = useState('ask');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Asisten AI</h1>
        <p className="text-sm text-slate-500">
          Ditenagai AWS Bedrock. Semua jawaban dibuat dari data nyata SiAbsen.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              active === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === 'ask' && <AskYourData />}
      {active === 'report' && <AttendanceReport />}
      {active === 'pattern' && <PatternDetection />}
    </div>
  );
}
