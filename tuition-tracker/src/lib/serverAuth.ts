import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '@/lib/firebaseAdmin';

type Role = 'admin' | 'student';

async function verifyRole(request: Request, role: Role): Promise<DecodedIdToken | null> {
  const header = request.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    return decoded.role === role ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyAdminRequest(request: Request): Promise<DecodedIdToken | null> {
  return verifyRole(request, 'admin');
}

export function verifyStudentRequest(request: Request): Promise<DecodedIdToken | null> {
  return verifyRole(request, 'student');
}
