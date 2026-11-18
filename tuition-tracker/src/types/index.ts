import type { Timestamp } from 'firebase/firestore';

/* ── Admin profile (adminProfiles/{uid}) ─────────────────────────────── */

export interface Place {
  id: string;
  name: string;
  address: string;
  notes: string;
}

export interface AdminProfile {
  name: string;
  title: string;
  phone: string;
  contactEmail: string;
  address: string;
  bio: string;
  places: Place[];
  updatedAt?: Timestamp;
}

/** The plain-text fields on the Details tab. */
export type AdminProfileTextField = 'name' | 'title' | 'phone' | 'contactEmail' | 'address' | 'bio';

/** What a student sees in the "Your tutor" popup (GET /api/student/tutor). */
export interface TutorInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  places: Place[];
}

/* ── Student portal ──────────────────────────────────────────────────── */

export type ExamTypeId = 'mcq' | 'essay' | 'structured';

export interface ExamTypeInfo {
  id: ExamTypeId;
  label: string;
  color: string;
}

/** One of the signed-in student's own marks (GET /api/student/exams). */
export interface StudentExam {
  id: string;
  name: string;
  classId: string;
  type: ExamTypeId;
  date: string; // YYYY-MM-DD
  maxMarks: number;
  mark: number;
}

export type FeeStatus = 'paid' | 'unpaid';

export interface FeeRecord {
  id: string;
  studentId?: string;
  classId: string;
  month: string; // YYYY-MM
  amount: number;
  paid: number;
  method?: string;
  paidDate?: string;
}

export interface ClassRef {
  id: string;
  name: string;
}

export interface StudentNotification {
  id: string;
  studentId?: string;
  type?: string; // 'attendance' | 'fee' | 'class' | 'general'
  title: string;
  msg: string;
  time?: string;
  read?: boolean;
}

/* ── Activity log (auditLogs) ────────────────────────────────────────── */

export type AuditKind = 'signin' | 'change' | 'security' | 'data';
export type ActorRole = 'admin' | 'student';

export interface AuditLogInput {
  entityType?: string;
  entityId?: string;
  entityName?: string;
  summary?: string;
}

export interface AuditLogEntry {
  id: string;
  /** null for a moment after a write, until the server timestamp resolves. */
  at: Timestamp | null;
  actorUid: string;
  actorRole: ActorRole;
  actorLabel: string;
  action: string;
  kind: AuditKind;
  entityType: string;
  entityId: string;
  entityName: string;
  summary: string;
}
