// The student portal signs in via a Firebase custom token (see
// api/student-login/route.js) so that Firestore Security Rules can
// recognize `request.auth` for student reads/writes. It's critical this
// uses a SEPARATE named Firebase App instance from the default one in
// lib/firebase.js — that default app's `auth` is what the tutor's
// AuthContext watches via onAuthStateChanged. If students signed in on
// the same app instance, a signed-in student would make the tutor's
// `useAuth()` think a tutor is logged in too (RequireAuth only checks
// "is someone signed in", not their role), which would expose the entire
// tutor dashboard to students. Using a second named app keeps the two
// sessions fully independent, even in the same browser tab.
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const STUDENT_APP_NAME = 'student-portal';

const studentApp: FirebaseApp = getApps().some((a) => a.name === STUDENT_APP_NAME)
  ? getApp(STUDENT_APP_NAME)
  : initializeApp(firebaseConfig, STUDENT_APP_NAME);

export const studentAuth: Auth = getAuth(studentApp);
export const studentDb: Firestore = getFirestore(studentApp);