import { useEffect, useMemo, useState } from 'react';
import {
  fetchMyAssignments,
  openSession,
  saveSession,
} from '../lib/attendanceApi.js';
import { STATUS_BY_VALUE } from '../lib/attendanceStatus.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusSelector from '../components/StatusSelector.jsx';
import SummaryCards from '../components/SummaryCards.jsx';

function todayIso() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [assignmentKey, setAssignmentKey] = useState(''); // "classId:subjectId"
  const [date, setDate] = useState(todayIso());

  const [students, setStudents] = useState([]);
  const [opened, setOpened] = useState(false);
  const [sessionExists, setSessionExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // {type, text}

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Muat assignment milik guru yang login.
  useEffect(() => {
    fetchMyAssignments()
      .then((data) => setAssignments(data))
      .catch(() =>
        setMessage({ type: 'error', text: 'Gagal memuat data mengajar Anda.' })
      )
      .finally(() => setAssignmentsLoaded(true));
  }, []);

  const selectedAssignment = useMemo(() => {
    if (!assignmentKey) return null;
    const [classId, subjectId] = assignmentKey.split(':').map(Number);
    return assignments.find(
      (a) => a.class_id === classId && a.subject_id === subjectId
    );
  }, [assignmentKey, assignments]);

  const canOpen = Boolean(assignmentKey && date);

  async function handleOpen() {
    if (!selectedAssignment) return;
    setLoading(true);
    setMessage(null);
    setStudents([]);
    setSearch('');
    setFilter('all');
    try {
      const data = await openSession({
        classId: selectedAssignment.class_id,
        subjectId: selectedAssignment.subject_id,
        date,
      });
      setStudents(data.students);
      setSessionExists(data.exists);
      setOpened(true);
      if (data.exists) {
        setMessage({
          type: 'info',
          text: 'Sesi untuk tanggal ini sudah ada. Perubahan akan memperbarui data yang tersimpan.',
        });
      }
    } catch (err) {
      const text = err?.response?.data?.error || 'Gagal membuka sesi absensi.';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  }

  function setStatus(studentId, status) {
    setStudents((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, status } : s))
    );
  }

  function markAllPresent() {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'hadir' })));
  }

  async function handleSave() {
    if (!selectedAssignment) return;
    setSaving(true);
    setMessage(null);
    try {
      // Kirim hanya siswa yang tidak hadir; backend menganggap sisanya hadir.
      const records = students
        .filter((s) => s.status !== 'hadir')
        .map((s) => ({ student_id: s.student_id, status: s.status }));

      const res = await saveSession({
        classId: selectedAssignment.class_id,
        subjectId: selectedAssignment.subject_id,
        date,
        records,
      });
      setSessionExists(true);
      setMessage({
        type: 'success',
        text: `Absensi tersimpan untuk ${res.saved_records} siswa.`,
      });
    } catch (err) {
      const text = err?.response?.data?.error || 'Gagal menyimpan absensi.';
      setMessage({ type: 'error', text });
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const c = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    for (const s of students) c[s.status] = (c[s.status] || 0) + 1;
    return c;
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchStatus = filter === 'all' || s.status === filter;
      const matchQuery =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        String(s.nis).toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [students, search, filter]);

  // Guru tanpa assignment sama sekali.
  const noAssignments = assignmentsLoaded && assignments.length === 0;

  return (
    <div className="space-y-6">
      {/* Panel pemilihan sesi */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            ✓
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Absensi Kelas
            </h2>
            <p className="text-sm text-slate-500">
              {user?.full_name
                ? `Mengajar sebagai ${user.full_name}.`
                : 'Pilih kelas & mata pelajaran, lalu tanggal.'}
            </p>
          </div>
        </div>

        {noAssignments ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Anda belum memiliki penugasan mengajar. Hubungi admin untuk
            menetapkan kelas & mata pelajaran.
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">
                  Kelas &amp; Mata Pelajaran
                </span>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  value={assignmentKey}
                  onChange={(e) => setAssignmentKey(e.target.value)}
                >
                  <option value="">Pilih kelas & mapel…</option>
                  {assignments.map((a) => (
                    <option
                      key={a.assignment_id}
                      value={`${a.class_id}:${a.subject_id}`}
                    >
                      {a.class_name} — {a.subject_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-700">Tanggal</span>
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleOpen}
                disabled={!canOpen || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? 'Membuka…' : 'Buka Absensi'}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Pesan feedback */}
      {message && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ring-1 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : message.type === 'error'
              ? 'bg-rose-50 text-rose-800 ring-rose-200'
              : 'bg-sky-50 text-sky-800 ring-sky-200'
          }`}
        >
          <span aria-hidden="true">
            {message.type === 'success' ? '✓' : message.type === 'error' ? '⚠' : 'ℹ'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Empty state sebelum membuka sesi */}
      {!opened && !loading && !noAssignments && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center">
          <p className="text-slate-500">
            Belum ada sesi dibuka. Pilih kelas &amp; mata pelajaran, lalu klik{' '}
            <span className="font-medium text-slate-700">Buka Absensi</span>.
          </p>
        </section>
      )}

      {/* Daftar siswa */}
      {opened && students.length > 0 && (
        <section className="space-y-4">
          {/* Header + ringkasan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedAssignment?.class_name} — {selectedAssignment?.subject_name}
                </h3>
                <p className="text-sm text-slate-500">
                  {date} · {students.length} siswa
                  {sessionExists ? ' · sesi tersimpan' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={markAllPresent}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Tandai Semua Hadir
              </button>
            </div>

            <div className="mt-4">
              <SummaryCards
                summary={summary}
                total={students.length}
                activeFilter={filter}
                onFilter={setFilter}
              />
            </div>
          </div>

          {/* Toolbar: search + info filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau NIS…"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Filter: {STATUS_BY_VALUE[filter].label} ✕
              </button>
            )}
            <span className="text-sm text-slate-500">
              {visibleStudents.length} ditampilkan
            </span>
          </div>

          {/* Daftar */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {visibleStudents.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">
                Tidak ada siswa yang cocok dengan pencarian/filter.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {visibleStudents.map((s, idx) => {
                  const st = STATUS_BY_VALUE[s.status];
                  return (
                    <li
                      key={s.student_id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 hover:bg-slate-50/60"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-right text-sm tabular-nums text-slate-400">
                          {idx + 1}
                        </span>
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${st.badge}`}
                          aria-hidden="true"
                        >
                          {s.full_name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">
                            {s.full_name}
                          </p>
                          <p className="text-xs text-slate-500">NIS {s.nis}</p>
                        </div>
                      </div>
                      <StatusSelector
                        value={s.status}
                        onChange={(status) => setStatus(s.student_id, status)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Aksi simpan (sticky agar mudah ditemukan) */}
          <div className="sticky bottom-4 z-10">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
              <span className="text-sm text-slate-500">
                H {summary.hadir} · I {summary.izin} · S {summary.sakit} · A{' '}
                {summary.alpa}
              </span>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {saving ? 'Menyimpan…' : 'Simpan Absensi'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Kelas kosong */}
      {opened && !loading && students.length === 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">
            Tidak ada siswa terdaftar pada kelas ini.
          </p>
        </section>
      )}
    </div>
  );
}
