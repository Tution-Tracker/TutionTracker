import './globals.css';
import { AuthProvider } from '@/context/Authentication';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Tuition Tracker',
  description: 'Manage classes, students, attendance, fees and exams.',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css"
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}