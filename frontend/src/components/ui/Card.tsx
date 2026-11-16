import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/format';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 dark:border-ink-800', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-ink-900 dark:text-white">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-ink-500 dark:text-ink-400">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12.5px] font-medium text-ink-400">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5" />}
          {c.to ? (
            <Link to={c.to} className="hover:text-brand-600">
              {c.label}
            </Link>
          ) : (
            <span className="text-ink-500 dark:text-ink-400">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({ title, description, actions, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; breadcrumbs?: Crumb[] }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900 sm:text-[26px] dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-ink-500 dark:text-ink-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'brand',
  hint,
  to,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet';
  hint?: ReactNode;
  to?: string;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  };

  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink-500 dark:text-ink-400">{label}</p>
        <p className="num mt-2 truncate text-[24px] font-extrabold tracking-tight text-ink-900 dark:text-white">{value}</p>
        {hint && <p className="mt-1 text-[12.5px] text-ink-400">{hint}</p>}
      </div>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tones[tone])}>{icon}</span>
    </div>
  );

  return to ? (
    <Link to={to} className="card block p-5 transition hover:border-brand-200 hover:shadow-pop dark:hover:border-brand-800">
      {body}
    </Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
}
