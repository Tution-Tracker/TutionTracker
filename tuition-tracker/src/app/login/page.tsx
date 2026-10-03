'use client';

import React, { JSX, useState } from 'react';
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

      <div className="login-form-col">
        <div className="login-box">
          <div className="login-logo" style={{display: 'flex',justifyContent: 'center',alignItems: 'center',    marginBottom: '12px',}}>

            <img src="/icons/student.png" alt="logo" style={{ height: '60px',width: '60px',objectFit: 'contain',display: 'block',}}/>
          </div>
          <div className="login-title">Tuition Tracker</div>
          <div className="login-sub">Sign in to manage your classes</div>

          {error && (
            <div className="login-err">
              <i className="ti ti-alert-square-rounded"></i>{error}
            </div>
          )}

          <form onSubmit={doLogin}>
            <div className="formGroup">
              <label htmlFor="username">Email</label>
              <input
                id="username"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="123@gmail.com"
                type="text"
                required
              />
            </div>
            <div className="formGroup">
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
              className="signinbtn"
              style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
            >
               {busy ? 'Signing in…' : 'Sign in'}
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