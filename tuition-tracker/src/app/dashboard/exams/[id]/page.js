'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { subscribeClasses } from '@/lib/classesApi';
import { subscribeStudents } from '@/lib/studentsApi';
import { subscribeExams, updateExam, deleteExam, saveExamMarks, EXAM_TYPES } from '@/lib/examsApi';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/context/ToastContext';

const initials = (n) =>
  (n || '')
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase() || '?';

export default function ExamDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [marksLocal, setMarksLocal] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u1 = subscribeExams(setExams);
    const u2 = subscribeClasses(setClasses);
    const u3 = subscribeStudents(setStudents);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const exam = useMemo(() => exams.find((e) => e.id === id), [exams, id]);

  useEffect(() => {
    if (exam) setMarksLocal(exam.marks || {});
  }, [exam]);

  const studs = useMemo(() => students.filter((s) => s.classIds?.includes(exam?.classId)), [students, exam]);
  const typeInfo = exam ? EXAM_TYPES.find((t) => t.id === exam.type) || EXAM_TYPES[0] : null;

  function handleMarkChange(sid, value) {
    setMarksLocal((prev) => ({ ...prev, [sid]: value }));
  }

  function pctFor(sid) {
    const v = marksLocal[sid];
    if (v === undefined || v === null || v === '') return null;
    const num = Number(v);
    if (isNaN(num) || num < 0 || num > exam.maxMarks) return 'invalid';
    return Math.round((num / exam.maxMarks) * 100);
  }

  async function handleSaveMarks() {
    let invalid = false;
    const cleaned = {};
    studs.forEach((s) => {
      const v = marksLocal[s.id];
      if (v === undefined || v === null || v === '') return;
      const num = Number(v);
      if (isNaN(num) || num < 0 || num > exam.maxMarks) {
        invalid = true;
        return;
      }
      cleaned[s.id] = num;
    });
    if (invalid) {
      toast('Some marks are invalid — must be between 0 and max marks', 'red');
      return;
    }
    setSaving(true);
    try {
      await saveExamMarks(id, cleaned);
      toast('Marks saved!');
    } catch (e) {
      toast('Could not save marks', 'red');
    } finally {
      setSaving(false);
    }
  }

  function openEdit() {
    setEditForm({
      name: exam.name,
      classId: exam.classId,
      type: exam.type,
      date: exam.date,
      maxMarks: exam.maxMarks,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    try {
      await updateExam(id, { ...editForm, maxMarks: parseInt(editForm.maxMarks, 10) || 0 });
      toast('Exam updated!');
      setEditOpen(false);
    } catch (e) {
      toast('Could not update exam', 'red');
    }
  }

  async function handleDelete() {
    try {
      await deleteExam(id);
      toast('Exam deleted', 'amber');
      router.replace('/dashboard/exams');
    } catch (e) {
      toast('Could not delete exam', 'red');
    }
  }

  if (!exam) {
    return <div className="card text-muted text-sm">Loading, or this exam doesn&apos;t exist.</div>;
  }

  return (
    <div>
      <div className="text-sm text-muted mb-4">
        <Link href="/dashboard/exams" className="text-accent2 hover:underline">
          Exams
        </Link>{' '}
        <span className="mx-1">›</span> {exam.name}
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">{exam.name}</h1>
          <div className="text-sm text-muted mt-1 flex items-center gap-1.5 flex-wrap">
            {classes.find((c) => c.id === exam.classId)?.name || 'Unknown class'} ·
            <span
              className="px-2 py-0.5 rounded-full text-[13px] font-semibold"
              style={{ background: `${typeInfo.color}26`, color: typeInfo.color }}
            >
              {typeInfo.label}
            </span>
            · {exam.date} · Max marks {exam.maxMarks}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button className="btn btn-outline text-xs px-2.5 py-1.5" onClick={openEdit}>
            Edit
          </button>
          <button className="btn btn-danger text-xs px-2.5 py-1.5" onClick={() => setDeleteConfirm(true)}>
            Delete
          </button>
        </div>
      </div>

      {studs.length === 0 ? (
        <div className="card text-center text-muted py-9">No students enrolled in this class yet.</div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[14px] font-semibold text-white">Marks ({studs.length} students)</span>
            <button className="btn btn-primary btn-sm" onClick={handleSaveMarks} disabled={saving}>
              {saving ? 'Saving…' : 'Save marks'}
            </button>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[13px] uppercase tracking-wide text-muted border-b border-border">
                <th className="px-3 py-2.5 text-[13px]">Student</th>
                <th className="px-3 py-2.5 text-[13px]">Marks (out of {exam.maxMarks})</th>
                <th className="px-3 py-2.5 text-[13px]">%</th>
              </tr>
            </thead>
            <tbody>
              {studs.map((s) => {
                const pct = pctFor(s.id);
                return (
                  <tr key={s.id} className="border-b border-border/60 last:border-none">
                    <td className="px-3 py-2.5 text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent2 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(s.name)}
                        </div>
                        {s.name}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">
                      <input
                        type="number"
                        min="0"
                        max={exam.maxMarks}
                        value={marksLocal[s.id] ?? ''}
                        onChange={(e) => handleMarkChange(s.id, e.target.value)}
                        className={`w-20 px-2 py-1.5 bg-card2 border rounded-lg text-sm text-center outline-none ${
                          pct === 'invalid' ? 'border-red' : 'border-border focus:border-accent'
                        }`}
                      />
                    </td>
                    <td
                      className="px-3 py-2.5 font-semibold text-[13px]"
                      style={{
                        color:
                          pct === null || pct === 'invalid'
                            ? '#7a8aaa'
                            : pct >= 75
                            ? '#22c55e'
                            : pct >= 50
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {pct === null || pct === 'invalid' ? '—' : `${pct}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editForm && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit exam" icon="ti ti-file-text">
          <div className="form-group">
            <label>Exam name</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Class</label>
            <select value={editForm.classId} onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="form-group">
              <label>Exam type</label>
              <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                {EXAM_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Max marks</label>
            <input type="number" min="1" value={editForm.maxMarks} onChange={(e) => setEditForm({ ...editForm, maxMarks: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-outline" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveEdit}>
              Save
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete exam?"
        message="All recorded marks for this exam will be permanently removed."
        onCancel={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}