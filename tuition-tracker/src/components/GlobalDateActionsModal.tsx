'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import {
  cancelClassDate,
  uncancelClassDate,
  addExtraClassDate,
  removeExtraClassDate,
  setSessionTime,
  getSessionTime,
  type ClassSchedule,
} from '@/lib/classesApi';
import { useToast } from '@/context/ToastContext';

type SessionStatus = 'scheduled' | 'cancelled' | 'extra';

interface StatusLabel {
  text: string;
  color: string;
}

interface TuitionClass {
  id: string;
  name: string;
  time?: string;
  [key: string]: unknown;
}

interface Student {
  id: string;
  classIds?: string[];
  [key: string]: unknown;
}

interface DayEntry {
  cls: TuitionClass;
  status: SessionStatus;
}

interface GlobalDateActionsModalProps {
  open: boolean;
  onClose: () => void;
  dateStr: string;
  dayEntries: DayEntry[];
  addableClasses: TuitionClass[];
  studentsByClassId: Record<string, Student[]>;
  schedules?: Record<string, ClassSchedule>;
}

const STATUS_LABEL: Record<SessionStatus, StatusLabel> = {
  scheduled: { text: 'Scheduled', color: 'bg-accent/15 text-accent2' },
  cancelled: { text: 'Cancelled', color: 'bg-red/15 text-red' },
  extra: { text: 'Extra', color: 'bg-amber/15 text-amber' },
};


