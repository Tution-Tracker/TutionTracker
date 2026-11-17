'use client';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ total, page, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-3 py-3 border-t border-border">
      <div className="text-xs text-muted">
        Showing {from}–{to} of {total}
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <button
          className="btn btn-outline text-xs px-2 py-1 disabled:opacity-40"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ← Previous
        </button>
        {start > 1 && <span className="text-muted text-xs px-1">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`text-xs px-2.5 py-1 rounded-md ${
              p === page ? 'bg-accent/[0.15] text-accent2 font-semibold' : 'text-muted hover:bg-card2'
            }`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className="text-muted text-xs px-1">…</span>}
        <button
          className="btn btn-outline text-xs px-2 py-1 disabled:opacity-40"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next →
        </button>
      </div>
    </div>
  );
}