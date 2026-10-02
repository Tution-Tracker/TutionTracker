'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/Authentication';

export default function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  async function doLogin(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError('Invalid username or password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="login-screen" className="login-screen">
      {/* Left image — desktop only */}
      <div className="login-hero" aria-hidden="true">
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          className="login-hero-img"
          sizes="(min-width: 1024px) 50vw, 0px"
        />
        <div className="login-hero-overlay" />
      </div>

      {/* Form column — full width on mobile/tablet, right half on desktop */}
      <div className="login-form-col">
        <div className="login-box">
          <div className="login-logo">
            <i className="ti ti-school" />
          </div>
          <div className="login-title">Tuition Tracker</div>
          <div className="login-sub">Sign in to manage your classes</div>

          {error && (
            <div className="login-err">
              <i className="ti ti-alert-circle" /> {error}
            </div>
          )}

          <form onSubmit={doLogin}>
            <div className="form-group">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="yasiru or 123@gmail.com"
                type="text"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            >
              <i className="ti ti-login" /> {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="login-switch ">
            Are you a student? <Link href="/student-login">Student login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}