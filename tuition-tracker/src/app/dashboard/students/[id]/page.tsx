'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StudentFormModal from '@/components/StudentFormModal';
import { subscribeStudents } from '@/lib/studentsApi';
import { subscribeClasses, type ClassDoc } from '@/lib/classesApi';
import { parseLocalDate, fmtMonth } from '@/lib/dateUtils';
import {
  subscribeAllAttendance,
  studentAttRate,
  attRateFor,
  attColor,
  sessionsForClass,
} from '@/lib/attendanceApi';
import { subscribeFees, feeStatus, feeStatusColor } from '@/lib/feesApi';
import { subscribeExams, EXAM_TYPES } from '@/lib/examsApi';
import FeeBadge from '@/components/FeeBadge';
import PaymentModal from '@/components/PaymentModal';
import type { Student } from '@/types/student';

function initials(name: string): string {
  return (
    name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '—';
  return parseLocalDate(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-sm">{value || '—'}</div>
    </div>
  );
}

// { "classId__2026-03-05": { studentId: 'present' } }
type AttendanceMap = Record<string, Record<string, string>>;

type FeeRecord = {
  id: string;
  studentId: string;
  classId: string;
  month: string;
  amount: number;
  paid: number;
};

type ExamRecord = {
  id: string;
  name: string;
  classId: string;
  date: string;
  type?: string;
  maxMarks: number;
  marks?: Record<string, number | string | null>;
};

type ExamResult = {
  exam: ExamRecord;
  mark: number | null;
  percent: number | null;
};

type AttendanceStatus = 'present' | 'late' | 'absent';

type AttendanceRow = {
  key: string;
  date: string;
  className: string;
  status: AttendanceStatus;
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '✓ Present',
  late: '⏰ Late',
  absent: '✗ Absent',
};

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  present: '#22c55e',
  late: '#f59e0b',
  absent: '#ef4444',
};

