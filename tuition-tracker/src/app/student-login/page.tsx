'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStudentAuth } from '@/context/studentAuthentication';

export default function StudentLogin() {
  const router = useRouter();
  const { login } = useStudentAuth();

  const [email, setEmail] = useState('');
  const [nic, setNic] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function doStudentLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError('');
    setBusy(true);

    try {
      const res = await fetch('/api/student-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          nic,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid email or NIC.');
        return;
      }

      await login(data.customToken);

      router.replace('/student');
    } catch (err) {
      setError(
        'Something went wrong check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="student-login-screen" className="login-screen">

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

          {/* Logo */}
          <div
            className="login-logo"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <img
              src="/icons/student.png"
              alt="logo"
              style={{
                height: '60px',
                width: '60px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          <div className="login-title">
            Tuition Tracker
          </div>

          <div className="login-sub">
            Sign in to see your performance.
          </div>

          {error && (
            <div className="login-err" role="alert">
              <i className="ti ti-alert-square-rounded"></i>
              {error}
            </div>
          )}

          <form onSubmit={doStudentLogin}>

            <div className="formGroup">
              <label htmlFor="student-email">
                Email
              </label>

              <input
                id="student-email"
                name="email"
                placeholder="student@email.com"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="formGroup">
              <label htmlFor="student-nic">
                NIC
              </label>

              <div className="relative">
                <input
                  id="student-nic"
                  name="nic"
                  placeholder="200012345678 / 951234567V"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  className="!pr-10"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={
                    show ? 'Hide NIC' : 'Show NIC'
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1"
                >
                  <i
                    className={`ti ${
                      show
                        ? 'ti-eye-off'
                        : 'ti-eye'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="signinbtn"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '11px',
              }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="login-switch">
            Tutor / Admin?{' '}
            <Link href="/login">
              Admin login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
