import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { AuditKind, AuditLogInput } from '@/types';

export const LOG_KINDS: readonly AuditKind[] = ['signin', 'change', 'security', 'data'];

export function kindForAction(action = ''): AuditKind {
  if (action.startsWith('auth.')) return 'signin';
  if (action.startsWith('security.')) return 'security';
  if (action.startsWith('data.')) return 'data';
  return 'change';
}

export function actorLabelFor(user: Pick<User, 'displayName' | 'email'> | null | undefined): string {
  if (!user) return 'Admin';
  return user.displayName || (user.email ? user.email.split('@')[0] : 'Admin');
}

const clip = (v: unknown, n: number): string => String(v ?? '').slice(0, n);

export async function logActivity(
  action: string,
  { entityType = '', entityId = '', entityName = '', summary = '' }: AuditLogInput = {}
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'auditLogs'), {
      at: serverTimestamp(),
      actorUid: user.uid,
      actorRole: 'admin',
      actorLabel: clip(actorLabelFor(user), 80),
      action: clip(action, 60),
      kind: kindForAction(action),
      entityType: clip(entityType, 40),
      entityId: clip(entityId, 120),
      entityName: clip(entityName, 120),
      summary: clip(summary, 400),
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.warn('Activity log write failed:', err?.code || err?.message);
  }
}

/** Best-effort lookup of a document's display name (for log summaries). */
export async function nameOf(collectionName: string, id: string, field = 'name'): Promise<string> {
  try {
    const snap = await getDoc(doc(db, collectionName, id));
    return snap.exists() ? snap.data()[field] || id : id;
  } catch {
    return id;
  }
}
