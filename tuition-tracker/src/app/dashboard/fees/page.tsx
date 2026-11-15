'use client';

import { Fragment, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeClasses, type ClassDoc } from '@/lib/classesApi';
import { subscribeStudents } from '@/lib/studentsApi';
import { subscribeFees, feeStatus, ensureFeesForMonth } from '@/lib/feesApi';
import { fmtMonth, localMonthStr, MONTHS } from '@/lib/dateUtils';
import type { Student } from '@/types/student';
import FeeBadge from '@/components/FeeBadge';
import PaymentModal from '@/components/PaymentModal';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 50;
const ALL = 'all';
type FeeStatus = 'paid' | 'unpaid';

const initials = (n: any) =>
  (n || '')
    .split(' ')
    .slice(0, 2)
    .map((x: any[]) => x[0])
    .join('')
    .toUpperCase() || '?';

export default function FeesPage() {
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [payFee, setPayFee] = useState<any>(null);

  const now = new Date();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [classFilter, setClassFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  const autoRanRef = useRef(false);

  useEffect(() => {
    const u1 = subscribeClasses(setClasses);
    const u2 = subscribeStudents(setStudents);
    const u3 = subscribeFees(setFees);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  useEffect(() => {
    if (autoRanRef.current) return;
    if (!classes.length || !students.length) return;
    autoRanRef.current = true;
    ensureFeesForMonth(localMonthStr(new Date()), classes, students, fees).catch(() => {});
  }, [classes, students]);

  useEffect(() => {
    if (!expanded || expandAll) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element) || !target.closest('[data-fee-row]')) setExpanded(null);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [expanded, expandAll]);

  const studentById = useMemo<Record<string, Student>>(() => {
    const m: Record<string, Student> = {};
    students.forEach((s) => {
      m[String(s.id)] = s;
    });
    return m;
  }, [students]);
  const classById = useMemo<Record<string, ClassDoc>>(() => {
    const m: Record<string, ClassDoc> = {};
    classes.forEach((c) => {
      m[String(c.id)] = c;
    });
    return m;
  }, [classes]);
  const studentName = (id: string | number) => studentById[String(id)]?.name || 'Unknown';
  const className = (id: string | number) => classById[String(id)]?.name || 'Unknown';

  const years = useMemo(() => {
    const ys = new Set(fees.map((f) => f.month.slice(0, 4)));
    ys.add(String(now.getFullYear()));
    return [...ys].filter((y) => Number(y) <= now.getFullYear()).sort().reverse();
  }, [fees]);

  const selectableMonths = useMemo(() => {
    const isCurrentYear = Number(year) === now.getFullYear();
    const lastMonth = isCurrentYear ? now.getMonth() + 1 : 12;
    return Array.from({ length: lastMonth }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [year]);

  useEffect(() => {
    if (month !== ALL && !selectableMonths.includes(month)) {
      setMonth(selectableMonths[selectableMonths.length - 1]);
    }
  }, [selectableMonths]);

  const filtersActive =
    search.trim() !== '' ||
    classFilter !== ALL ||
    statusFilter !== ALL ||
    month !== String(now.getMonth() + 1).padStart(2, '0') ||
    year !== String(now.getFullYear()) ||
    expandAll;

  function clearFilters() {
    setSearch('');
    setYear(String(now.getFullYear()));
    setMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setClassFilter(ALL);
    setStatusFilter(ALL);
    setExpandAll(false);
    setExpanded(null);
    setPage(1);
  }

  useEffect(() => {
    setPage(1);
  }, [search, year, month, classFilter, statusFilter]);

  const filteredFees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fees.filter((f) => {
      if (!f.month.startsWith(year)) return false;
      if (month !== ALL && f.month.slice(5, 7) !== month) return false;
      if (classFilter !== ALL && f.classId !== classFilter) return false;
      if (statusFilter !== ALL && feeStatus(f) !== statusFilter) return false;
      if (q) {
        const s = studentById[f.studentId];
        const hay = `${s?.name || ''} ${s?.email || ''} ${s?.phone || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [fees, search, year, month, classFilter, statusFilter, studentById]);

  const expected = filteredFees.reduce((a, f) => a + f.amount, 0);
  const collected = filteredFees.reduce((a, f) => a + f.paid, 0);
  const outstanding = expected - collected;
  const rate = expected ? Math.round((collected / expected) * 100) : 0;

  const grouped = useMemo<Array<{ studentId: string; rows: any[]; amount: number; paid: number; balance: number; status: FeeStatus }>>(() => {
    const map = new Map<string, any[]>();
    filteredFees.forEach((f) => {
      if (!map.has(f.studentId)) map.set(f.studentId, []);
      map.get(f.studentId)!.push(f);
    });
    return [...map.entries()]
      .map(([studentId, rows]) => {
        rows.sort((a: { month: any; }, b: { month: string; }) => b.month.localeCompare(a.month));
        const amount = rows.reduce((a: any, f: { amount: any; }) => a + f.amount, 0);
        const paid = rows.reduce((a: any, f: { paid: any; }) => a + f.paid, 0);
        return {
          studentId,
          rows,
          amount,
          paid,
          balance: amount - paid,
          status: (paid >= amount ? 'paid' : 'unpaid') as FeeStatus,
        };
      })
      .sort((a, b) => studentName(a.studentId).localeCompare(studentName(b.studentId)));
  }, [filteredFees, studentById]);

  const pageRows = grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const byClass = useMemo(
    () =>
      classes.map((c) => {
        const cf = fees.filter((f) => f.classId === c.id);
        const col = cf.reduce((a, f) => a + f.paid, 0);
        const exp = cf.reduce((a, f) => a + f.amount, 0);
        return {
          cls: c,
          collected: col,
          expected: exp,
          pct: exp ? Math.round((col / exp) * 100) : 0,
          paidCount: cf.filter((f) => feeStatus(f) === 'paid').length,
          unpaidCount: cf.filter((f) => feeStatus(f) === 'unpaid').length,
        };
      }),
    [classes, fees]
  );

  const freeStudents = students.filter((s) => s.billingStatus === 'free');

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap no-print">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fees</h1>
          <div className="text-sm text-muted mt-1">
            Fee records are created automatically at the start of each month
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
         <img src="/general/printing.png" alt="arrow-right" className="h-4 w-4 object-contain" /> Print
        </button>
      </div>

      <div className="flex gap-0.5 mb-4 bg-card2 p-1 rounded-lg border border-border w-fit no-print">
        {[
          ['all', 'All records'],
          ['by-class', 'By class'],
        ].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-md text-sm ${
              tab === t ? 'bg-card text-accent2 font-semibold shadow-sm' : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="print-area">
        {tab === 'all' && (
          <>
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <div className="card">
                <div className="text-[13px] uppercase tracking-wide text-muted mb-1">Expected</div>
                <div className="text-lg font-bold text-foreground">LKR {expected.toLocaleString()}</div>
              </div>
              <div className="card">
                <div className="text-[13px] uppercase tracking-wide text-muted mb-1">Collected</div>
                <div className="text-lg font-bold text-green">LKR {collected.toLocaleString()}</div>
              </div>
              <div className="card">
                <div className="text-[13px] uppercase tracking-wide text-muted mb-1">Outstanding</div>
                <div className="text-lg font-bold text-red">LKR {outstanding.toLocaleString()}</div>
              </div>
              <div className="card">
                <div className="text-[13px] uppercase tracking-wide text-muted mb-1">Rate</div>
                <div
                  className="text-lg font-bold"
                  style={{ color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--red)' }}
                >
                  {rate}%
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-3.5 flex-wrap items-center no-print">
              <div className="flex items-center bg-card2 border border-border rounded-lg px-2.5">
                <i className="ti ti-search text-black text-sm" />
                <input
                  className="border-none bg-transparent px-2 py-1.5 text-sm outline-none text-foreground"
                  placeholder="Search student…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-foreground"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                className="px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-foreground"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                <option value={ALL}>All months</option>
                {selectableMonths.map((m) => (
                  <option key={m} value={m}>
                    {MONTHS[Number(m) - 1]}
                  </option>
                ))}
              </select>
              <select
                className="px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-foreground"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value={ALL}>All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.archived ? ' (archived)' : ''}
                  </option>
                ))}
              </select>
              <select
                className="px-2.5 py-1.5 bg-card2 border border-border rounded-lg text-sm text-foreground"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value={ALL}>Any status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <button
                className={`btn btn-outline btn-sm ${expandAll ? 'bg-accent/15 text-accent2 border-accent/30' : ''}`}
                onClick={() => {
                  setExpandAll((v) => !v);
                  if (expandAll) setExpanded(null);
                }}
              >
                {expandAll ? 'Collapse all' : 'Expand all'}
              </button>
              {filtersActive && (
                <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                  ✕ Clear
                </button>
              )}
            </div>

            {freeStudents.length > 0 && (
              <div className="text-xs text-muted mb-2.5 no-print">
                {freeStudents.length} student{freeStudents.length === 1 ? '' : 's'} marked Free —
                excluded from all totals above.
              </div>
            )}

            <div className="card !p-0 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left text-[13px] uppercase tracking-wide text-muted border-b border-border">
                    <th className="px-3 py-2.5 text-[13px]">Student</th>
                    <th className="px-3 py-2.5 text-[13px]">Records</th>
                    <th className="px-3 py-2.5 text-[13px]">Expected</th>
                    <th className="px-3 py-2.5 text-[13px]">Paid</th>
                    <th className="px-3 py-2.5 text-[13px]">Balance</th>
                    <th className="px-3 py-2.5 text-[13px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-8 text-[13px]">
                        No fee records match these filters.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((g) => {
                      const isOpen = expandAll || expanded === g.studentId;
                      return (
                        <Fragment key={g.studentId}>
                          <tr
                            data-fee-row
                            onClick={() => {
                              if (expandAll) return;
                              setExpanded(isOpen ? null : g.studentId);
                            }}
                            className="border-b border-border/60 hover:bg-card2 cursor-pointer"
                          >
                            <td className="px-3 py-2.5 text-[13px]">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}
                                >
                                  ▸
                                </span>
                                <div className="w-8 h-8 rounded-full bg-accent/20 text-accent2 flex items-center justify-center text-xs font-bold shrink-0">
                                  {initials(studentName(g.studentId))}
                                </div>
                                {studentName(g.studentId)}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[13px] text-muted">{g.rows.length}</td>
                            <td className="px-3 py-2.5 text-[13px]">{g.amount.toLocaleString()}</td>
                            <td
                              className={`px-3 py-2.5 text-[13px] ${g.paid > 0 ? 'text-green' : 'text-muted'}`}
                            >
                              {g.paid.toLocaleString()}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-[13px] font-semibold ${g.balance > 0 ? 'text-red' : 'text-muted'}`}
                            >
                              {g.balance.toLocaleString()}
                            </td>
                            <td className="px-3 py-2.5 text-[13px]">
                              <FeeBadge status={g.status} />
                            </td>
                          </tr>
                          {isOpen && (
                            <tr data-fee-row className="border-b border-border/60">
                              <td colSpan={6} className="px-3 py-3 bg-card2 text-[13px]">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="text-left text-[13px] uppercase tracking-wide text-muted">
                                      <th className="px-2 py-1.5 text-[13px]">Month</th>
                                      <th className="px-2 py-1.5 text-[13px]">Class</th>
                                      <th className="px-2 py-1.5 text-[13px]">Amount</th>
                                      <th className="px-2 py-1.5 text-[13px]">Paid</th>
                                      <th className="px-2 py-1.5 text-[13px]">Method</th>
                                      <th className="px-2 py-1.5 text-[13px]">Date</th>
                                      <th className="px-2 py-1.5 text-[13px]">Status</th>
                                      <th className="px-2 py-1.5 text-[13px] no-print"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {g.rows.map((f: { id: Key | null | undefined; month: string | null | undefined; classId: string | number; amount: { toLocaleString: () => string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; paid: number; method: any; paidDate: any; }) => (
                                      <tr key={f.id} className="border-t border-border/60">
                                        <td className="px-2 py-1.5 text-[13px]">{fmtMonth(f.month)}</td>
                                        <td className="px-2 py-1.5 text-[13px] text-muted">
                                          {className(f.classId)}
                                        </td>
                                        <td className="px-2 py-1.5 text-[13px]">{f.amount.toLocaleString()}</td>
                                        <td
                                          className={`px-2 py-1.5 text-[13px] ${f.paid > 0 ? 'text-green' : 'text-muted'}`}
                                        >
                                          {f.paid.toLocaleString()}
                                        </td>
                                        <td className="px-2 py-1.5 text-[13px] text-muted">
                                          {f.method || '—'}
                                        </td>
                                        <td className="px-2 py-1.5 text-[13px] text-muted">
                                          {f.paidDate || '—'}
                                        </td>
                                        <td className="px-2 py-1.5 text-[13px]">
                                          <FeeBadge status={feeStatus(f) ?? undefined} />
                                        </td>
                                        <td className="px-2 py-1.5 text-[13px] no-print">
                                          {feeStatus(f) !== 'paid' && !classById[f.classId]?.archived && (
                                            <button
                                              className="btn btn-success text-xs px-2 py-1"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setPayFee(f);
                                              }}
                                            >
                                              <img src="/general/coin.png" alt="arrow-right" className="h-4 w-4 object-contain" /> Pay
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="no-print">
                <Pagination
                  total={grouped.length}
                  page={page}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            </div>
          </>
        )}

        {tab === 'by-class' && (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {byClass.length === 0 ? (
              <div className="card text-center text-muted py-9 col-span-full">No classes.</div>
            ) : (
              byClass.map(({ cls, collected: col, expected: exp, pct, paidCount, unpaidCount }) => (
                <div key={cls.id} className="card">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                        {cls.name}
                        {cls.archived && (
                          <span className="bg-amber/15 text-amber px-2 py-0.5 rounded-full text-xs">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        LKR {col.toLocaleString()} / {exp.toLocaleString()}
                      </div>
                    </div>
                    <span
                      className="text-xl font-bold"
                      style={{ color: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)' }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-card2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)',
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-3 text-center">
                    {([
                      ['Paid', paidCount, 'var(--green)'],
                      ['Unpaid', unpaidCount, 'var(--red)'],
                    ] as [string, number, string][]).map(([label, n, color]) => (
                      <div key={label} className="bg-card2 border border-border rounded-lg py-2">
                        <div className="text-lg font-bold" style={{ color }}>
                          {n}
                        </div>
                        <div className="text-[13px] text-muted">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <PaymentModal
        open={!!payFee}
        onClose={() => setPayFee(null)}
        fee={payFee}
        studentName={payFee ? studentName(payFee.studentId) : ''}
        className={payFee ? className(payFee.classId) : ''}
      />
    </div>
  );
}