export default function GlobalDateActionsModal({
  open,
  onClose,
  dateStr,
  dayEntries,
  addableClasses,
  studentsByClassId,
  schedules = {},
}: GlobalDateActionsModalProps) {
  const { toast } = useToast();
  const [addClassId, setAddClassId] = useState<string>('');
  const [addTime, setAddTime] = useState<string>('09:00');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editTimeId, setEditTimeId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

  async function run(id: string, fn: () => Promise<unknown> | unknown, successMsg: string): Promise<void> {
    setBusyId(id);
    try {
      await fn();
      toast(successMsg);
    } catch (e) {
      toast('Could not update the schedule', 'red');
    } finally {
      setBusyId(null);
    }
  }

  function handleCancel(cls: TuitionClass): void {
    run(
      cls.id,
      () => cancelClassDate(cls.id, dateStr, cls.name, studentsByClassId[cls.id] || []),
      `${cls.name} cancelled for ${dateStr}`
    );
  }
  function handleRestore(cls: TuitionClass): void {
    run(
      cls.id,
      () => uncancelClassDate(cls.id, dateStr, cls.name, studentsByClassId[cls.id] || []),
      `${cls.name} restored for ${dateStr}`
    );
  }
  function handleRemoveExtra(cls: TuitionClass): void {
    run(
      cls.id,
      () => removeExtraClassDate(cls.id, dateStr, cls.name, studentsByClassId[cls.id] || []),
      `Extra session removed`
    );
  }
  async function handleAddExtra(): Promise<void> {
    if (!addClassId) return;
    const cls = addableClasses.find((c) => c.id === addClassId);
    if (!cls) return;
    const time = addTime || cls.time;
    await run(
      cls.id,
      () => addExtraClassDate(cls.id, dateStr, cls.name, studentsByClassId[cls.id] || [], time),
      `${cls.name} added for ${dateStr}${time ? ` at ${time}` : ''}`
    );
    setAddClassId('');
    setAddTime('09:00');
  }

  function startEditTime(cls: TuitionClass): void {
    const t = getSessionTime({ ...cls, time: cls.time || '09:00' }, schedules[cls.id], dateStr) || cls.time || '09:00';
    setEditTimeId(cls.id);
    setEditTimeValue(t);
  }

  async function saveEditTime(cls: TuitionClass): Promise<void> {
    await run(
      cls.id,
      () =>
        setSessionTime(
          cls.id,
          dateStr,
          editTimeValue,
          cls.name,
          studentsByClassId[cls.id] || []
        ),
      `Time updated to ${editTimeValue}`
    );
    setEditTimeId(null);
  }

  function onSelectAddClass(id: string): void {
    setAddClassId(id);
    const cls = addableClasses.find((c) => c.id === id);
    setAddTime(cls?.time || '09:00');
  }

  // Time can be changed for scheduled and extra sessions (not cancelled)
  function canEditTime(status: SessionStatus): boolean {
    return status === 'scheduled' || status === 'extra';
  }

  return (
    <Modal open={open} onClose={onClose} title={dateStr} icon="📅">
      <div className="text-xs text-muted mb-3">
        Every class touching this date — cancel a scheduled one, restore a cancelled one, change
        the time, or add an extra session below. Students are notified automatically.
      </div>

      {dayEntries.length === 0 ? (
        <div className="text-sm text-muted text-center py-4">No classes scheduled this day.</div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-4">
          {dayEntries.map(({ cls, status }) => {
            const sessionTime = getSessionTime(
              { ...cls, time: cls.time || '09:00' },
              schedules[cls.id],
              dateStr
            );
            const customSessionTime = schedules[cls.id]?.extraTimes?.[dateStr];
            const isCustomTime = customSessionTime !== undefined && customSessionTime !== cls.time;
            return (
              <div
                key={cls.id}
                className="flex flex-col gap-2 bg-card border border-border rounded-lg px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{cls.name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[13px] ${STATUS_LABEL[status].color}`}
                      >
                        {STATUS_LABEL[status].text}
                      </span>
                      {sessionTime && (
                        <span className="text-xs text-muted">
                          🕐 {sessionTime}
                          {isCustomTime ? ' (custom)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-1 flex-wrap justify-end">
                    {canEditTime(status) && (
                      <button
                        type="button"
                        className="btn btn-outline text-xs px-2 py-1"
                        disabled={busyId === cls.id}
                        onClick={() => startEditTime(cls)}
                      >
                        Time
                      </button>
                    )}
                    {status === 'scheduled' && (
                      <button
                        type="button"
                        className="btn btn-danger text-xs px-2 py-1"
                        disabled={busyId === cls.id}
                        onClick={() => handleCancel(cls)}
                      >
                        Cancel
                      </button>
                    )}
                    {status === 'cancelled' && (
                      <button
                        type="button"
                        className="btn btn-success text-xs px-2 py-1"
                        disabled={busyId === cls.id}
                        onClick={() => handleRestore(cls)}
                      >
                        Restore
                      </button>
                    )}
                    {status === 'extra' && (
                      <button
                        type="button"
                        className="btn btn-danger text-xs px-2 py-1"
                        disabled={busyId === cls.id}
                        onClick={() => handleRemoveExtra(cls)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {canEditTime(status) && editTimeId === cls.id && (
                  <div className="flex gap-1.5 items-center pt-1 border-t border-border">
                    <input
                      type="time"
                      value={editTimeValue}
                      onChange={(e) => setEditTimeValue(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-card2 border border-border rounded-lg text-sm text-foreground"
                    />
                    <button
                      type="button"
                      className="btn btn-primary text-xs px-2 py-1"
                      disabled={busyId === cls.id}
                      onClick={() => saveEditTime(cls)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline text-xs px-2 py-1"
                      onClick={() => setEditTimeId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addableClasses.length > 0 && (
        <div className="border-t border-border pt-3.5">
          <div className="text-xs text-muted mb-2">Add an extra class on this date</div>
          <div className="flex flex-col sm:flex-row gap-1.5">
            <select
              className="flex-1 px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-foreground"
              value={addClassId}
              onChange={(e) => onSelectAddClass(e.target.value)}
            >
              <option value="">Select a class…</option>
              {addableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={addTime}
              onChange={(e) => setAddTime(e.target.value)}
              className="px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-foreground w-full sm:w-auto"
              title="Session time"
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAddExtra}
              disabled={!addClassId}
            >
              + Add
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}