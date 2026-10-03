import Sidebar from '@/components/Sidebar';
import DashboardShell from '@/components/DashboardShell';

export default function DashboardLayout({ children }) {
  return (
      <DashboardShell SidebarComponent={Sidebar}>{children}</DashboardShell>
  );
}
