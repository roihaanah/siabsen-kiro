import { useEffect, useState } from 'react';
import { fetchDashboard } from '../lib/dashboardApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import AttendanceSummary from '../components/AttendanceSummary.jsx';

function formatDate(value) {
  if (!value) return '-';
  // value bisa berupa ISO string dari Postgres DATE/timestamp.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((err) =>
        setError(err?.response?.data?.error || 'Gagal memuat dashboard.')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Selamat datang, {user?.full_name}.
        </p>
      </div>

      {data?.role === 'admin' && <AdminDashboard data={data} />}
      {data?.role === 'guru' && <TeacherDashboard data={data} />}
      {data?.role === 'siswa' && <StudentDashboard data={data} />}
    </div>
  );
}

/* ---------------------------------- ADMIN --------------------------------- */
function AdminDashboard({ data }) {
  const { counts, attendanceByStatus, studentsPerClass, recentSessions } = data;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Guru" value={counts.teachers} accent="sky" />
        <StatCard label="Siswa" value={counts.students} accent="emerald" />
        <StatCard label="Kelas" value={counts.classes} accent="amber" />
        <StatCard label="Mata Pelajaran" value={counts.subjects} accent="purple" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Admin" value={counts.admins} />
        <StatCard label="Penugasan" value={counts.assignments} />
        <StatCard label="Sesi Absensi" value={counts.sessions} />
        <StatCard label="Total Record" value={counts.records} />
      </div>

      <Panel title="Ringkasan Kehadiran (Seluruh Sistem)">
        <AttendanceSummary summary={attendanceByStatus} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Siswa per Kelas">
          {studentsPerClass.length === 0 ? (
            <Empty text="Belum ada kelas." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {studentsPerClass.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.class_name}</p>
                    <p className="text-xs text-slate-400">{c.academic_year}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {c.student_count} siswa
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Sesi Absensi Terbaru">
          {recentSessions.length === 0 ? (
            <Empty text="Belum ada sesi absensi." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentSessions.map((s) => (
                <li key={s.id} className="py-2.5">
                  <p className="text-sm font-medium text-slate-800">
                    {s.class_name} — {s.subject_name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDate(s.session_date)} · {s.teacher_name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------- GURU ---------------------------------- */
function TeacherDashboard({ data }) {
  const { profile, assignments, summary, attendanceByStatus, recentSessions } = data;
  return (
    <div className="space-y-6">
      <Panel title="Profil Guru">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <Info label="Nama" value={profile?.full_name} />
          <Info label="NIP" value={profile?.nip} />
          <Info label="Email" value={profile?.email} />
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Penugasan" value={summary.assignments} accent="sky" />
        <StatCard label="Kelas Diajar" value={summary.classes} accent="amber" />
        <StatCard label="Sesi Absensi" value={summary.sessions} accent="emerald" />
      </div>

      <Panel title="Kelas & Mata Pelajaran">
        {assignments.length === 0 ? (
          <Empty text="Belum ada penugasan mengajar." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {assignments.map((a) => (
              <span
                key={a.assignment_id}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
              >
                {a.class_name} · {a.subject_name}
              </span>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Ringkasan Kehadiran (Sesi Anda)">
        <AttendanceSummary summary={attendanceByStatus} />
      </Panel>

      <Panel title="Sesi Absensi Terbaru">
        {recentSessions.length === 0 ? (
          <Empty text="Anda belum membuat sesi absensi." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {s.class_name} — {s.subject_name}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(s.session_date)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {s.total_records} siswa
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* --------------------------------- SISWA ---------------------------------- */
function StudentDashboard({ data }) {
  const { profile, attendanceByStatus, totalRecords, attendanceRate, recentRecords } =
    data;
  return (
    <div className="space-y-6">
      <Panel title="Profil Saya">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <Info label="Nama" value={profile?.full_name} />
          <Info label="NIS" value={profile?.nis} />
          <Info label="Kelas" value={profile?.class_name} />
          <Info label="Tahun Ajaran" value={profile?.academic_year} />
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Persentase Hadir"
          value={attendanceRate === null ? '—' : `${attendanceRate}%`}
          accent="emerald"
          hint={attendanceRate === null ? 'Belum ada data' : undefined}
        />
        <StatCard label="Total Pertemuan" value={totalRecords} accent="sky" />
        <StatCard label="Alfa" value={attendanceByStatus.alpa} accent="rose" />
      </div>

      <Panel title="Ringkasan Kehadiran Saya">
        <AttendanceSummary summary={attendanceByStatus} />
      </Panel>

      <Panel title="Riwayat Kehadiran Terbaru">
        {recentRecords.length === 0 ? (
          <Empty text="Belum ada riwayat kehadiran." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentRecords.map((r, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.subject_name}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(r.session_date)} · {r.teacher_name}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------ sub-komponen ------------------------------ */
function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800">{value || '-'}</p>
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-4 text-center text-sm text-slate-400">{text}</p>;
}

function StatusBadge({ status }) {
  const map = {
    hadir: 'bg-emerald-100 text-emerald-700',
    izin: 'bg-sky-100 text-sky-700',
    sakit: 'bg-amber-100 text-amber-700',
    alpa: 'bg-rose-100 text-rose-700',
  };
  const label = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alfa' };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        map[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {label[status] || status}
    </span>
  );
}
