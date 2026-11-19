
import { studentAuth } from '@/lib/firebaseStudent';
import type { StudentExam, TutorInfo } from '@/types';

async function authedFetch<T extends object>(path: string, options: RequestInit = {}): Promise<T> {
  const user = studentAuth.currentUser;
  if (!user) throw new Error('Please sign in again.');
  const token = await user.getIdToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');

  const res = await fetch(path, { ...options, headers });
  let data = {} as T & { error?: string };
  try {
    data = await res.json();
  } catch {

  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export async function fetchMyExams(): Promise<StudentExam[]> {
  const data = await authedFetch<{ exams?: StudentExam[] }>('/api/student/exams');
  return data.exams || [];
}


export async function fetchTutorInfo(): Promise<TutorInfo | null> {
  const data = await authedFetch<{ tutor?: TutorInfo | null }>('/api/student/tutor');
  return data.tutor || null;
}

export async function savePassword({
  newPassword,
  currentPassword,
}: {
  newPassword: string;
  currentPassword?: string;
}): Promise<{ ok: boolean; passwordSetAt?: string }> {
  return authedFetch('/api/student/password', {
    method: 'POST',
    body: JSON.stringify({ newPassword, currentPassword }),
  });
}
