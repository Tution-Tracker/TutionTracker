import {
  initializeApp,
  getApps,
  cert,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

interface RawServiceAccount {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
}

function loadServiceAccount(): RawServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env.local — see README.md for how to generate one.'
    );
  }
  try {
    return JSON.parse(raw) as RawServiceAccount;
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the whole downloaded key file as a single-line string.'
    );
  }
}

const serviceAccount = loadServiceAccount();

const app: App = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      } satisfies ServiceAccount),
    });

export const adminProjectId: string | null = serviceAccount.project_id || null;

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);