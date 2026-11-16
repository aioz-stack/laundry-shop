import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from './format';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}

interface ToastValue {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: Tone, title: string, description?: string) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6500 : 4000);
    },
    [dismiss],
  );

  const value: ToastValue = {
    success: (t, d) => push('success', t, d),
    error: (t, d) => push('error', t, d),
    info: (t, d) => push('info', t, d),
  };

  const icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  const tones = {
    success: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
    error: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
    info: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icon[t.tone];
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex animate-slide-in items-start gap-3 rounded-2xl border border-ink-200 bg-white p-3.5 shadow-pop dark:border-ink-700 dark:bg-ink-900">
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl', tones[t.tone])}>
                <Icon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-semibold text-ink-900 dark:text-white">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
