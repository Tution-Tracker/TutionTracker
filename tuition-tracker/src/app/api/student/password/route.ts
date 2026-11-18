export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyStudentRequest } from '@/lib/serverAuth';
import { hashPassword, verifyPassword, checkPasswordRules } from '@/lib/passwords';
import { isLimited, recordHit, resetKey } from '@/lib/rateLimit';

const WINDOW_MS = 15 * 60 * 1000;


export async function POST(request: Request) {
  const decoded = await verifyStudentRequest(request);
  if (!decoded) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const studentId = decoded.uid;

  let body: { studentId?: unknown; newPassword?: unknown; currentPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';

  try {
    const studentSnap = await adminDb.collection('students').doc(studentId).get();
    if (!studentSnap.exists) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

    const ruleError = checkPasswordRules(newPassword, studentSnap.data()?.nic);
    if (ruleError) return NextResponse.json({ error: ruleError }, { status: 400 });

    const credRef = adminDb.collection('studentCredentials').doc(studentId);
    const cred = await credRef.get();

    if (cred.exists && cred.data()?.hash) {
      const key = `student-pw:${studentId}`;
      if (isLimited(key, 5, WINDOW_MS)) {
        return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 });
      }
      if (!currentPassword || !(await verifyPassword(currentPassword, cred.data()?.hash))) {
        recordHit(key, WINDOW_MS);
        return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 400 });
      }
      resetKey(key);
    }

    const now = new Date().toISOString();
    await credRef.set({ hash: await hashPassword(newPassword), updatedAt: now });
    await adminDb.collection('students').doc(studentId).update({
      passwordSetAt: now,
      passwordResetAt: FieldValue.delete(),
    });
    return NextResponse.json({ ok: true, passwordSetAt: now });
  } catch (e) {
    console.error('[student-password]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not save your password. Please try again.' }, { status: 500 });
  }
}
