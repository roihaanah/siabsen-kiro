import { useEffect, useState } from 'react';
import {
  fetchStudentsAdmin,
  createStudent,
  updateStudent,
  fetchClasses,
} from '../../lib/adminApi.js';
import Modal from '../../components/Modal.jsx';

const EMPTY = { nis: '', full_name: '', email: '', password: '', class_id: '' };

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([fetchStudentsAdmin(), fetchClasses()]);
      setStudents(s);
      setClasses(c);
    } catch {
      setMessage({ type: 'error', text: 'Gagal memuat data siswa.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY, class_id: classes[0]?.id ? String(classes[0].id) : '' });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      nis: s.nis,
      full_name: s.full_name,
      email: s.email || '',
      password: '',
      class_id: String(s.class_id),
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, class_id: Number(form.class_id) };
      if (editing) {
        if (!payload.password) delete payload.password;
        await updateStudent(editing.id, payload);
        setMessage({ type: 'success', text: 'Data siswa diperbarui.' });
      } else {
        await createStudent(payload);
        setMessage({ type: 'success', text: 'Siswa baru ditambahkan.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err?.response?.data?.error || 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Kelola Siswa</h2>
          <p className="text-sm text-slate-500">Tambah atau ubah data siswa.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Tambah Siswa
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-2.5 text-sm ring-1 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Memuat…</p>
        ) : students.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Belum ada data siswa.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">NIS</th>
                <th className="px-4 py-3 font-medium">Kelas</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.full_name}</td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{s.nis}</td>
                  <td className="px-4 py-3 text-slate-600">{s.class_name}</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{s.email}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ubah
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Ubah Siswa' : 'Tambah Siswa'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
              {formError}
            </div>
          )}
          <Field label="NIS" value={form.nis} onChange={(v) => setForm({ ...form, nis: v })} required />
          <Field label="Nama Lengkap" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Kelas</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              value={form.class_id}
              onChange={(e) => setForm({ ...form, class_id: e.target.value })}
              required
            >
              <option value="">Pilih kelas…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.academic_year})
                </option>
              ))}
            </select>
          </label>
          <Field label="Email (opsional)" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field
            label={editing ? 'Password (kosongkan bila tidak diubah)' : 'Password (opsional)'}
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  );
}
