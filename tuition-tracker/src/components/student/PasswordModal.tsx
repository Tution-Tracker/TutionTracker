'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Modal from '@/components/Modal';
import { savePassword } from '@/lib/studentApi';
import { useToast } from '@/context/ToastContext';

interface PasswordModalProps {
  open: boolean;
  onClose: () => void;
  hasPassword: boolean;
}

export default function PasswordModal({ open, onClose, hasPassword }: PasswordModalProps) {
  const { toast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setShow(false);
      setError('');
    }
  }, [open]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (next.length < 8) return setError('Use at least 8 characters.');
    if (next !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await savePassword({ newPassword: next, currentPassword: current });
      toast(hasPassword ? 'Password changed' : 'Password saved — use it next time you sign in');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your password.');
    } finally {
      setBusy(false);
    }
  }

  const type = show ? 'text' : 'password';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={hasPassword ? 'Change password' : 'Set a password'}
      icon="ti ti-key"
    >
      {!hasPassword && (
        <p className="text-sm text-muted mb-4 leading-snug">
          You signed in with your NIC. Choose a password from now on you&apos;ll sign in with your email and this
          password instead.
        </p>
      )}
      {error && (
        <div className="login-err" role="alert">
          <i className="ti ti-alert-circle" /> {error}
        </div>
      )}
      <form onSubmit={submit}>
        {hasPassword && (
          <div className="form-group mb-3">
            <label htmlFor="pw-current">Current password</label>
            <input
              id="pw-current"
              type={type}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        )}
        <div className="form-group mb-3">
          <label htmlFor="pw-new">New password</label>
          <input
            id="pw-new"
            type={type}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
          />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="pw-confirm">Confirm new password</label>
          <input
            id="pw-confirm"
            type={type}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted mb-4 cursor-pointer select-none">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="!w-auto" />
          Show passwords
        </label>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {hasPassword ? 'Cancel' : 'Later'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
