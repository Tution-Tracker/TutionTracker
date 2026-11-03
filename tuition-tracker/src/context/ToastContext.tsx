'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'green' | 'red' | 'amber';

type ToastContextValue = {
  toast: (text: string, kind?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('green');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((text: string, kind: ToastType = 'green') => {
    setMsg(text);
    setType(kind);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setMsg(null), 2800);
  }, []);

  const colors: Record<ToastType, string> = {
    green: 'text-green',
    red: 'text-red',
    amber: 'text-amber',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {msg && (
        <div className="light-surface fixed bottom-5.5 right-5.5 bg-card2 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground z-[999] flex items-center gap-2 shadow-2xl">
          <span className={colors[type] || colors.green}>●</span>
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}