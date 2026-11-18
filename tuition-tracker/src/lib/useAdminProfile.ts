'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeAdminProfile } from '@/lib/adminProfileApi';
import type { AdminProfile } from '@/types';

/** Live admin profile for the signed-in admin. `profile` is null until one is saved. */
export function useAdminProfile(): { profile: AdminProfile | null; loading: boolean } {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeAdminProfile(
      uid,
      (p) => {
        setProfile(p);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [uid]);

  return { profile, loading };
}
