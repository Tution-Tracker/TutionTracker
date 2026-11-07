'use client';

import type { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  icon?: string;
  children: ReactNode;
};

export default function Modal({ open, onClose, title, icon, children }: ModalProps)  {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-[90%] max-w-[480px] overflow-y-auto rounded-2xl bg-card2 p-6">
          {title && (
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              {icon && <span>{icon}</span>}
              {title}
            </h2>
          )}
        {children}
      </div>
    </div>
  );
}