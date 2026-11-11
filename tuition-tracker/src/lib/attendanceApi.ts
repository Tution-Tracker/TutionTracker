import { db } from '@/lib/firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { addStudentNotification } from '@/lib/studentNotificationsApi';

// Attendance is stored one doc per class+date session, id = `${classId}__${date}`,
// with the doc body being a plain map of { [studentId]: 'present' } — a
// student with no entry at all is absent. This matches the actual
// workflow: at the end of class the tutor only taps the students who
// showed up; everyone else is absent by default, with nothing to
// separately mark. (Older sessions saved before this change may still
// have 'late'/'absent' values sitting in Firestore — attRateFor/
// studentAttRate below still recognize them so historical rates don't
// shift, but nothing in the app writes those values anymore.)
// We subscribe to the whole collection (mirrors the original prototype's
// approach of keeping everything in local state) since a single tutor's
// data set is small; this keeps every page's math (rates, session logs)
// simple and consistent.

export const attKey = (classId, date) => `${classId}__${date}`;

/**
 * callback receives { [docId]: { [studentId]: status } }. Accepts an
 * optional Firestore instance — the student portal passes `studentDb` (see
 * lib/firebaseStudent.js) so reads happen under the student's own Firebase
 * Auth session, which firestore.rules can then authorize. Note: since a
 * session doc holds every enrolled student's status in one map, any
 * signed-in student can see their classmates' attendance for classes they
 * share — see PHASES.md Phase 8 notes for why, and what a tighter
 * data model would look like.
 */
export function subscribeAllAttendance(callback, firestore = db) {
  return onSnapshot(collection(firestore, 'attendance'), (snap) => {
    const map = {};
    snap.docs.forEach((d) => {
      map[d.id] = d.data();
    });
    callback(map);
  });
}

/**
 * Overwrites the full status map for one class+date session, and notifies
 * each present student. Absent students aren't written to the map at all
 * (implicit), so there's nothing to notify them about. `className` is
 * only needed for the notification text — pass it from wherever the class
 * list is already loaded.
 */
export async function saveAttendanceSession(classId, date, statusMap, className) {
  await setDoc(doc(db, 'attendance', attKey(classId, date)), statusMap);
  await Promise.all(
    Object.entries(statusMap)
      .filter(([, status]) => status === 'present')
      .map(([studentId]) =>
        addStudentNotification({
          studentId,
          type: 'attendance',
          title: `Attendance marked — ${date}`,
          msg: `You were marked present for ${className || 'your class'} on ${date}.`,
        })
      )
  );
}

/** Toggles a student's mark between present and absent (unmarked). */
export function nextAttStatus(current) {
  return current === 'present' ? '' : 'present';
}

export const attLabel = (v) => (v === 'present' ? '✓ Present' : v === 'late' ? '⏰ Late' : '✗ Absent');

export const attColor = (r) =>
  r === null || r === undefined ? 'var(--muted, #7a8aaa)' : r >= 80 ? '#22c55e' : r >= 60 ? '#f59e0b' : '#ef4444';

/** Attendance rate (%) for one student in one class, or null if no sessions yet. */
export function attRateFor(attendanceMap, studentId, classId) {
  const sessions = Object.entries(attendanceMap).filter(([k]) => k.startsWith(classId + '__'));
  if (!sessions.length) return null;
  const present = sessions.filter(([, v]) => v[studentId] === 'present' || v[studentId] === 'late').length;
  return Math.round((present / sessions.length) * 100);
}

/** Overall attendance rate (%) for a student across all their classes. */
export function studentAttRate(attendanceMap, studentId, classIds) {
  let total = 0;
  let present = 0;
  (classIds || []).forEach((cid) => {
    Object.entries(attendanceMap)
      .filter(([k]) => k.startsWith(cid + '__'))
      .forEach(([, v]) => {
        total++;
        if (v[studentId] === 'present' || v[studentId] === 'late') present++;
      });
  });
  return total === 0 ? null : Math.round((present / total) * 100);
}

/** All session entries for one class, sorted most recent first: [{date, statusMap}] */
export function sessionsForClass(attendanceMap, classId) {
  return Object.entries(attendanceMap)
    .filter(([k]) => k.startsWith(classId + '__'))
    .map(([k, v]) => ({ date: k.split('__')[1], statusMap: v }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
