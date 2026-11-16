/**
 * Display formatting only. Money arrives from the API as exact decimal
 * strings; we format them without doing any financial arithmetic.
 */

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function peso(value: string | number | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  return pesoFormatter.format(Number.isFinite(n) ? n : 0);
}

/** Compact peso for chart axes: ₱12.5k */
export function pesoShort(value: number): string {
  if (Math.abs(value) >= 1000) return `₱${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `₱${Math.round(value)}`;
}

export function quantity(value: string | number, unit: string): string {
  const n = Number(value);
  const text = unit === 'kg' ? n.toFixed(2).replace(/\.?0+$/, '') : String(Math.round(n));
  const label = unit === 'kg' ? 'kg' : unit === 'pc' ? (n === 1 ? 'pc' : 'pcs') : n === 1 ? 'load' : 'loads';
  return `${text} ${label}`;
}

const dateFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export const formatDate = (iso?: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const formatDateTime = (iso?: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : '—');
export const formatFull = (iso?: string | null) => (iso ? fullFmt.format(new Date(iso)) : '—');
export const formatTime = (iso?: string | null) => (iso ? timeFmt.format(new Date(iso)) : '—');

export function relativeTime(iso?: string | null): string {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const abs = Math.abs(diff);
  const future = diff < 0;
  if (abs < 45) return future ? 'in a moment' : 'just now';

  // [upper bound in seconds, seconds per unit, unit name]
  const steps: [number, number, string][] = [
    [3600, 60, 'minute'],
    [86400, 3600, 'hour'],
    [86400 * 14, 86400, 'day'],
  ];
  for (const [bound, size, name] of steps) {
    if (abs < bound) {
      const v = Math.max(1, Math.round(abs / size));
      const label = `${v} ${name}${v > 1 ? 's' : ''}`;
      return future ? `in ${label}` : `${label} ago`;
    }
  }
  return formatDate(iso);
}

/** yyyy-mm-dd in local time, for <input type="date">. */
export function isoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
