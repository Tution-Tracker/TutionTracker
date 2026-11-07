'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  subscribeClasses,
  subscribeAllSchedules,
  addClass,
  updateClass,
  deleteClass,
  type ClassDoc,
  type ClassInput,
  type ClassStudent,
  type SchedulesMap,
} from '@/lib/classesApi';
import { subscribeStudents } from '@/lib/studentsApi';
import { getClassDefaultDates } from '@/lib/dateUtils';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/context/ToastContext';

const DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type DayOption = (typeof DAY_OPTIONS)[number];

type ClassFormState = {
  name: string;
  day: DayOption | string;
  time: string;
  duration: number | string;
  fee: number | string;
  venue: string;
  max: number | string;
};

const emptyForm: ClassFormState = {
  name: '',
  day: 'Monday',
  time: '09:00',
  duration: 90,
  fee: '',
  venue: '',
  max: 30,
};

type StatusFilter = 'active' | 'archived' | 'all';

export default function ClassesPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [schedules, setSchedules] = useState<SchedulesMap>({});
  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchBarRef = useRef<HTMLDivElement | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeClasses(setClasses);
    const u2 = subscribeStudents(setStudents);
    const u3 = subscribeAllSchedules(setSchedules);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  useEffect(() => {
    if (!searchExpanded) return;
    function handlePointerDown(e: PointerEvent) {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setSearchExpanded(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [searchExpanded]);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) &&
        (!dayFilter || c.day === dayFilter) &&
        (statusFilter === 'all' ||
          (statusFilter === 'archived' ? !!c.archived : !c.archived))
    );
  }, [classes, search, dayFilter, statusFilter]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(c: ClassDoc) {
    setEditId(c.id);
    setForm({
      name: c.name,
      day: c.day,
      time: c.time,
      duration: c.duration || 90,
      fee: c.fee,
      venue: c.venue || '',
      max: c.max || 30,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || form.fee === '' || form.fee == null) {
      toast('Please fill name and fee', 'amber');
      return;
    }
    setSaving(true);
    try {
      const data: ClassInput = {
        name: form.name.trim(),
        day: form.day,
        time: form.time,
        duration: parseInt(String(form.duration), 10) || 90,
        fee: parseInt(String(form.fee), 10) || 0,
        venue: form.venue.trim(),
        max: parseInt(String(form.max), 10) || 30,
      };
      if (editId) {
        await updateClass(editId, data);
        toast('Class updated!');
      } else {
        await addClass(data);
        toast('Class created!');
      }
      setModalOpen(false);
    } catch {
      toast('Something went wrong saving the class', 'red');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmId) return;
    const affected = students.filter((s) => s.classIds?.includes(confirmId));
    try {
      await deleteClass(confirmId, affected);
      toast('Class deleted', 'amber');
    } catch {
      toast('Could not delete class', 'red');
    } finally {
      setConfirmId(null);
    }
  }

  const now = new Date();

  return (
    <div className="light-surface">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Classes</h1>
          <div className="mt-1 text-sm text-muted">All teaching batches</div>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          + New class
        </button>
      </div>

      {/* Filters */}
      <div
        ref={searchBarRef}
        className="mb-3.5 flex flex-nowrap items-center gap-2"
      >
        <div
          className={`flex min-w-0 items-center rounded-lg border border-border bg-card2 px-2.5 transition-all ${
            searchExpanded ? 'w-full flex-1' : 'flex-1 sm:w-auto sm:flex-initial'
          }`}
        >
          <span className="shrink-0 text-muted">🔍</span>
          <input
            className="min-w-0 w-full border-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              if (
                typeof window !== 'undefined' &&
                window.matchMedia('(max-width: 639px)').matches
              ) {
                setSearchExpanded(true);
              }
            }}
          />
        </div>
        <select
          className={`max-w-[38%] shrink-0 rounded-lg border border-border bg-card2 px-2.5 py-1.5 text-sm text-foreground sm:max-w-none ${
            searchExpanded ? 'hidden sm:block' : ''
          }`}
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
        >
          <option value="">All days</option>
          {DAY_OPTIONS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          className={`max-w-[32%] shrink-0 rounded-lg border border-border bg-card2 px-2.5 py-1.5 text-sm text-foreground sm:max-w-none ${
            searchExpanded ? 'hidden sm:block' : ''
          }`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="py-11 text-center text-muted">
          <div className="mb-2.5 text-4xl">📚</div>
          <p>No classes. Create one!</p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}
        >
          {list.map((c) => {
            const studCount = students.filter((s) => s.classIds?.includes(c.id)).length;
            const scheduledThisMonth = getClassDefaultDates(
              c.day,
              now.getFullYear(),
              now.getMonth()
            );
            return (
              <div key={c.id} className="card group relative">
                <Link
                  href={`/dashboard/classes/${c.id}`}
                  className="absolute inset-0"
                  aria-label={c.name}
                />
                <div className="pointer-events-none relative mb-2.5 flex justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-lg">
                    📚
                  </div>
                </div>
                <div className="pointer-events-none relative mb-1 flex items-center gap-2 text-[14px] font-bold text-foreground">
                  {c.name}
                  {c.archived && (
                    <span className="rounded-full bg-amber/15 px-2 py-0.5 text-xs font-medium text-amber">
                      Archived
                    </span>
                  )}
                </div>
                <div className="pointer-events-none relative flex flex-col gap-0.5 text-xs text-muted">
                  <span>
                    📅 {c.day} · 🕐 {c.time} ({c.duration || 90} min)
                  </span>
                  <span>
                    📍 {c.venue || '—'} · 💰 LKR {Number(c.fee || 0).toLocaleString()}/mo
                  </span>
                </div>
                <hr className="my-3.5 border-border" />
                <div className="relative flex justify-between text-xs text-muted">
                  <span>
                    👥 {studCount}/{c.max}
                  </span>
                  <span>🗓 {scheduledThisMonth.length} sessions this month</span>
                </div>
                <div className="relative mt-3 flex gap-1.5">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm px-2 py-1 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      openEdit(c);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger px-2 py-1 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      setConfirmId(c.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit class' : 'New class'}
        icon="📚"
      >
        <div className="form-group pt-1">
          <label>Class / subject name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="A/L Physics – Batch B"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="form-group">
            <label>Weekly day</label>
            <select
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="form-group pt-1">
            <label>Start time</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="form-group">
            <label>Duration (min)</label>
            <input
              type="number"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          </div>
          <div className="form-group pt-1">
            <label>Monthly fee (LKR)</label>
            <input
              type="number"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              placeholder="3500"
            />
          </div>
        </div>
        <div className="form-group pt-1">
          <label>Venue</label>
          <input
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
            placeholder="Room 1"
          />
        </div>
        <div className="form-group pt-1">
          <label>Max students</label>
          <input
            type="number"
            value={form.max}
            onChange={(e) => setForm({ ...form, max: e.target.value })}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete class?"
        message="Students will be unenrolled. Their fee/attendance records remain."
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}