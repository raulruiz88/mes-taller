'use client';

import { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

let toastFn: ((props: ToastProps) => void) | null = null;

export function toast(props: ToastProps) {
  toastFn?.(props);
}

export function Toaster() {
  const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    toastFn = (props) => {
      const id = counter.current++;
      setToasts((prev) => [...prev, { ...props, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, props.duration ?? 3500);
    };
    return () => { toastFn = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-in slide-in-from-bottom-2 duration-200 pointer-events-auto ${
            t.type === 'error'
              ? 'bg-red-950 border-red-500/40 text-red-300'
              : t.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
