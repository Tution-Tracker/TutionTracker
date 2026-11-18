import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import type { AdminProfile } from '@/types';

// One profile document per admin account: adminProfiles/{uid}.
// Only that admin can read or write it (see firestore.rules).
//
// Fields: name, title, phone, contactEmail, address, bio,
//         places: [{ id, name, address, notes }], updatedAt
// `contactEmail` is the public-facing contact address (used by the portfolio
// in a later phase). The email you SIGN IN with lives in Firebase Auth and
// is changed from the Security tab.

export const EMPTY_PROFILE: AdminProfile = {
  name: '',
  title: '',
  phone: '',
  contactEmail: '',
  address: '',
  bio: '',
  places: [],
};

export const LIMITS = {
  name: 80,
  title: 100,
  phone: 30,
  contactEmail: 120,
  address: 300,
  bio: 2000,
  placeName: 80,
  placeAddress: 300,
  placeNotes: 300,
  maxPlaces: 50,
} as const;

export function subscribeAdminProfile(
  uid: string,
  callback: (profile: AdminProfile | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'adminProfiles', uid),
    (snap) => callback(snap.exists() ? ({ ...EMPTY_PROFILE, ...snap.data() } as AdminProfile) : null),
    (err) => onError?.(err)
  );
}

/** Merge-saves the given fields. Only pass fields that should change. */
export async function saveAdminProfile(
  uid: string,
  data: Partial<Omit<AdminProfile, 'updatedAt'>>
): Promise<void> {
  await setDoc(doc(db, 'adminProfiles', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
