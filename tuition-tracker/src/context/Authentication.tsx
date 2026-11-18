'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logActivity, actorLabelFor } from '@/lib/activityLog';

interface AuthContextValue {
  user: User | null;
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface AppAuthError extends Error {
  code: string;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u: User | null) => {
      if (!u) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      let claimRole: string | null = null;
      try {
        const tok = await u.getIdTokenResult();
        claimRole = tok.claims.role as string | null;
      } catch (e: unknown) {
        claimRole = null;
      }
      if (claimRole !== 'admin') {
        setUser(null);
        setRole(null);
        setLoading(false);
        signOut(auth).catch(() => {});
        return;
      }
      setUser(u);
      setRole(claimRole);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tok = await cred.user.getIdTokenResult(true);
    if (tok.claims.role !== 'admin') {
      await signOut(auth);
      const err = new Error('This account does not have admin access.') as AppAuthError;
      err.code = 'app/not-admin';
      throw err;
    }
    logActivity('auth.signin', {
      entityType: 'admin', entityId: cred.user.uid,
      summary: `${actorLabelFor(cred.user)} signed in`,
    });
  }

  async function logout(): Promise<void> {
    if (auth.currentUser) {
      await logActivity('auth.signout', {
        entityType: 'admin', entityId: auth.currentUser.uid,
        summary: `${actorLabelFor(auth.currentUser)} signed out`,
      });
    }
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, role, isAdmin: role === 'admin', loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}