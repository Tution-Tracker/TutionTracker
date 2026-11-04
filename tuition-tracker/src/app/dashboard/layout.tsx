import type { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardShell from '@/components/DashboardShell';

export default function DashboardLayout({ children }: { children: ReactNode })  {
  return (
      <DashboardShell SidebarComponent={Sidebar}>{children}</DashboardShell>
  );
}
