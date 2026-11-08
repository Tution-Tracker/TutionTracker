'use client';

import { nextAttStatus } from '@/lib/attendanceApi';

const initials = (n) =>
  (n || '')
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase() || '?';

function studentLabel(s) {
  if (s.nic) return s.nic;
  if (s.grade) return s.grade;
  return (s.id || '').slice(0, 6).toUpperCase();
}

/**
 * students: [{id, name, nic?, grade?}]
 * statusMap: { [studentId]: 'present' | undefined }
 * onCycle(studentId): called when a card is clicked
 * viewMode: 'grid' | 'list'
 *
 * Unmarked defaults to Absent — tap who showed up; everyone else is absent.
 */
export default function AttendanceGrid({ students, statusMap, onCycle, viewMode = 'grid', disabled = false }) {
  if (!students.length) {
    return null;
  }

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col gap-2">
        {students.map((s) => {
          const status = statusMap[s.id];
          const isPresent = status === 'present';
          const isLate = status === 'late';
          return (
            <div
              key={s.id}
              onClick={() => !disabled && onCycle(s.id)}
              className={`student-card flex items-center gap-4 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                disabled ? 'opacity-60 cursor-not-allowed' : ''
              } ${
                isPresent
                  ? 'bg-green/10 border-green'
                  : isLate
                  ? 'bg-amber/10 border-amber'
                  : 'bg-card border-border hover:bg-card2'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  isPresent
                    ? 'bg-green/15 text-green'
                    : isLate
                    ? 'bg-amber/15 text-amber'
                    : 'bg-card2 text-muted'
                }`}
              >
                {initials(s.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">{s.name}</div>
                <div className="text-xs text-muted">{studentLabel(s)}</div>
              </div>
              <div
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isPresent
                    ? 'bg-green/15 text-green'
                    : isLate
                    ? 'bg-amber/15 text-amber'
                    : 'bg-red/10 text-red'
                }`}
              >
                {isPresent ? 'Present' : isLate ? 'Late' : 'Absent'}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {students.map((s) => {
        const status = statusMap[s.id];
        const isPresent = status === 'present';
        const isLate = status === 'late';
        return (
          <div
            key={s.id}
            onClick={() => !disabled && onCycle(s.id)}
            className={`student-card p-3 sm:p-4 rounded-xl border-2 cursor-pointer select-none text-center transition-all ${
              disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'
            } ${
              isPresent
                ? 'bg-green/10 border-green'
                : isLate
                ? 'bg-amber/10 border-amber'
                : 'bg-card border-border hover:border-border'
            }`}
          >
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center font-bold text-sm ${
                isPresent
                  ? 'bg-green/15 text-green'
                  : isLate
                  ? 'bg-amber/15 text-amber'
                  : 'bg-card2 text-muted'
              }`}
            >
              {initials(s.name)}
            </div>
            <div className="font-medium text-sm text-foreground truncate">{s.name}</div>
            <div className="text-xs text-muted mt-0.5">{studentLabel(s)}</div>
            <div
              className={`mt-2 text-xs font-semibold ${
                isPresent ? 'text-green' : isLate ? 'text-amber' : 'text-red'
              }`}
            >
              {isPresent ? '✓ Present' : isLate ? '⏰ Late' : '✗ Absent'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function nextStatus(current) {
  return nextAttStatus(current);
}
