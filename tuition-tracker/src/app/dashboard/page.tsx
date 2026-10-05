'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Loading(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    // Optional navigation/redirect logic can go here
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-muted text-sm">
      Loading…
    </div>
  );
}