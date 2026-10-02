'use client';

export default function Header({ onMenuClick, label = 'TuitionTracker' }) {
  return (
    <header className="md:hidden sticky top-0 z-30 h-14 shrink-0 bg-nav border-b border-navBorder flex items-center gap-3 px-4">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="text-foreground text-xl leading-none p-1 -ml-1"
      >
        ☰
      </button>
      <span className="font-bold text-foreground text-[15px]">
        <span className="text-accent2">🏫</span> {label}
      </span>
    </header>
  );
}
