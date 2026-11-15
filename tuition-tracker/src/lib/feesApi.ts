import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import { addStudentNotification } from '@/lib/studentNotificationsApi';
import { fmtMonth } from '@/lib/dateUtils';

const feesCol = collection(db, 'fees');

/** Live subscription to all fee records. */
export function subscribeFees(callback) {
  const q = query(feesCol, orderBy('month', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/**
 * Live subscription scoped to one student's own fees (used by the student
 * portal — pass `studentDb` from lib/firebaseStudent.js so the read
 * happens under the student's own Firebase Auth session, which
 * firestore.rules can then authorize). No orderBy combined with the where
 * clause, so this never needs a composite index — sorted client-side
 * instead.
 */
export function subscribeFeesForStudent(studentId, callback, firestore = db) {
  const q = query(collection(firestore, 'fees'), where('studentId', '==', studentId));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => b.month.localeCompare(a.month));
    callback(rows);
  });
}

// Only two statuses are surfaced — paid or unpaid. A partial payment can
// still be recorded (the actual `paid` amount is tracked accurately for
// financial totals), it just isn't classified as its own status; anything
// short of the full amount reads as unpaid until it's settled.
export const feeStatus = (f) => (!f ? null : f.paid >= f.amount ? 'paid' : 'unpaid');

export const feeStatusColor = { paid: '#22c55e', unpaid: '#ef4444' };

/**
 * Creates any missing fee records for `month` across all classes, skipping
 * archived classes and students marked billingStatus 'free'. Called
 * automatically (Dashboard + Fees page, on load) instead of a manual
 * "Generate fees" button — this is what keeps fee records appearing
 * without the tutor having to remember to press anything each month.
 * Safe to call repeatedly; only ever creates what's missing.
 */
export async function ensureFeesForMonth(month, classes, students, existingFees) {
  const batch = writeBatch(db);
  let count = 0;
  classes
    .filter((c) => !c.archived)
    .forEach((c) => {
      students
        .filter((s) => s.classIds?.includes(c.id) && s.billingStatus !== 'free')
        .forEach((s) => {
          const exists = existingFees.some(
            (f) => f.studentId === s.id && f.classId === c.id && f.month === month
          );
          if (!exists) {
            const ref = doc(feesCol);
            batch.set(ref, {
              studentId: s.id,
              classId: c.id,
              month,
              amount: c.fee,
              paid: 0,
              paidDate: null,
              method: null,
              note: '',
            });
            count++;
          }
        });
    });
  if (count > 0) await batch.commit();
  return count;
}

/**
 * Finds this month's fee for a student+class among already-loaded fees, or
 * creates it. Returns the fee id, or null if the student is fee-exempt
 * (billingStatus 'free') — callers should check for null and skip showing
 * a Pay action in that case.
 */
export async function ensureFeeId(existingFees, student, classId, month, amount) {
  if (student.billingStatus === 'free') return null;
  const found = existingFees.find((f) => f.studentId === student.id && f.classId === classId && f.month === month);
  if (found) return found.id;
  const ref = await addDoc(feesCol, {
    studentId: student.id,
    classId,
    month,
    amount,
    paid: 0,
    paidDate: null,
    method: null,
    note: '',
  });
  return ref.id;
}

/** Records a payment against a fee (tops up `paid`, capped at `amount`), and notifies the student. */
export async function recordPayment(fee, amountToAdd, date, method, note) {
  const newPaid = Math.min(fee.paid + amountToAdd, fee.amount);
  await updateDoc(doc(db, 'fees', fee.id), {
    paid: newPaid,
    paidDate: date,
    method,
    note: note || '',
  });
  const balance = fee.amount - newPaid;
  await addStudentNotification({
    studentId: fee.studentId,
    type: 'fee',
    title: `Payment recorded — ${fmtMonth(fee.month)}`,
    msg:
      balance > 0
        ? `LKR ${amountToAdd.toLocaleString()} received. Remaining balance: LKR ${balance.toLocaleString()}.`
        : `LKR ${amountToAdd.toLocaleString()} received. This month is now fully paid — thank you!`,
  });
}
