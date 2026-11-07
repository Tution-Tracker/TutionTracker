'use client';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[90%] max-w-[360px] rounded-2xl bg-white p-6 text-center">
        <h3 className="mb-2 text-base font-semibold">{title}</h3>
        <p className="mb-5 text-sm text-gray-500">{message}</p>
        <div className="flex justify-center gap-2.5">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}