'use client';
import { useEffect, useMemo, useState } from 'react';
import { subscribeClasses, subscribeAllSchedules, addExtraClassDate } from '@/lib/classesApi';
import { subscribeStudents } from '@/lib/studentsApi';
import {
  subscribeAllAttendance,
  saveAttendanceSession,
  sessionsForClass,
} from '@/lib/attendanceApi';
import { todayStr, isClassScheduledOn } from '@/lib/dateUtils';
import AttendanceGrid, { nextStatus } from '@/components/AttendanceGrid';
import { useToast } from '@/context/ToastContext';
export default function AttendancePage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [schedules, setSchedules] = useState({});
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [local, setLocal] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  // UI state matching the improved design
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | present | absent
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  useEffect(() => {
    const u1 = subscribeClasses((cs) => {
      setClasses(cs);
      setClassId((prev) => prev || (cs[0]?.id ?? ''));
    });
    const u2 = subscribeStudents(setStudents);
    const u3 = subscribeAllAttendance(setAttendanceMap);
    const u4 = subscribeAllSchedules(setSchedules);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);
  const cls = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);
  const enrolled = useMemo(
    () => students.filter((s) => s.classIds?.includes(classId)),
    [students, classId]
  );
  const key = `${classId}__${date}`;
  const saved = attendanceMap[key] || {};
  const isScheduledToday = isClassScheduledOn(cls, schedules, date);
  const canMark = !!classId && !cls?.archived && isScheduledToday;
  // Load the saved session into local editable state whenever class/date/saved data changes,
  // unless the user already has unsaved local edits for this exact session.
  useEffect(() => {
    setLocal(saved);
    setDirty(false);

  }, [classId, date, JSON.stringify(saved)]);
  function handleCycle(studentId) {
    if (!canMark) return;
    setLocal((prev) => ({ ...prev, [studentId]: nextStatus(prev[studentId]) }));
    setDirty(true);
  }
  function handleMarkAll(status) {
    if (!canMark) return;
    const next = {};
    enrolled.forEach((s) => {
      next[s.id] = status === 'present' ? 'present' : '';
    });
    setLocal(next);
    setDirty(true);
    toast(status === 'present' ? 'All marked present' : 'All marked absent');
  }
  async function handleSave() {
    if (!canMark || !dirty) return;
    setSaving(true);
    try {
      await saveAttendanceSession(classId, date, local, cls?.name);
      toast('Attendance saved successfully');
      setDirty(false);
    } catch (e) {
      toast('Could not save attendance', 'red');
    } finally {
      setSaving(false);
    }
  }
  async function handleAddToCalendar() {
    try {
      await addExtraClassDate(classId, date, cls?.name, enrolled);
      toast('Added to calendar — you can mark attendance now');
    } catch (e) {
      toast('Could not update the calendar', 'red');
    }
  }
  const presentCount = Object.values(local).filter((v) => v === 'present').length;
  const absentCount = Math.max(0, enrolled.length - presentCount);
  const percentage = enrolled.length ? Math.round((presentCount / enrolled.length) * 100) : 0;
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrolled.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const nic = (s.nic || '').toLowerCase();
      const id = (s.id || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || nic.includes(q) || id.includes(q);
      const status = local[s.id] === 'present' ? 'present' : 'absent';
      const matchesFilter = filter === 'all' || status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [enrolled, searchQuery, filter, local]);
  const pastSessions = classId ? sessionsForClass(attendanceMap, classId) : [];
  const filterBtn = (value, label) => {
    const active = filter === value;
    return (
      <button
        type="button"
        onClick={() => setFilter(value)}
        className={`px-3 py-2 text-sm rounded-lg border font-medium transition ${
          active
            ? 'border-accent2 bg-accent2/10 text-accent2'
            : 'border-border hover:bg-card2 text-foreground'
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Attendance</h1>
        <p className="text-sm text-muted mt-0.5">
          Tap students who were present — everyone else is marked absent
        </p>
      </div>
      {!classId ? (
        <div className="card text-center text-muted py-9">Select a class to mark attendance.</div>
      ) : (
        <>
          {/* Stats + Controls Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 mb-6">
            {/* Class + Date + Search + Filters + View toggle */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-3">
                <select
                  className="min-w-0 flex-1 px-2 sm:px-3 py-2 bg-card border border-border rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:border-accent2"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">Select class…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-w-0 flex-1 px-2 sm:px-3 py-2 bg-card border border-border rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:border-accent2"
                />
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by name or ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:border-accent2"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <div className="flex gap-2 flex-wrap items-center justify-center sm:justify-start">
                {filterBtn('all', 'All')}
                {filterBtn('present', 'Present')}
                {filterBtn('absent', 'Absent')}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    title="Grid view"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 transition ${
                      viewMode === 'grid' ? 'bg-accent2/10 text-accent2' : 'hover:bg-card2 text-muted'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="List view"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 transition ${
                      viewMode === 'list' ? 'bg-accent2/10 text-accent2' : 'hover:bg-card2 text-muted'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Live stats + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-2 bg-green/10 text-green px-3 py-1.5 rounded-full text-sm font-medium">
                  <span>{presentCount}</span> Present
                </div>
                <div className="flex items-center gap-2 bg-red/10 text-red px-3 py-1.5 rounded-full text-sm font-medium">
                  <span>{absentCount}</span> Absent
                </div>
                <div className="flex items-center gap-2 bg-card2 text-muted px-3 py-1.5 rounded-full text-sm font-medium">
                  <span>{percentage}%</span> Attendance
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canMark && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMarkAll('present')}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-card2 transition"
                    >
                      ✓✓ All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAll('absent')}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-card2 transition"
                    >
                      ✗ All Absent
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!dirty || saving}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Archived / not scheduled banners */}
          {cls?.archived ? (
            <div className="bg-amber/10 border border-amber/25 rounded-lg px-4 py-3 mb-4 text-sm text-amber">
              📦 This class is archived — attendance marking is frozen.
            </div>
          ) : (
            !isScheduledToday && (
              <div className="bg-amber/10 border border-amber/25 rounded-lg px-4 py-3 mb-4 text-sm text-amber flex items-center justify-between flex-wrap gap-2">
                <span>📅 No class is scheduled on {date} — add it to the calendar first to mark attendance.</span>
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber/15 text-amber border border-amber/25 hover:bg-amber/25 transition"
                >
                  + Add to calendar
                </button>
              </div>
            )
          )}
          {/* Students grid / list */}
          {filteredStudents.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-muted text-5xl mb-3">👥</div>
              <p className="text-muted font-medium">No students found</p>
              <p className="text-sm text-muted mt-1">
                {enrolled.length === 0
                  ? 'No students enrolled in this class'
                  : 'Try changing the search or filter'}
              </p>
            </div>
          ) : (
            <AttendanceGrid
              students={filteredStudents}
              statusMap={local}
              onCycle={handleCycle}
              viewMode={viewMode}
              disabled={!canMark}
            />
          )}
          {/* Past sessions */}
          <div className="mt-8 bg-card rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Past sessions</h2>
            </div>
            {pastSessions.length === 0 ? (
              <div className="text-sm text-muted">None yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {pastSessions.map((s) => (
                  <button
                    key={s.date}
                    type="button"
                    onClick={() => setDate(s.date)}
                    className={`px-3 py-1.5 rounded-full text-sm transition ${
                      s.date === date
                        ? 'bg-accent2/15 text-accent2 border border-accent2/30'
                        : 'bg-card2 text-muted hover:bg-border/50'
                    }`}
                  >
                    {s.date}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}