import { db as defaultDb } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  deleteField,
  type Firestore,
  type Unsubscribe,
  type DocumentReference,
} from 'firebase/firestore';
import { addStudentNotification } from '@/lib/studentNotificationsApi';

/** A class document from the `classes` collection. */
export type ClassDoc = {
  id: string;
  name: string;
  day: string;
  time: string;
  duration?: number;
  fee: number;
  venue?: string;
  max?: number;
  archived?: boolean;
};

/** Data used when creating / updating a class (no `id`). */
export type ClassInput = {
  name: string;
  day: string;
  time: string;
  duration: number;
  fee: number;
  venue: string;
  max: number;
  archived?: boolean;
};

/** Per-class schedule document from `classSchedule`. */
export type ClassSchedule = {
  cancelled: string[];
  extra: string[];
  extraTimes?: Record<string, string>;
};

/** Minimal student shape needed by class operations. */
export type ClassStudent = {
  id: string;
  classIds?: string[];
  [key: string]: unknown;
};

export type SchedulesMap = Record<string, ClassSchedule>;

const db = defaultDb;
const classesCol = collection(db, 'classes');

/**
 * Live subscription to all classes, ordered by name. Accepts an optional
 * Firestore instance — the student portal passes `studentDb` (see
 * lib/firebaseStudent.js) so reads happen under the student's own
 * Firebase Auth session, which firestore.rules can then authorize.
 */
export function subscribeClasses(
  callback: (classes: ClassDoc[]) => void,
  firestore: Firestore = db
): Unsubscribe {
  const q = query(collection(firestore, 'classes'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ClassDoc, 'id'>),
      }))
    );
  });
}

export async function addClass(data: ClassInput) {
  return addDoc(classesCol, data);
}

export async function updateClass(id: string, data: Partial<ClassInput>) {
  return updateDoc(doc(db, 'classes', id), data);
}

/** Deletes a class, its schedule doc, and unenrolls any students from it. */
export async function deleteClass(
  id: string,
  studentsWithThisClass: ClassStudent[]
) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'classes', id));
  batch.delete(doc(db, 'classSchedule', id));
  studentsWithThisClass.forEach((s) => {
    batch.update(doc(db, 'students', s.id), {
      classIds: arrayRemove(id),
    });
  });
  return batch.commit();
}

/**
 * Live subscription to every class's schedule doc, merged into
 * { [classId]: { cancelled: string[], extra: string[], extraTimes?: { [date]: 'HH:MM' } } }.
 * extraTimes holds per-date time overrides for BOTH scheduled and extra sessions.
 */
export function subscribeAllSchedules(
  callback: (map: SchedulesMap) => void,
  firestore: Firestore = db
): Unsubscribe {
  const col = collection(firestore, 'classSchedule');
  return onSnapshot(col, (snap) => {
    const map: SchedulesMap = {};
    snap.docs.forEach((d) => {
      map[d.id] = {
        cancelled: [],
        extra: [],
        extraTimes: {},
        ...(d.data() as Partial<ClassSchedule>),
      };
    });
    callback(map);
  });
}

async function ensureScheduleDoc(
  classId: string
): Promise<DocumentReference> {
  const ref = doc(db, 'classSchedule', classId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { cancelled: [], extra: [], extraTimes: {} });
  }
  return ref;
}

async function notifyEnrolled(
  enrolledStudents: ClassStudent[] | undefined,
  title: string,
  msg: string
) {
  await Promise.all(
    (enrolledStudents || []).map((s) =>
      addStudentNotification({ studentId: s.id, type: 'class', title, msg })
    )
  );
}

/**
 * Session time for a date: per-date override in extraTimes if present,
 * else the class's default weekly time. Works for scheduled AND extra sessions.
 */
export function getSessionTime(
  cls: Pick<ClassDoc, 'time'> | null | undefined,
  schedule: ClassSchedule | null | undefined,
  dateStr: string
): string {
  const times = schedule?.extraTimes || {};
  if (times[dateStr]) return times[dateStr];
  return cls?.time || '';
}

export async function cancelClassDate(
  classId: string,
  dateStr: string,
  className: string | undefined,
  enrolledStudents: ClassStudent[]
) {
  const ref = await ensureScheduleDoc(classId);
  // Keep any time override so it still applies if the class is restored later.
  await updateDoc(ref, {
    cancelled: arrayUnion(dateStr),
    extra: arrayRemove(dateStr),
  });
  await notifyEnrolled(
    enrolledStudents,
    `Class cancelled — ${dateStr}`,
    `${className || 'Your class'} on ${dateStr} has been cancelled.`
  );
}

export async function uncancelClassDate(
  classId: string,
  dateStr: string,
  className: string | undefined,
  enrolledStudents: ClassStudent[]
) {
  const ref = await ensureScheduleDoc(classId);
  await updateDoc(ref, { cancelled: arrayRemove(dateStr) });
  await notifyEnrolled(
    enrolledStudents,
    `Class restored — ${dateStr}`,
    `${className || 'Your class'} on ${dateStr} is back on as scheduled.`
  );
}

/**
 * Add an extra session on dateStr.
 * @param time optional HH:MM — stored in extraTimes; falls back to class.time when omitted
 */
export async function addExtraClassDate(
  classId: string,
  dateStr: string,
  className: string | undefined,
  enrolledStudents: ClassStudent[],
  time?: string
) {
  const ref = await ensureScheduleDoc(classId);
  const payload: Record<string, unknown> = { extra: arrayUnion(dateStr) };
  if (time) {
    payload[`extraTimes.${dateStr}`] = time;
  }
  await updateDoc(ref, payload);
  const timeNote = time ? ` at ${time}` : '';
  await notifyEnrolled(
    enrolledStudents,
    `Extra class added — ${dateStr}`,
    `An extra session of ${className || 'your class'} has been scheduled on ${dateStr}${timeNote}.`
  );
}

export async function removeExtraClassDate(
  classId: string,
  dateStr: string,
  className: string | undefined,
  enrolledStudents: ClassStudent[]
) {
  const ref = await ensureScheduleDoc(classId);
  await updateDoc(ref, {
    extra: arrayRemove(dateStr),
    [`extraTimes.${dateStr}`]: deleteField(),
  });
  await notifyEnrolled(
    enrolledStudents,
    `Extra class removed — ${dateStr}`,
    `The extra session of ${className || 'your class'} on ${dateStr} has been removed.`
  );
}

/**
 * Set (or clear) the time override for a session on dateStr —
 * works for default scheduled days and extra sessions alike.
 */
export async function setSessionTime(
  classId: string,
  dateStr: string,
  time: string | null | undefined,
  className?: string,
  enrolledStudents?: ClassStudent[]
) {
  const ref = await ensureScheduleDoc(classId);
  await updateDoc(ref, {
    [`extraTimes.${dateStr}`]: time || deleteField(),
  });
  if (time && enrolledStudents) {
    await notifyEnrolled(
      enrolledStudents,
      `Class time updated — ${dateStr}`,
      `${className || 'Your class'} on ${dateStr} is now at ${time}.`
    );
  }
}

/** @deprecated alias — use setSessionTime */
export async function setExtraClassTime(
  classId: string,
  dateStr: string,
  time: string | null | undefined
) {
  return setSessionTime(classId, dateStr, time);
}