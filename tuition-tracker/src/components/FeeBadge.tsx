'use client';

const styles = {
  paid: 'bg-green/15 text-green',
  unpaid: 'bg-red/15 text-red',
};
const labels = { paid: 'Paid', unpaid: 'Unpaid' };
type FeeStatus = keyof typeof styles;

export default function FeeBadge({ status }: { status?: FeeStatus }) {
  if (!status) return <span className="text-muted text-xs">—</span>;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-medium ${styles[status] || 'bg-white/10 text-muted'}`}>
      {labels[status] || status}
    </span>
  );
}