'use client';

export default function Header({
  onMenuClick,
  label = 'TuitionTracker',
}: {
  onMenuClick: () => void;
  label?: string;
}) {
  return (
    <header className="md:hidden sticky top-0 z-30 h-14 shrink-0 bg-nav border-b border-navBorder flex items-center gap-3 px-4">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="text-foreground text-xl leading-none p-1 -ml-1"
      >
        ☰
      </button>

      <div className="flex items-center gap-2 font-bold text-foreground text-xl">
        <img
          src="/icons/student.png"
          alt="logo"
          className="h-5 w-5 object-contain"
        />
        <span>{label}</span>
      </div>
    </header>
  );
}
