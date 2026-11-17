import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

const examsCol = collection(db, 'exams');

export const EXAM_TYPES = [
  { id: 'mcq', label: 'MCQ', color: '#818cf8' },
  { id: 'essay', label: 'Essay', color: '#22c55e' },
  { id: 'structured', label: 'Structured', color: '#f59e0b' },
];

/** Live subscription to all exams, most recent date first. */
export function subscribeExams(callback) {
  const q = query(examsCol, orderBy('date', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addExam(data) {
  return addDoc(examsCol, { marks: {}, ...data });
}

export async function updateExam(id, data) {
  return updateDoc(doc(db, 'exams', id), data);
}

export async function deleteExam(id) {
  return deleteDoc(doc(db, 'exams', id));
}

export async function saveExamMarks(id, marks) {
  return updateDoc(doc(db, 'exams', id), { marks });
}