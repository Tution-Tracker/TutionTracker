// Local-timezone-safe date helpers. Mirrors the logic from the original
// prototype: using `.toISOString()` shifts dates backward in timezones
// ahead of UTC (e.g. Sri Lanka, UTC+5:30), so we always build/parse
// YYYY-MM-DD strings from local Date fields directly.

export const DAYS_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type DayName = (typeof DAYS_FULL)[number];
export type MonthAbbrev = (typeof MONTHS)[number];

/** Minimal class shape used by schedule helpers. */
export type ScheduleClass = {
  id: string;
  day: string;
  archived?: boolean;
  [key: string]: unknown;
};

/** Per-class schedule: cancelled + extra date strings (YYYY-MM-DD). */
export type ClassScheduleSlice = {
  cancelled: string[];
  extra: string[];
  extraTimes?: Record<string, string>;
};

export type ScheduleMap = Record<string, ClassScheduleSlice>;

export type DayScheduleStatus = 'scheduled' | 'cancelled' | 'extra';

export type DayScheduleEntry = {
  cls: ScheduleClass;
  status: DayScheduleStatus;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const localISO = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const localMonthStr = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

export const todayStr = (): string => localISO(new Date());

export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const fmtMonth = (m: string | null | undefined): string => {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return `${MONTHS[parseInt(mo, 10) - 1]} ${y}`;
};

export const fmtShortDate = (ds: string | null | undefined): string => {
  if (!ds) return '';
  const d = parseLocalDate(ds);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

// All YYYY-MM-DD dates in `year`/`month` (0-indexed) that fall on the
// class's weekly day.
export function getClassDefaultDates(
  classDay: string,
  year: number,
  month: number
): string[] {
  const res: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayIdx = DAYS_FULL.indexOf(classDay as DayName);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    if (dt.getDay() === dayIdx) res.push(localISO(dt));
  }
  return res;
}

// Given all classes + a map of classId -> {cancelled:[], extra:[]}, return
// the classes that actually run on `dateStr`. Archived classes are always
// excluded — filtering here (rather than at each call site) means the
// dashboard's "today"/week views AND the Phase 7 class-tomorrow reminders
// all stop counting an archived class in one place.
export function getAllClassesOnDate(
  classes: ScheduleClass[],
  scheduleMap: ScheduleMap,
  dateStr: string
): ScheduleClass[] {
  const d = parseLocalDate(dateStr);
  return classes.filter((c) => {
    if (c.archived) return false;
    const sched = scheduleMap[c.id] || { cancelled: [], extra: [] };
    const isDefaultDay = d.getDay() === DAYS_FULL.indexOf(c.day as DayName);
    const isCancelled = sched.cancelled.includes(dateStr);
    const isExtra = sched.extra.includes(dateStr);
    return (isDefaultDay && !isCancelled) || isExtra;
  });
}

/**
 * Whether a specific class actually runs on `dateStr` — its weekly day
 * with no cancellation, or an added extra session. Used to gate
 * attendance marking: a class not on the calendar for that date can't
 * have attendance taken for it, since there's no session to attest to.
 */
export function isClassScheduledOn(
  cls: ScheduleClass | null | undefined,
  scheduleMap: ScheduleMap,
  dateStr: string
): boolean {
  if (!cls || cls.archived) return false;
  const d = parseLocalDate(dateStr);
  const sched = scheduleMap[cls.id] || { cancelled: [], extra: [] };
  const isDefaultDay = d.getDay() === DAYS_FULL.indexOf(cls.day as DayName);
  const isCancelled = sched.cancelled.includes(dateStr);
  const isExtra = sched.extra.includes(dateStr);
  return (isDefaultDay && !isCancelled) || isExtra;
}

/**
 * Every class touching `dateStr` in any way — including ones cancelled
 * that day, which getAllClassesOnDate deliberately excludes since it
 * answers "what actually runs today". The global calendar needs the
 * fuller picture (a cancelled class should still show, so the tutor can
 * restore it), so each entry carries its own status:
 *   'scheduled' — weekly recurring day, not cancelled
 *   'cancelled' — weekly recurring day, cancelled for this date
 *   'extra'     — not a recurring day, added as an extra session
 * Archived classes are excluded entirely, same as elsewhere.
 */
export function getDayScheduleDetails(
  classes: ScheduleClass[],
  scheduleMap: ScheduleMap,
  dateStr: string
): DayScheduleEntry[] {
  const d = parseLocalDate(dateStr);
  const out: DayScheduleEntry[] = [];
  classes.forEach((c) => {
    if (c.archived) return;
    const sched = scheduleMap[c.id] || { cancelled: [], extra: [] };
    const isDefaultDay = d.getDay() === DAYS_FULL.indexOf(c.day as DayName);
    const isCancelled = sched.cancelled.includes(dateStr);
    const isExtra = sched.extra.includes(dateStr);
    if (isDefaultDay && isCancelled) out.push({ cls: c, status: 'cancelled' });
    else if (isDefaultDay) out.push({ cls: c, status: 'scheduled' });
    else if (isExtra) out.push({ cls: c, status: 'extra' });
  });
  return out;
}