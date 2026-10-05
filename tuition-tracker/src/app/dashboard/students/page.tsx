'use client';

import { useEffect, useMemo, useState } from 'react';
import StudentFormModal from '@/components/StudentFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { subscribeStudents, deleteStudent } from '@/lib/studentsApi';
import type { Student } from '@/types/student';

function initials(name: string): string {
  return (
    name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

export default function StudentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeStudents(
      (list) => {
        setStudents(list);
        setLoading(false);
      },
      () => {
        setLoadError('Could not load students. Check the browser console.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;

    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.nic || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
    );
  }, [students, search]);

  const countText = loading
    ? 'Loading…'
    : search.trim()
      ? `${filtered.length} of ${students.length} shown`
      : `${students.length} enrolled`;

  function openAdd() {
    setEditingStudent(null);
    setModalOpen(true);
  }

  function openEdit(s: Student) {
    setEditingStudent(s);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
    } catch (err) {
      console.error(err);
      setLoadError('Could not delete the student. Check the browser console.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Students</h1>
          <div className="mt-1 text-sm text-gray-500">{countText}</div>
        </div>
        <button
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
          onClick={openAdd}
        >
          + Add student
        </button>
      </div>

      {loadError && <p className="mb-3 text-sm text-red-600">{loadError}</p>}

      <div className="mb-3">
        <input
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Search name, phone, email, NIC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2.5">Student</th>
              <th className="px-3 py-2.5">Email</th>
              <th className="px-3 py-2.5">NIC</th>
              <th className="px-3 py-2.5">Phone</th>
              <th className="px-3 py-2.5">Classes</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
                  {students.length === 0
                    ? 'No students yet. Click "+ Add student" to enroll one.'
                    : 'No students match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-none">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold">
                        {initials(s.name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-xs text-gray-500">
                          {s.school || ''}
                          {s.grade ? ` · ${s.grade}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{s.email || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{s.nic || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{s.phone || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">
                    {s.classIds.length > 0 ? s.classIds.length : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1.5">
                      <button
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </button>
                       <button
                        className="rounded-md border border-[#fca5a5] px-2 py-1 text-xs text-[#dc2626]"
                        onClick={() => setDeleteTarget(s)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <StudentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        student={editingStudent}
        allStudents={students}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete student?"
        message={`This permanently removes ${deleteTarget?.name ?? 'this student'}'s profile. This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}