const HISTORY_PREVIEW = 10;

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [payFee, setPayFee] = useState<FeeRecord | null>(null);
  const [showAllAttendance, setShowAllAttendance] = useState(false);

  useEffect(() => {
    const u1 = subscribeStudents(
      (list) => {
        setStudents(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = subscribeClasses(setClasses);
    const u3 = subscribeAllAttendance(setAttendance);
    const u4 = subscribeFees(setFees);
    const u5 = subscribeExams(setExams);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  const student = students.find((s) => s.id === id);

  const studentClasses = useMemo(
    () => classes.filter((c) => student?.classIds.includes(c.id)),
    [classes, student]
  );
  const attRate = student ? studentAttRate(attendance, student.id, student.classIds) : null;

  const myFees = useMemo(() => fees.filter((f) => f.studentId === id), [fees, id]);
  const unpaidFees = myFees.filter((f) => feeStatus(f) === 'unpaid');
  const owed = unpaidFees.reduce((sum, f) => sum + (f.amount - f.paid), 0);
  const feeHistory = useMemo(
    () => [...myFees].sort((a, b) => b.month.localeCompare(a.month)),
    [myFees]
  );
  const classNameById = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.name])),
    [classes]
  );

  let feeValue = '—';
  let feeSub = 'No fees yet';
  let feeColor: string | undefined;
  if (student?.billingStatus === 'free') {
    feeValue = 'Free';
    feeSub = 'No fees tracked';
  } else if (myFees.length > 0 && unpaidFees.length === 0) {
    feeValue = 'All paid';
    feeSub = `${myFees.length} fee ${myFees.length === 1 ? 'record' : 'records'}`;
    feeColor = feeStatusColor.paid;
  } else if (unpaidFees.length > 0) {
    feeValue = `${unpaidFees.length} unpaid`;
    feeSub = `LKR ${owed.toLocaleString()} owed`;
    feeColor = feeStatusColor.unpaid;
  }

  const examResults = useMemo<ExamResult[]>(() => {
    if (!student) return [];
    return exams
      .filter((e) => student.classIds.includes(e.classId))
      .map((e) => {
        const raw = e.marks?.[student.id];
        let mark: number | null = null;
        if (raw !== undefined && raw !== null && raw !== '') {
          const n = Number(raw);
          if (Number.isFinite(n) && e.maxMarks > 0) mark = n;
        }
        return {
          exam: e,
          mark,
          percent: mark === null ? null : (mark / e.maxMarks) * 100,
        };
      })
      .sort((a, b) => b.exam.date.localeCompare(a.exam.date));
  }, [exams, student]);

  const examStats = useMemo<{ avg: number | null; count: number }>(() => {
    const percents = examResults.flatMap((r) => (r.percent === null ? [] : [r.percent]));
    if (percents.length === 0) return { avg: null, count: 0 };
    const avg = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
    return { avg, count: percents.length };
  }, [examResults]);

  const attendanceHistory = useMemo<AttendanceRow[]>(() => {
    if (!student) return [];
    return studentClasses
      .flatMap((c) =>
        sessionsForClass(attendance, c.id).map((session): AttendanceRow => {
          const statusMap = session.statusMap as Record<string, string>;
          const value = statusMap[student.id];
          return {
            key: `${c.id}__${session.date}`,
            date: session.date,
            className: c.name,
            status: value === 'present' || value === 'late' ? value : 'absent',
          };
        })
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, studentClasses, student]);

  const attendedCount = attendanceHistory.filter((r) => r.status !== 'absent').length;
  const visibleAttendance = showAllAttendance
    ? attendanceHistory
    : attendanceHistory.slice(0, HISTORY_PREVIEW);

  return (
    <div>
      <Link href="/dashboard/students" className="text-sm text-muted">
        ← Back to students
      </Link>

      {loading ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : !student ? (
        <p className="mt-4 text-sm text-muted">Student not found.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-accent2">
                {initials(student.name)}
              </div>
              <div>
                <h1 className="text-xl font-bold">{student.name}</h1>
                <p className="mt-0.5 text-sm text-muted">
                  {student.school || 'No school added'}
                  {student.grade ? ` · ${student.grade}` : ''}
                </p>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => setEditOpen(true)}>
              Edit
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Attendance"
              value={attRate === null ? '—' : `${attRate}%`}
              sub={attRate === null ? 'No sessions recorded yet' : 'Across all classes'}
              color={attColor(attRate)}
            />
            <StatCard
              label="Classes"
              value={String(studentClasses.length)}
              sub="Currently enrolled"
            />
            <StatCard label="Fees" value={feeValue} sub={feeSub} color={feeColor} />
            <StatCard
              label="Exam average"
              value={examStats.avg === null ? '—' : `${examStats.avg}%`}
              sub={
                examStats.avg === null
                  ? 'No marks yet'
                  : `${examStats.count} ${examStats.count === 1 ? 'exam' : 'exams'}`
              }
            />
          </div>

          <div className="card mt-5">
            <h2 className="mb-4 text-sm font-semibold">Details</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Email" value={student.email} />
              <Detail label="NIC" value={student.nic} />
              <Detail label="Phone" value={student.phone} />
              <Detail label="Parent phone" value={student.parent} />
              <Detail label="School" value={student.school} />
              <Detail label="Grade" value={student.grade} />
              <Detail label="Enrolled" value={fmtDate(student.enrollDate)} />
              <Detail
                label="Fees"
                value={student.billingStatus === 'free' ? 'Free (no fees tracked)' : 'Normal'}
              />
            </div>

            {student.notes && (
              <div className="mt-4">
                <div className="text-xs text-muted">Notes</div>
                <div className="mt-0.5 whitespace-pre-wrap text-sm">{student.notes}</div>
              </div>
            )}
          </div>
          
          <div className="card mt-5">
            <h2 className="mb-1 text-sm font-semibold">Classes</h2>
            {studentClasses.length === 0 ? (
              <p className="text-sm text-muted">Not enrolled in any class.</p>
            ) : (
              <div>
                {studentClasses.map((c) => {
                  const rate = attRateFor(attendance, student.id, c.id);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-3 last:border-none"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {c.name}
                          {c.archived && <span className="ml-2 text-xs text-muted">(archived)</span>}
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {c.day} · {c.time} · LKR {Number(c.fee || 0).toLocaleString()}/mo
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold" style={{ color: attColor(rate) }}>
                          {rate === null ? '—' : `${rate}%`}
                        </div>
                        <div className="text-xs text-muted">attendance</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card mt-5">
            <h2 className="mb-3 text-sm font-semibold">Fee history</h2>
            {student.billingStatus === 'free' ? (
              <p className="text-sm text-muted">Fees are not tracked for this student.</p>
            ) : feeHistory.length === 0 ? (
              <p className="text-sm text-muted">No fee records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-2 py-2">Month</th>
                      <th className="px-2 py-2">Class</th>
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Paid</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeHistory.map((f) => {
                      const status = feeStatus(f);
                      return (
                        <tr key={f.id} className="border-b border-border/60 last:border-none">
                          <td className="px-2 py-2.5 text-sm">{fmtMonth(f.month)}</td>
                          <td className="px-2 py-2.5 text-sm">{classNameById[f.classId] || 'Unknown'}</td>
                          <td className="px-2 py-2.5 text-sm">LKR {f.amount.toLocaleString()}</td>
                          <td className="px-2 py-2.5 text-sm">LKR {f.paid.toLocaleString()}</td>
                          <td className="px-2 py-2.5">
                            <FeeBadge status={status ?? undefined} />
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            {status === 'unpaid' && (
                              <button
                                className="btn btn-success text-xs px-2 py-1"
                                onClick={() => setPayFee(f)}
                              > <img src="/general/coin.png" alt="arrow-right" className="h-4 w-4 object-contain" />
                                Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card mt-5">
            <h2 className="mb-3 text-sm font-semibold">Exam results</h2>
            {examResults.length === 0 ? (
              <p className="text-sm text-muted">No exams for this student&apos;s classes yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Exam</th>
                      <th className="px-2 py-2">Class</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Mark</th>
                      <th className="px-2 py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((r) => {
                      const typeInfo = EXAM_TYPES.find((t) => t.id === r.exam.type);
                      return (
                        <tr key={r.exam.id} className="border-b border-border/60 last:border-none">
                          <td className="px-2 py-2.5 text-sm">{fmtDate(r.exam.date)}</td>
                          <td className="px-2 py-2.5 text-sm">
                            <Link href={`/dashboard/exams/${r.exam.id}`} className="hover:underline">
                              {r.exam.name}
                            </Link>
                          </td>
                          <td className="px-2 py-2.5 text-sm">
                            {classNameById[r.exam.classId] || 'Unknown'}
                          </td>
                          <td className="px-2 py-2.5">
                            {typeInfo ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-xs"
                                style={{ color: typeInfo.color, backgroundColor: `${typeInfo.color}26` }}
                              >
                                {typeInfo.label}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-sm">
                            {r.mark === null ? (
                              <span className="text-muted">Not marked</span>
                            ) : (
                              `${r.mark} / ${r.exam.maxMarks}`
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-sm font-semibold">
                            {r.percent === null ? '—' : `${Math.round(r.percent)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card mt-5">
            <h2 className="text-sm font-semibold">Attendance history</h2>
            {attendanceHistory.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No sessions recorded for this student&apos;s classes yet.</p>
            ) : (
              <>
                <p className="mb-3 mt-0.5 text-xs text-muted">
                  Attended {attendedCount} of {attendanceHistory.length} sessions
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted">
                        <th className="px-2 py-2">Date</th>
                        <th className="px-2 py-2">Class</th>
                        <th className="px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleAttendance.map((row) => (
                        <tr key={row.key} className="border-b border-border/60 last:border-none">
                          <td className="px-2 py-2.5 text-sm">{fmtDate(row.date)}</td>
                          <td className="px-2 py-2.5 text-sm">{row.className}</td>
                          <td
                            className="px-2 py-2.5 text-sm font-medium"
                            style={{ color: STATUS_COLOR[row.status] }}
                          >
                            {STATUS_LABEL[row.status]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {attendanceHistory.length > HISTORY_PREVIEW && (
                  <button
                    className="mt-3 text-xs text-accent2"
                    onClick={() => setShowAllAttendance(!showAllAttendance)}
                  >
                    {showAllAttendance ? 'Show less' : `Show all ${attendanceHistory.length}`}
                  </button>
                )}
              </>
            )}
          </div>

          <PaymentModal
            open={payFee !== null}
            onClose={() => setPayFee(null)}
            fee={payFee}
            studentName={student.name}
            className={payFee ? classNameById[payFee.classId] || 'Unknown' : ''}
          />

          <StudentFormModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            student={student}
            allStudents={students}
            classes={classes}
          />
        </>
      )}
    </div>
  );
}