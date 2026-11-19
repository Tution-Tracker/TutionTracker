'use client';

import type { ReactNode } from 'react';

interface FieldProps {
  label: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
}

export default function Field({ label, error, hint, children }: FieldProps) {
  return (
    <div className="form-group mb-3.5">
      <label>{label}</label>
      {children}
      {error ? (
        <div className="text-[13px] text-red mt-1">{error}</div>
      ) : hint ? (
        <div className="text-[13px] text-muted mt-1">{hint}</div>
      ) : null}
    </div>
  );
}
