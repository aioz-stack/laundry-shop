import type { OrderStatus, PaymentStatus } from './types';

/** Visual language for statuses, shared by badges, the board and charts. */

export const ORDER_STEPS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'received', label: 'Received' },
  { value: 'washing', label: 'Washing' },
  { value: 'drying', label: 'Drying' },
  { value: 'folding', label: 'Folding' },
  { value: 'ready_for_pickup', label: 'Ready' },
  { value: 'released', label: 'Released' },
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Received',
  washing: 'Washing',
  drying: 'Drying',
  folding: 'Folding',
  ready_for_pickup: 'Ready for Pickup',
  released: 'Released',
  cancelled: 'Cancelled',
};

export const STATUS_STYLE: Record<OrderStatus, { badge: string; dot: string; hex: string }> = {
  received: { badge: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25', dot: 'bg-slate-400', hex: '#94a3b8' },
  washing: { badge: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25', dot: 'bg-sky-500', hex: '#0ea5e9' },
  drying: { badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25', dot: 'bg-amber-500', hex: '#f59e0b' },
  folding: { badge: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25', dot: 'bg-violet-500', hex: '#8b5cf6' },
  ready_for_pickup: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25', dot: 'bg-emerald-500', hex: '#10b981' },
  released: { badge: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25', dot: 'bg-brand-600', hex: '#0e7890' },
  cancelled: { badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25', dot: 'bg-rose-500', hex: '#f43f5e' },
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  unpaid: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25',
  partially_paid: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25',
  refunded: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25',
};

/** Next forward step in the pipeline, used for one-click "advance" buttons. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const flow: OrderStatus[] = ['received', 'washing', 'drying', 'folding', 'ready_for_pickup', 'released'];
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}
