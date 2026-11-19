export const runtime = 'nodejs';

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb, adminAuth, adminProjectId } from '@/lib/firebaseAdmin';
import { getClientIp, isLimited, recordHit, resetKey } from '@/lib/rateLimit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 30;
const GENERIC_FAIL: { error: string } = {
  error: "We couldn't sign you in with those details. Check them, or ask your tutor.",
};

function safeEqual(a: unknown, b: unknown): boolean {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

function serverError(logMessage: string, devDetail?: string): NextResponse {
  console.error('[student-login]', logMessage);
  const body: { error: string; detail?: string } = {
    error: 'Sign-in is temporarily unavailable. Please try again later.',
  };
  if (process.env.NODE_ENV !== 'production' && devDetail) body.detail = devDetail;
  return NextResponse.json(body, { status: 500 });
}

interface StudentLoginBody {
  email?: unknown;
  nic?: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: StudentLoginBody;
  try {
    body = (await request.json()) as StudentLoginBody;
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const nic = String(body.nic || '').trim().toUpperCase();

  if (!email || !nic || email.length > 200 || nic.length > 40) {
    return NextResponse.json({ error: 'Email and NIC are required.' }, { status: 400 });
  }

  const ip = getClientIp(request);
  const emailKey = `student-login:email:${email}`;
  const ipKey = `student-login:ip:${ip}`;

  if (isLimited(emailKey, MAX_FAILS_PER_EMAIL, WINDOW_MS) || isLimited(ipKey, MAX_FAILS_PER_IP, WINDOW_MS)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const webProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (webProjectId && adminProjectId && webProjectId !== adminProjectId) {
    return serverError(
      `Project mismatch: browser uses "${webProjectId}", service account is "${adminProjectId}".`,
      `Project mismatch: app uses "${webProjectId}" but FIREBASE_SERVICE_ACCOUNT_KEY is for "${adminProjectId}".`
    );
  }

  let candidates: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  try {
    const q = await adminDb.collection('students').where('email', '==', email).get();
    candidates = q.docs;

    if (candidates.length === 0) {
      const all = await adminDb.collection('students').get();
      candidates = all.docs.filter(
        (d) => String(d.data().email || '').trim().toLowerCase() === email
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(`Firestore read failed: ${msg}`, msg);
  }

  const match = candidates.find((d) => {
    const stored = String(d.data().nic || '').trim().toUpperCase();
    return stored.length > 0 && safeEqual(stored, nic);
  });

  if (!match) {
    recordHit(emailKey, WINDOW_MS);
    recordHit(ipKey, WINDOW_MS);
    return NextResponse.json(GENERIC_FAIL, { status: 401 });
  }

  resetKey(emailKey);

  try {
    const customToken = await adminAuth.createCustomToken(match.id, { role: 'student' });

    return NextResponse.json({ ok: true, studentId: match.id, name: match.data().name, customToken });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(`createCustomToken failed: ${msg}`, msg);
  }
}