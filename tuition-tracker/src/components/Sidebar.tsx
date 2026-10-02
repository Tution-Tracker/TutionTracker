'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/Authentication';
import { useRouter } from 'next/navigation';


const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [{ href: '/dashboard', icon: '📊', name: 'Dashboard' }],
  },
  {
    label: 'Manage',
    items: [
      { href: '/dashboard/classes', icon: '📚', name: 'Classes' },
      { href: '/dashboard/calendar', icon: '🗓', name: 'Calendar' },
      { href: '/dashboard/students', icon: '👥', name: 'Students' },
      { href: '/dashboard/attendance', icon: '✅', name: 'Attendance' },
      { href: '/dashboard/exams', icon: '📝', name: 'Exams' },
    ],
  },
  {
    label: 'Finance',
    items: [{ href: '/dashboard/fees', icon: '💳', name: 'Fees' }],
  },
];

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);


  // Close mobile sidebar when route changes
  useEffect(() => {
    if (open && onClose) onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <div
        className={`
          w-[230px] h-[100dvh] overflow-y-auto
          bg-nav border-r border-navBorder flex flex-col
          fixed left-0 top-0 z-50
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:sticky md:top-0 md:translate-x-0 md:shrink-0
        `}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-navBorder flex items-center justify-between font-bold text-foreground text-[15px]">
          <div className="flex items-center gap-2">
            <span className="text-accent2 text-xl">🏫</span>
            TuitionTracker
          </div>

          <button
            onClick={onClose}
            className="md:hidden text-muted hover:text-foreground text-xl p-1 -mr-1"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex-1">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="text-[13px] uppercase tracking-wide text-muted px-3 pt-2.5 pb-1 mt-1">
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] mb-0.5 transition-all ${
                      active
                        ? 'bg-accent/[0.12] text-accent2 font-semibold'
                        : 'text-muted hover:bg-card2 hover:text-foreground'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="text-[13px] uppercase tracking-wide text-muted px-3 pt-2.5 pb-1 mt-1">
            Other
          </div>
          <button
            onClick={() => setNotifOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] mb-0.5 transition-all text-muted hover:bg-card2 hover:text-foreground"
          >
            <span>🔔</span>
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto bg-red text-white text-[13px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>

        {/* User footer */}
        <div className="px-3.5 py-3 border-t border-navBorder flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/[0.15] text-accent2 flex items-center justify-center font-bold text-[13px]">
            {(user?.email || 'T')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground truncate">
              {user?.email || 'Tutor'}
            </div>
            <div className="text-[13px] text-muted">Tutor</div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="ml-auto text-muted hover:text-red text-lg"
          >
            ⎋
          </button>
        </div>

      </div>
    </>
  );
}
