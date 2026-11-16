import type { ReactNode } from 'react';
import { cn } from '../../lib/format';
import { PAYMENT_LABELS, PAYMENT_STYLE, STATUS_LABELS, STATUS_STYLE } from '../../lib/status';
import type { OrderStatus, PaymentStatus } from '../../lib/types';

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ring-1 ring-inset', className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'md' | 'lg' }) {
  const style = STATUS_STYLE[status];
  return (
    <Badge className={cn(style.badge, size === 'lg' && 'px-3 py-1 text-[13px]')}>
      <span className={cn('size-1.5 rounded-full', style.dot)} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={PAYMENT_STYLE[status]}>{PAYMENT_LABELS[status]}</Badge>;
}

export function NeutralBadge({ children, className }: { children: ReactNode; className?: string }) {
  return <Badge className={cn('bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700', className)}>{children}</Badge>;
}
