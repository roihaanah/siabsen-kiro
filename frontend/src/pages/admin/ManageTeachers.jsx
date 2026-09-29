import { useEffect, useState } from 'react';
import {
  fetchTeachersAdmin,
  createTeacher,
  updateTeacher,
} from '../../lib/adminApi.js';
import Modal from '../../components/Modal.jsx';

const EMPTY = { nip: '', full_name: '', email: '', password: '', role: 'guru' };

const ROLE_BADGE = {
  admin: 'bg-purple-100 text-purple-700',
  guru: 'bg-sky-100 text-sky-700',
};

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null=tambah, obj=edit
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setTeachers(await fetchTeachersAdmin());
    } catch {
      setMessage({ type: 'error', text: 'Gagal memuat data guru.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({
      nip: t.nip,
      full_name: t.full_name,
      email: t.email || '',
      password: '',
      role: t.role === 'admin' ? 'admin' : 'guru',
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        // Password hanya dikirim bila diisi.
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await updateTeacher(editing.id, payload);
        setMessage({ type: 'success', text: 'Data guru diperbarui.' });
      } else {
        await createTeacher(form);
        setMessage({ type: 'success', text: 'Guru baru ditambahkan.' });
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
          <h2 className="text-lg font-semibold text-slate-900">Kelola Guru</h2>
          <p className="text-sm text-slate-500">Tambah atau ubah data guru & admin.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Tambah Guru
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
        ) : teachers.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Belum ada data guru.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">NIP</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{t.full_name}</td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{t.nip}</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{t.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ROLE_BADGE[t.role] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
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
        title={editing ? 'Ubah Guru' : 'Tambah Guru'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
              {formError}
            </div>
          )}
          <Field label="NIP" value={form.nip} onChange={(v) => setForm({ ...form, nip: v })} required />
          <Field label="Nama Lengkap" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Field
            label={editing ? 'Password (kosongkan bila tidak diubah)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            required={!editing}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="guru">Guru</option>
              <option value="admin">Admin</option>
            </select>
          </label>

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
