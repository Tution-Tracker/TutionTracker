import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

export type StudentNotificationType =
  | 'attendance'
  | 'fee'
  | 'class'
  | 'general';

export type StudentNotification = {
  id: string;
  studentId: string;
  type: StudentNotificationType;
  title: string;
  msg: string;
  time: string;
  read: boolean;
};

export type AddStudentNotificationInput = {
  studentId: string;
  type: StudentNotificationType;
  title: string;
  msg: string;
};

/**
 * Live subscription scoped to one student's own notifications (attendance
 * marks, fee payments, and fee/class reminders from Phase 7). Accepts an
 * optional Firestore instance — the student portal passes `studentDb` (see
 * lib/firebaseStudent.js) so reads happen under the student's own Firebase
 * Auth session, which firestore.rules can then authorize. No orderBy
 * combined with the where clause, so this never needs a composite index —
 * sorted client-side instead.
 */
export function subscribeStudentNotifications(
  studentId: string,
  callback: (rows: StudentNotification[]) => void,
  firestore: Firestore = db
): Unsubscribe {
  const q = query(
    collection(firestore, 'studentNotifications'),
    where('studentId', '==', studentId)
  );
  return onSnapshot(q, (snap) => {
    const rows: StudentNotification[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<StudentNotification, 'id'>),
    }));
    rows.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    callback(rows);
  });
}

/**
 * type: 'attendance' | 'fee' | 'class' | 'general'. Always called from the
 * tutor's authenticated session (marking attendance, recording a payment,
 * or the Phase 7 reminders), so this stays on the default db — matches
 * firestore.rules requiring the tutor to create these.
 */
export async function addStudentNotification({
  studentId,
  type,
  title,
  msg,
}: AddStudentNotificationInput) {
  return addDoc(collection(db, 'studentNotifications'), {
    studentId,
    type,
    title,
    msg,
    time: new Date().toISOString(),
    read: false,
  });
}

/**
 * Marks a student's own notification read. Accepts an optional Firestore
 * instance for the same reason as subscribeStudentNotifications above —
 * pass `studentDb` from the student portal.
 */
export async function markStudentNotifRead(
  id: string,
  firestore: Firestore = db
) {
  return updateDoc(doc(firestore, 'studentNotifications', id), { read: true });
}