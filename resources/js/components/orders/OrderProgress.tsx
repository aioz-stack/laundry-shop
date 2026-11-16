import { Check, Droplets, PackageCheck, Shirt, Sun, Inbox, HandPlatter, XCircle } from 'lucide-react';
import { cn, formatDateTime } from '../../lib/format';
import { ORDER_STEPS } from '../../lib/status';
import type { OrderStatus, StatusHistory } from '../../lib/types';

const ICONS = {
  received: Inbox,
  washing: Droplets,
  drying: Sun,
  folding: Shirt,
  ready_for_pickup: PackageCheck,
  released: HandPlatter,
} as const;

/** Visual pipeline: Received → Washing → Drying → Folding → Ready → Released. */
export function OrderProgress({ status, history = [], compact }: { status: OrderStatus; history?: StatusHistory[]; compact?: boolean }) {
  if (status === 'cancelled') {
    const at = history.find((h) => h.to_status === 'cancelled');
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
        <XCircle className="size-5" />
        <div>
          <p className="font-bold">Order cancelled</p>
          {at && <p className="text-[13px] opacity-80">{at.remarks ? `${at.remarks} · ` : ''}{formatDateTime(at.created_at)}</p>}
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.findIndex((s) => s.value === status);

  return (
    <ol className="flex w-full items-start">
      {ORDER_STEPS.map((step, i) => {
        const done = i < currentIndex || status === 'released';
        const current = i === currentIndex && status !== 'released';
        const Icon = ICONS[step.value as keyof typeof ICONS];
        const when = history.filter((h) => h.to_status === step.value).at(-1)?.created_at;

        return (
          <li key={step.value} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && (
              <span
                className={cn('absolute top-[17px] right-1/2 left-[-50%] h-[3px] rounded-full', i <= currentIndex ? 'bg-brand-500' : 'bg-ink-200 dark:bg-ink-700', compact && 'top-[13px]')}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 grid place-items-center rounded-full ring-4 ring-white transition dark:ring-ink-900',
                compact ? 'size-7' : 'size-9',
                done && 'bg-brand-600 text-white',
                current && 'bg-white text-brand-600 shadow-[0_0_0_2px_var(--color-brand-500)] dark:bg-ink-900',
                !done && !current && 'bg-ink-100 text-ink-400 dark:bg-ink-800',
              )}
            >
              {done ? <Check className={compact ? 'size-3.5' : 'size-4'} strokeWidth={3} /> : <Icon className={compact ? 'size-3.5' : 'size-4'} />}
            </span>
            {!compact && (
              <>
                <span className={cn('mt-2 text-[12px] font-semibold', current ? 'text-brand-700 dark:text-brand-300' : done ? 'text-ink-700 dark:text-ink-200' : 'text-ink-400')}>{step.label}</span>
                <span className="mt-0.5 hidden text-[11px] text-ink-400 sm:block">{when ? formatDateTime(when) : ' '}</span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
