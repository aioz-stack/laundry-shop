import type { ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2, RotateCw } from 'lucide-react';
import { cn } from '../../lib/format';
import { Button } from './Button';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-brand-600', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800', className)} />;
}

export function LoadingBlock({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-ink-400', className)}>
      <Spinner className="size-6" />
      <span className="text-[13px] font-medium">{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-100/50 blur-xl dark:bg-brand-500/10" />
        <span className="relative grid size-14 place-items-center rounded-2xl bg-white text-brand-600 shadow-card ring-1 ring-ink-200 dark:bg-ink-800 dark:text-brand-300 dark:ring-ink-700">
          {icon ?? <Inbox className="size-6" />}
        </span>
      </div>
      <p className="text-[15px] font-bold text-ink-900 dark:text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13.5px] text-ink-500 dark:text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="size-6 text-rose-500" />}
      title="Couldn't load this"
      description={message}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" icon={<RotateCw className="size-4" />} onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}

export function Alert({ tone = 'info', children, className }: { tone?: 'info' | 'warning' | 'error' | 'success'; children: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/20',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
    error: 'bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
  };
  return <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13.5px] ring-1 ring-inset', tones[tone], className)}>{children}</div>;
}
