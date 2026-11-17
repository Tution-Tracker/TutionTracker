'use client';

import { useEffect, useMemo, useState } from 'react';
import { subscribeClasses, subscribeAllSchedules } from '@/lib/classesApi';
import { subscribeStudents } from '@/lib/studentsApi';
import { MONTHS, todayStr, getDayScheduleDetails } from '@/lib/dateUtils';
import GlobalDateActionsModal from '@/components/GlobalDateActionsModal';

const STATUS_CHIP = {
  scheduled: 'bg-accent/15 text-accent2',
  cancelled: 'bg-red/15 text-red line-through',
  extra: 'bg-amber/15 text-amber',
};

export default function CalendarPage() {
  const now = new Date();
  const [classes, setClasses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Record<string, any>>({});
  const [students, setStudents] = useState<any[]>([]);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeClasses(setClasses);
    const u2 = subscribeAllSchedules(setSchedules);
    const u3 = subscribeStudents(setStudents);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const studentsByClassId = useMemo(() => {
    const map: Record<string, any[]> = {};
    classes.forEach((c) => {
      map[c.id] = students.filter((s) => s.classIds?.includes(c.id));
    });
    return map;
  }, [classes, students]);

  const activeClasses = useMemo(() => classes.filter((c) => !c.archived), [classes]);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ d, ds });
  }

  const selectedEntries = selectedDate ? getDayScheduleDetails(activeClasses, schedules, selectedDate) : [];
  const selectedAddable = selectedDate
    ? activeClasses.filter((c) => !selectedEntries.some((e) => e.cls.id === c.id))
    : [];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Calendar</h1>
        <div className="text-sm text-muted mt-1">
          Every class's schedule in one place — click a day to cancel a session or add an extra one.
        </div>
      </div>

      <div className="card">
        <div className="flex items-center mb-3.5">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              if (calMonth === 0) {
                setCalYear((y) => y - 1);
                setCalMonth(11);
              } else {
                setCalMonth((m) => m - 1);
              }
            }}
          >
          <img src="/general/left.png" alt="arrow-right" className="h-4 w-4 object-contain" />
          </button>
          <button
            className="btn btn-outline btn-sm"  style={{marginLeft: '10px',}}
            onClick={() => {
              if (calMonth === 11) {
                setCalYear((y) => y + 1);
                setCalMonth(0);
              } else {
                setCalMonth((m) => m + 1);
              }
            }}
          >
          <img src="/general/right.png" alt="arrow-right" className="h-4 w-4 object-contain" />
          </button>
          <span className="text-sm font-semibold text-foreground px-4">
            {MONTHS[calMonth]} {calYear}
          </span>
        </div>

        <div className="flex gap-3 mb-3 text-[13px] text-muted flex-wrap">
          <span><span className="inline-block w-2.5 h-2.5 rounded bg-accent/25 mr-1" />Scheduled</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded bg-red/15 mr-1" />Cancelled</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded bg-amber/20 mr-1" />Extra</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-[13px] text-center font-bold py-1">
              {d}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`empty-${i}`} />;
            const { d, ds } = cell;
            const isToday = ds === todayStr();
            const entries = getDayScheduleDetails(activeClasses, schedules, ds);
            const visible = entries.slice(0, 3);
            const overflow = entries.length - visible.length;
            return (
              <div
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`min-h-[86px] rounded-lg p-1.5 cursor-pointer border bg-card2 hover:border-accent2 transition-colors ${
                  isToday ? 'border-accent2' : 'border-border'
                }`}
              >
                <div className={`text-xs font-bold mb-1 ${isToday ? 'text-accent2' : 'text-muted'}`}>{d}</div>
                <div className="flex flex-col gap-0.5">
                  {visible.map(({ cls, status }) => (
                    <div
                      key={cls.id}
                      className={`rounded px-1 py-0.5 text-[13px] font-medium truncate ${STATUS_CHIP[status]}`}
                      title={String(cls.name)}
                    >
                      {String(cls.name).split('–')[0].trim()}
                    </div>
                  ))}
                  {overflow > 0 && <div className="text-[13px] text-muted px-1">+{overflow} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <GlobalDateActionsModal
          open={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          dateStr={selectedDate}
          dayEntries={selectedEntries as any[]}
          addableClasses={selectedAddable}
          studentsByClassId={studentsByClassId}
          schedules={schedules}
        />
      )}
    </div>
  );
}