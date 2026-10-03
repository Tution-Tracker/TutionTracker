'use client';

import { useState, ComponentType, ReactNode } from 'react';
import Header from '@/components/Header';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface DashboardShellProps {
  SidebarComponent: ComponentType<SidebarProps>;
  headerLabel?: string;
  children: ReactNode;
}

export default function DashboardShell({
  SidebarComponent,
  headerLabel,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex min-h-screen">
      <SidebarComponent open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} label={headerLabel} />
        <main className="light-surface flex-1 p-4 md:p-7 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}