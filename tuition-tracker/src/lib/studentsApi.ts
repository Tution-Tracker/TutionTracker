import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import type { NewStudent, Student } from '@/types/student';

const studentsCol = collection(db, 'students');

export async function addStudent(data: NewStudent) {
  return addDoc(studentsCol, data);
}

export async function updateStudent(id: string, data: Partial<NewStudent>) {
  return updateDoc(doc(db, 'students', id), data);
}

export async function deleteStudent(id: string) {
  return deleteDoc(doc(db, 'students', id));
}

export function subscribeStudents(
  callback: (students: Student[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    studentsCol,
    (snapshot) => {
      const list: Student[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as NewStudent),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      callback(list);
    },
    (err) => {
      console.error(err);
      onError?.(err);
    }
  );
}