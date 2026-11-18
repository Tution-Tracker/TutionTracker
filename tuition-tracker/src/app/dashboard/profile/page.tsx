'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';
import { useAuth } from '@/context/Authentication';
import { useToast } from '@/context/ToastContext';
import { subscribeAdminProfile, saveAdminProfile, EMPTY_PROFILE, LIMITS } from '@/lib/adminProfileApi';
import ConfirmDialog from '@/components/ConfirmDialog';
import Field from '@/components/profile/Field';
import type { AdminProfile, AdminProfileTextField, Place } from '@/types';

type TabId = 'details' | 'places' | 'security';
type ToastFn = ReturnType<typeof useToast>['toast'];
type DetailErrors = Partial<Record<AdminProfileTextField, string>>;
type StatusMsg = { type: '' | 'ok' | 'err'; text: string };

const TABS: { id: TabId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'places', label: 'Class places' },
  { id: 'security', label: 'Security' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,30}$/;

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function authErrorMessage(err: unknown): string {
  switch ((err as { code?: string } | null)?.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Current password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again, then retry.';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/email-already-in-use':
      return 'That email is already used by another account.';
    case 'auth/weak-password':
      return 'New password is too weak.';
    case 'auth/operation-not-allowed':
      return 'Changing email is not allowed for this project. Check Firebase Authentication settings.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function AdminProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.uid;

  const [tab, setTab] = useState<TabId>('details');
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ---- details form ----
  const [form, setForm] = useState<AdminProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<DetailErrors>({});
  const initRef = useRef(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeAdminProfile(
      uid,
      (p) => {
        setProfile(p);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
  }, [uid]);

  // Fill the form once, when the saved profile first arrives.
  useEffect(() => {
    if (!loaded || initRef.current) return;
    initRef.current = true;
    if (profile) setForm({ ...EMPTY_PROFILE, ...profile });
  }, [loaded, profile]);

  const saved: AdminProfile = { ...EMPTY_PROFILE, ...(profile || {}) };
  const detailKeys: AdminProfileTextField[] = ['name', 'title', 'phone', 'contactEmail', 'address', 'bio'];
  const dirty = detailKeys.some((k) => (form[k] || '').trim() !== (saved[k] || '').trim());

  function setField(k: AdminProfileTextField, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateDetails(): DetailErrors {
    const e: DetailErrors = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) e.phone = 'Enter a valid phone number.';
    if (form.contactEmail.trim() && !EMAIL_RE.test(form.contactEmail.trim())) e.contactEmail = 'Enter a valid email.';
    return e;
  }

  async function saveDetails(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!uid) return;
    const e = validateDetails();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const clean: Partial<Record<AdminProfileTextField, string>> = {};
      detailKeys.forEach((k) => (clean[k] = (form[k] || '').trim()));
      await saveAdminProfile(uid, clean);
      setForm((f) => ({ ...f, ...clean }));
      toast('Profile saved');
    } catch {
      toast('Could not save profile', 'red');
    } finally {
      setSaving(false);
    }
  }

  const initial = ((saved.name || '').trim()[0] || 'A').toUpperCase();

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-accent/[0.15] text-accent2 flex items-center justify-center font-bold text-xl shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{saved.name || 'Admin profile'}</h1>
          <div className="text-sm text-muted mt-0.5 truncate">
            {saved.title || 'Admin'} · {user?.email}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 border-b border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 text-sm -mb-px border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-accent2 text-accent2 font-semibold'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : (
        <>
          {tab === 'details' && (
            <form onSubmit={saveDetails} className="card" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <Field label="Full name *" error={errors.name}>
                  <input
                    value={form.name}
                    maxLength={LIMITS.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Title / headline">
                  <input
                    value={form.title}
                    maxLength={LIMITS.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g. Mathematics & Science Tutor"
                  />
                </Field>
                <Field label="Phone number" error={errors.phone}>
                  <input
                    value={form.phone}
                    maxLength={LIMITS.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="+94 77 123 4567"
                    inputMode="tel"
                  />
                </Field>
                <Field label="Contact email" error={errors.contactEmail} hint="Shown to students/visitors. Your sign-in email is changed under Security.">
                  <input
                    type="email"
                    value={form.contactEmail}
                    maxLength={LIMITS.contactEmail}
                    onChange={(e) => setField('contactEmail', e.target.value)}
                    placeholder="contact@example.com"
                  />
                </Field>
              </div>
              <Field label="Address">
                <textarea
                  rows={2}
                  value={form.address}
                  maxLength={LIMITS.address}
                  onChange={(e) => setField('address', e.target.value)}
                  placeholder="Home / office address"
                />
              </Field>
              <Field label="About / details" hint={`${(form.bio || '').length}/${LIMITS.bio}`}>
                <textarea
                  rows={5}
                  value={form.bio}
                  maxLength={LIMITS.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                  placeholder="Qualifications, experience, teaching style…"
                />
              </Field>
              <div className="flex items-center gap-3 mt-1">
                <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {dirty && !saving && <span className="text-sm text-amber">Unsaved changes</span>}
              </div>
            </form>
          )}

          {tab === 'places' && <PlacesTab uid={uid} places={saved.places} toast={toast} />}
          {tab === 'security' && <SecurityTab user={user} toast={toast} />}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Class places ───────────────────────── */

const EMPTY_PLACE = { name: '', address: '', notes: '' };

type PlaceForm = Omit<Place, 'id'>;

function PlacesTab({ uid, places, toast }: { uid: string | undefined; places: Place[]; toast: ToastFn }) {
  const [form, setForm] = useState<PlaceForm>(EMPTY_PLACE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  function startEdit(p: Place) {
    setEditingId(p.id);
    setForm({ name: p.name || '', address: p.address || '', notes: p.notes || '' });
    setNameErr('');
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_PLACE);
    setNameErr('');
  }

  async function persist(next: Place[], message: string): Promise<boolean> {
    if (!uid) return false;
    setBusy(true);
    try {
      await saveAdminProfile(uid, { places: next });
      toast(message);
      return true;
    } catch {
      toast('Could not save places', 'red');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setNameErr('Place name is required.');
      return;
    }
    const dup = places.some((p) => p.id !== editingId && (p.name || '').trim().toLowerCase() === name.toLowerCase());
    if (dup) {
      setNameErr('You already have a place with this name.');
      return;
    }
    if (!editingId && places.length >= LIMITS.maxPlaces) {
      setNameErr(`You can save up to ${LIMITS.maxPlaces} places.`);
      return;
    }
    const item: Place = { id: editingId || newId(), name, address: form.address.trim(), notes: form.notes.trim() };
    const next = editingId ? places.map((p) => (p.id === editingId ? item : p)) : [...places, item];
    if (await persist(next, editingId ? 'Place updated' : 'Place added')) reset();
  }

  async function confirmRemove() {
    const next = places.filter((p) => p.id !== removeId);
    setRemoveId(null);
    if (await persist(next, 'Place removed') && editingId === removeId) reset();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-3">
        {places.length === 0 ? (
          <div className="card text-sm text-muted">
            No places yet. Add the venues where you teach — they will appear as suggestions when you create or edit a class.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {places.map((p) => (
              <div key={p.id} className="card flex items-start gap-3">
                <div className="text-lg leading-none mt-0.5">📍</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{p.name}</div>
                  {p.address && <div className="text-sm text-muted mt-0.5">{p.address}</div>}
                  {p.notes && <div className="text-[13px] text-muted mt-1">{p.notes}</div>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button className="btn btn-outline !px-2.5 !py-1.5" onClick={() => startEdit(p)}>
                    Edit
                  </button>
                  <button className="btn btn-danger !px-2.5 !py-1.5" onClick={() => setRemoveId(p.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="card md:col-span-2 h-fit" noValidate>
        <div className="text-sm font-semibold text-white mb-3">{editingId ? 'Edit place' : 'Add a place'}</div>
        <Field label="Place name *" error={nameErr}>
          <input
            value={form.name}
            maxLength={LIMITS.placeName}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setNameErr('');
            }}
            placeholder="e.g. Main hall, Room 1"
          />
        </Field>
        <Field label="Address">
          <textarea
            rows={2}
            value={form.address}
            maxLength={LIMITS.placeAddress}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
        <Field label="Notes">
          <input
            value={form.notes}
            maxLength={LIMITS.placeNotes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Parking, landmarks, capacity…"
          />
        </Field>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? 'Save place' : 'Add place'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={reset}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={!!removeId}
        title="Remove this place?"
        message="Classes that already use this venue keep their text; it just stops appearing as a suggestion."
        onCancel={() => setRemoveId(null)}
        onConfirm={confirmRemove}
      />
    </div>
  );
}

/* ───────────────────────── Security ───────────────────────── */

function SecurityTab({ user, toast }: { user: User | null; toast: ToastFn }) {
  // sign-in email
  const [newEmail, setNewEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<StatusMsg>({ type: '', text: '' });

  // password
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<StatusMsg>({ type: '', text: '' });

  async function reauth(currentUser: User, password: string) {
    if (!currentUser.email) throw new Error('This account has no email address.');
    const cred = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, cred);
  }

  async function changeEmail(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!user) return;
    setEmailMsg({ type: '', text: '' });
    const next = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(next)) return setEmailMsg({ type: 'err', text: 'Enter a valid email address.' });
    if (next === (user.email || '').toLowerCase()) return setEmailMsg({ type: 'err', text: 'That is already your sign-in email.' });
    if (!emailPw) return setEmailMsg({ type: 'err', text: 'Enter your current password to confirm.' });
    setEmailBusy(true);
    try {
      await reauth(user, emailPw);
      await verifyBeforeUpdateEmail(user, next);
      setEmailMsg({
        type: 'ok',
        text: `We sent a verification link to ${next}. Your sign-in email changes after you open it. Until then, keep using ${user.email}.`,
      });
      setNewEmail('');
      setEmailPw('');
      toast('Verification email sent');
    } catch (err) {
      setEmailMsg({ type: 'err', text: authErrorMessage(err) });
    } finally {
      setEmailBusy(false);
    }
  }

  async function changePassword(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!user) return;
    setPwMsg({ type: '', text: '' });
    if (!curPw) return setPwMsg({ type: 'err', text: 'Enter your current password.' });
    if (newPw.length < 8) return setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' });
    if (newPw === curPw) return setPwMsg({ type: 'err', text: 'New password must be different from the current one.' });
    if (newPw !== confirmPw) return setPwMsg({ type: 'err', text: 'New passwords do not match.' });
    setPwBusy(true);
    try {
      await reauth(user, curPw);
      await updatePassword(user, newPw);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      setPwMsg({ type: 'ok', text: 'Password updated.' });
      toast('Password updated');
    } catch (err) {
      setPwMsg({ type: 'err', text: authErrorMessage(err) });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <div className="text-sm font-semibold text-white mb-1">Account</div>
        <div className="text-sm text-muted">
          Signed in as <span className="text-white">{user?.email}</span> · Role: <span className="text-white">Admin</span>
        </div>
      </div>

      <form onSubmit={changeEmail} className="card" noValidate>
        <div className="text-sm font-semibold text-white mb-3">Change sign-in email</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Field label="New email">
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Current password">
            <input type="password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} autoComplete="current-password" />
          </Field>
        </div>
        <Message msg={emailMsg} />
        <button type="submit" className="btn btn-primary" disabled={emailBusy}>
          {emailBusy ? 'Sending…' : 'Send verification link'}
        </button>
      </form>

      <form onSubmit={changePassword} className="card" noValidate>
        <div className="text-sm font-semibold text-white mb-3">Change password</div>
        <Field label="Current password">
          <input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          <Field label="New password" hint="At least 8 characters.">
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        <Message msg={pwMsg} />
        <button type="submit" className="btn btn-primary" disabled={pwBusy}>
          {pwBusy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

function Message({ msg }: { msg: StatusMsg }) {
  if (!msg.text) return null;
  return (
    <div className={`text-sm mb-3 ${msg.type === 'ok' ? 'text-green' : 'text-red'}`} role="status">
      {msg.text}
    </div>
  );
}
