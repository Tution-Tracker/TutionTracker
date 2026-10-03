import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/context/Authentication';

export const metadata: Metadata = {
  title: 'Tuition Tracker',
  description: 'Manage classes, students, attendance, fees and exams.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css"
        />
      </head>

      <body>
        <AuthProvider>
              {children}
        </AuthProvider>
      </body>
    </html>
  );
}

