'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onIdTokenChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { studentAuth, studentDb } from '@/lib/firebaseStudent';

export interface Student {
  id: string;
  [key: string]: unknown;
}

interface StudentAuthContextType {
  studentId: string | null;
  student: Student | null;
  loading: boolean;
  login: (customToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextType>({
  studentId: null,
  student: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

interface StudentAuthProviderProps {
  children: ReactNode;
}

export function StudentAuthProvider({ children }: StudentAuthProviderProps) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [studentLoaded, setStudentLoaded] = useState(false);

  useEffect(() => {
    const unsub = onIdTokenChanged(studentAuth, async (user) => {
      if (!user) {
        setStudentId(null);
        setAuthChecked(true);
        setStudentLoaded(true);
        return;
      }
      let role: string | null = null;
      try {
        role = ((await user.getIdTokenResult()).claims.role as string | undefined) || null;
      } catch (e) {
        role = null;
      }
      if (role !== 'student') {
        setStudentId(null);
        setAuthChecked(true);
        setStudentLoaded(true);
        signOut(studentAuth).catch(() => {});
        return;
      }
      setStudentId(user.uid);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!studentId) {
      setStudent(null);
      return;
    }
    setStudentLoaded(false);
    const unsub = onSnapshot(doc(studentDb, 'students', studentId), (snap) => {
      setStudent(snap.exists() ? ({ id: snap.id, ...snap.data() } as Student) : null);
      setStudentLoaded(true);
    });
    return unsub;
  }, [studentId]);

  /** customToken comes from POST /api/student-login (email+NIC verified server-side). */
  async function login(customToken: string): Promise<void> {
    await signInWithCustomToken(studentAuth, customToken);
  }

  async function logout(): Promise<void> {
    await signOut(studentAuth);
    setStudentId(null);
    setStudent(null);
  }

  const loading = !authChecked || (!!studentId && !studentLoaded);

  return (
    <StudentAuthContext.Provider value={{ studentId, student, loading, login, logout }}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth(): StudentAuthContextType {
  return useContext(StudentAuthContext);
}