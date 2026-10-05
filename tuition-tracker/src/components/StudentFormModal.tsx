'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import Modal from '@/components/Modal';
import { addStudent, updateStudent } from '@/lib/studentsApi';
import type { NewStudent, Student } from '@/types/student';

type FormState = {
  first: string;
  last: string;
  email: string;
  nic: string;
  phone: string;
  parent: string;
  school: string;
  grade: string;
  classId: string;
  enrollDate: string;
  notes: string;
  billingStatus: string;
};

type StudentFormModalProps = {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  allStudents?: Student[];
};

// Today's date as YYYY-MM-DD, in the user's own timezone.
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function emptyForm(): FormState {
  return {
    first: '',
    last: '',
    email: '',
    nic: '',
    phone: '',
    parent: '',
    school: '',
    grade: '',
    classId: '',
    enrollDate: todayLocal(),
    notes: '',
    billingStatus: 'none',
  };
}

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const labelClass = 'mb-1 block text-sm font-medium';

export default function StudentFormModal({
  open,
  onClose,
  student,
  allStudents = [],
}: StudentFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Every time the popup opens, start with a clean form.
    useEffect(() => {
    if (!open) return;
    setError('');

    if (student) {
      const [first, ...rest] = student.name.split(' ');
      setForm({
        first: first || '',
        last: rest.join(' '),
        email: student.email || '',
        nic: student.nic || '',
        phone: student.phone || '',
        parent: student.parent || '',
        school: student.school || '',
        grade: student.grade || '',
        classId: '',
        enrollDate: student.enrollDate || '',
        notes: student.notes || '',
        billingStatus: student.billingStatus || 'none',
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, student]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

    async function handleSave() {
    setError('');

    if (!form.first.trim() || !form.last.trim()) {
      setError('Please enter the first and last name.');
      return;
    }

    // Email + NIC are the student's login details for the student portal.
    if (!form.email.trim() || !form.nic.trim()) {
      setError('Email and NIC are required. The student logs in with them.');
      return;
    }

    // Two students with the same email would make login ambiguous.
    const emailLower = form.email.trim().toLowerCase();
    const clash = allStudents.find(
      (s) => s.email.trim().toLowerCase() === emailLower && s.id !== student?.id
    );
    if (clash) {
      setError(`That email is already used by ${clash.name}.`);
      return;
    }

    const data: Omit<NewStudent, 'classIds'> = {
      name: `${form.first.trim()} ${form.last.trim()}`,
      email: emailLower,
      nic: form.nic.trim(),
      phone: form.phone.trim(),
      parent: form.parent.trim(),
      school: form.school.trim(),
      grade: form.grade.trim(),
      enrollDate: form.enrollDate,
      notes: form.notes.trim(),
      billingStatus: form.billingStatus === 'free' ? 'free' : 'none',
    };

    setSaving(true);
    try {
      if (student) {
        // Edit: keep the classes they already have, add the chosen one if any.
        const classIds = new Set(student.classIds);
        if (form.classId) classIds.add(form.classId);
        await updateStudent(student.id, { ...data, classIds: Array.from(classIds) });
      } else {
        // Add: a brand new student.
        await addStudent({ ...data, classIds: form.classId ? [form.classId] : [] });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Something went wrong saving the student. Check the browser console.');
    } finally {
      setSaving(false);
    }
  }

  return (
      <Modal open={open} onClose={onClose} title={student ? 'Edit student' : 'Enroll student'}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First name</label>
          <input className={inputClass} name="first" value={form.first} onChange={handleChange} placeholder="Kasun" />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input className={inputClass} name="last" value={form.last} onChange={handleChange} placeholder="Perera" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Email *</label>
          <input className={inputClass} type="email" name="email" value={form.email} onChange={handleChange} placeholder="student@example.com" />
        </div>
        <div>
          <label className={labelClass}>NIC *</label>
          <input className={inputClass} name="nic" value={form.nic} onChange={handleChange} placeholder="200012345678" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div>
          <label className={labelClass}>Parent phone</label>
          <input className={inputClass} name="parent" value={form.parent} onChange={handleChange} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>School</label>
          <input className={inputClass} name="school" value={form.school} onChange={handleChange} />
        </div>
        <div>
          <label className={labelClass}>Grade</label>
          <input className={inputClass} name="grade" value={form.grade} onChange={handleChange} />
        </div>
      </div>

      <div className="mt-3">
        <label className={labelClass}>Assign to class</label>
        <select className={inputClass} name="classId" value={form.classId} onChange={handleChange}>
          <option value="">— Select —</option>
        </select>
      </div>

      <div className="mt-3">
        <label className={labelClass}>Fees</label>
        <select className={inputClass} name="billingStatus" value={form.billingStatus} onChange={handleChange}>
          <option value="none">Normal (fees apply)</option>
          <option value="free">Free (no fees tracked)</option>
        </select>
      </div>

      <div className="mt-3">
        <label className={labelClass}>Enrolled date</label>
        <input className={inputClass} type="date" name="enrollDate" value={form.enrollDate} onChange={handleChange} />
      </div>

      <div className="mt-3">
        <label className={labelClass}>Notes</label>
        <textarea className={inputClass} rows={2} name="notes" value={form.notes} onChange={handleChange} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

    <div className="mt-5 flex justify-end gap-2">
        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm" onClick={onClose}>
            Cancel
        </button>
        <button
            className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
        >
        {saving ? 'Saving…' : 'Save'}
        </button>
    </div>
    </Modal>
  );
}