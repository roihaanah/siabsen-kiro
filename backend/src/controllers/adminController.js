import {
  listClasses,
  listTeachersFull,
  createTeacher,
  updateTeacher,
  listStudentsFull,
  createStudent,
  updateStudent,
} from '../models/adminModel.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Terjemahkan error unik Postgres (kode 23505) menjadi 409 yang informatif.
function handleDbError(err, res, next) {
  if (err?.code === '23505') {
    return res.status(409).json({ error: 'Data dengan nilai unik itu sudah ada (email/NIP/NIS duplikat).' });
  }
  if (err?.code === '23503') {
    return res.status(400).json({ error: 'Referensi tidak valid (mis. kelas tidak ditemukan).' });
  }
  return next(err);
}

// --- Classes ---------------------------------------------------------------
export async function getClasses(_req, res, next) {
  try {
    res.json(await listClasses());
  } catch (err) {
    next(err);
  }
}

// --- Teachers ---------------------------------------------------------------
export async function getTeachersAdmin(_req, res, next) {
  try {
    res.json(await listTeachersFull());
  } catch (err) {
    next(err);
  }
}

export async function postTeacher(req, res, next) {
  try {
    const { nip, full_name, email, password, role } = req.body || {};
    if (!nip || !full_name || !email) {
      return res.status(400).json({ error: 'nip, full_name, dan email wajib.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    if (role && !['guru', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role harus guru atau admin.' });
    }
    const created = await createTeacher({ nip, full_name, email, password, role });
    res.status(201).json(created);
  } catch (err) {
    handleDbError(err, res, next);
  }
}

export async function putTeacher(req, res, next) {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'id tidak valid.' });
    const { email, role } = req.body || {};
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    if (role && !['guru', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role harus guru atau admin.' });
    }
    const updated = await updateTeacher(id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Guru tidak ditemukan atau tidak ada perubahan.' });
    res.json(updated);
  } catch (err) {
    handleDbError(err, res, next);
  }
}

// --- Students ---------------------------------------------------------------
export async function getStudentsAdmin(_req, res, next) {
  try {
    res.json(await listStudentsFull());
  } catch (err) {
    next(err);
  }
}

export async function postStudent(req, res, next) {
  try {
    const { nis, full_name, email, password, class_id } = req.body || {};
    const cId = toInt(class_id);
    if (!nis || !full_name || !cId) {
      return res.status(400).json({ error: 'nis, full_name, dan class_id wajib.' });
    }
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    const created = await createStudent({ nis, full_name, email, password, class_id: cId });
    res.status(201).json(created);
  } catch (err) {
    handleDbError(err, res, next);
  }
}

export async function putStudent(req, res, next) {
  try {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'id tidak valid.' });
    const body = { ...(req.body || {}) };
    if (body.email && !EMAIL_RE.test(body.email)) {
      return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    if (body.class_id !== undefined) {
      const cId = toInt(body.class_id);
      if (!cId) return res.status(400).json({ error: 'class_id tidak valid.' });
      body.class_id = cId;
    }
    const updated = await updateStudent(id, body);
    if (!updated) return res.status(404).json({ error: 'Siswa tidak ditemukan atau tidak ada perubahan.' });
    res.json(updated);
  } catch (err) {
    handleDbError(err, res, next);
  }
}
