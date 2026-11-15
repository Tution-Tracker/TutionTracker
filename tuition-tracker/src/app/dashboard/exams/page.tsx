'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { subscribeClasses } from '@/lib/classesApi';
import { subscribeStudents } from '@/lib/studentsApi';
import { subscribeExams, addExam, EXAM_TYPES } from '@/lib/examsApi';
import { todayStr } from '@/lib/dateUtils';
import Modal from '@/components/Modal';
import { useToast } from '@/context/ToastContext';

const emptyForm = { name: '', classId: '', type: 'mcq', date: todayStr(), maxMarks: 100 };

export default function ExamsPage() {
  const { toast } = useToast();
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
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

  const classNameById = useMemo(() => {
    const map = {};
    classes.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [classes]);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return exams.filter(
      (e) =>
        e.name.toLowerCase().includes(q) &&
        (!classFilter || e.classId === classFilter) &&
        (!typeFilter || e.type === typeFilter)
    );
  }, [exams, search, classFilter, typeFilter]);

  function openNew() {
    setForm({ ...emptyForm, date: todayStr() });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.classId || !form.date || !form.maxMarks) {
      toast('Fill in name, class, date and max marks', 'amber');
      return;
    }
    setSaving(true);
    try {
      await addExam({
        name: form.name.trim(),
        classId: form.classId,
        type: form.type,
        date: form.date,
        maxMarks: parseInt(form.maxMarks, 10) || 0,
      });
      toast('Exam created — now add marks!');
      setModalOpen(false);
    } catch (e) {
      toast('Could not create exam', 'red');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Exams</h1>
          <div className="text-sm text-muted mt-1">Create exams and record marks per class</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <img src="/general/add.png" alt="arrow-right" className="h-4 w-4 object-contain" />New exam
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="flex items-center bg-card2 border border-border rounded-lg px-2.5">
          <i className="ti ti-search text-black text-sm" />
          <input
            className="border-none bg-transparent px-2 py-1.5 text-sm outline-none text-slate-200"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-slate-200"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-slate-200"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {EXAM_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-11 text-muted">
          <div className="text-4xl mb-2.5">
            <i className="ti ti-file-text" />
          </div>
          <p>No exams yet. Create one!</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {list.map((e) => {
            const typeInfo = EXAM_TYPES.find((t) => t.id === e.type) || EXAM_TYPES[0];
            const studs = students.filter((s) => s.classIds?.includes(e.classId));
            const marks = e.marks || {};
            const marked = studs.filter((s) => marks[s.id] !== undefined && marks[s.id] !== null && marks[s.id] !== '').length;
            const scores = studs
              .map((s) => marks[s.id])
              .filter((v) => v !== undefined && v !== null && v !== '')
              .map(Number);
            const avg =
              scores.length && e.maxMarks
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / e.maxMarks) * 100)
                : null;
            return (
              <Link
                key={e.id}
                href={`/dashboard/exams/${e.id}`}
                className="card block hover:border-accent transition-colors"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="text-[14px] font-bold text-white">{e.name}</div>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[13px] font-semibold whitespace-nowrap"
                    style={{ background: `${typeInfo.color}26`, color: typeInfo.color }}
                  >
                    {typeInfo.label}
                  </span>
                </div>
                <div className="text-xs text-muted mb-2.5">{classNameById[e.classId] || 'Unknown class'}</div>
                <div className="flex justify-between text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <i className="ti ti-calendar text-sm" />
                    {e.date}
                  </span>
                  <span>Max {e.maxMarks}</span>
                </div>
                <hr className="border-border my-3.5" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted inline-flex items-center gap-1">
                    <i className="ti ti-users text-sm" />
                    {marked}/{studs.length} marked
                  </span>
                  <span
                    className="font-bold"
                    style={{
                      color: avg === null ? '#7a8aaa' : avg >= 75 ? '#22c55e' : avg >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {avg === null ? '—' : `${avg}% avg`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New exam">
        <div className="form-group">
          <label>Exam name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Term 1 MCQ Test"
          />
        </div>
        <div className="form-group">
          <label>Class</label>
          <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
            <option value="">— Select —</option>
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
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {EXAM_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Max marks</label>
          <input
            type="number"
            min="1"
            value={form.maxMarks}
            onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
          />
        </div>
        <div className="bg-accent/10 border border-accent/20 rounded-lg px-3.5 py-2.5 text-[13px] text-accent2 mb-1 flex items-start gap-2">
          <i className="ti ti-info-circle text-base shrink-0 mt-0.5" />
          <span>After saving, you&apos;ll enter each student&apos;s marks for this exam.</span>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button className="btn btn-outline" onClick={() => setModalOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  );
}