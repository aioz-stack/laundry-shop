import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '../../lib/format';
import { EmptyState, Skeleton } from './Feedback';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  /** Hide on small screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, rows, loading, rowKey, onRowClick, empty, className }: DataTableProps<T>) {
  const align = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className={cn('scrollbar-thin overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'sticky top-0 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5 text-[11.5px] font-bold tracking-wide text-ink-500 uppercase first:pl-5 last:pr-5 dark:border-ink-800 dark:bg-ink-950/40 dark:text-ink-400',
                  align(c.align),
                  c.hideOnMobile && 'hidden md:table-cell',
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows?.length
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={cn('border-b border-ink-100 px-4 py-4 first:pl-5 dark:border-ink-800', c.hideOnMobile && 'hidden md:table-cell')}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))
            : rows?.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('group transition-colors', onRowClick && 'cursor-pointer hover:bg-brand-50/40 dark:hover:bg-brand-500/5', loading && 'opacity-60')}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'border-b border-ink-100 px-4 py-3.5 align-middle text-ink-700 first:pl-5 last:pr-5 group-last:border-b-0 dark:border-ink-800 dark:text-ink-200',
                        align(c.align),
                        c.hideOnMobile && 'hidden md:table-cell',
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && rows && rows.length === 0 && (empty ?? <EmptyState title="Nothing here yet" description="Records will appear here once they are created." />)}
    </div>
  );
}

interface PaginationProps {
  meta?: { current_page: number; last_page: number; total: number; from: number | null; to: number | null };
  onPage: (page: number) => void;
}

export function Pagination({ meta, onPage }: PaginationProps) {
  if (!meta || meta.total === 0) return null;
  const { current_page: page, last_page: last } = meta;

  const pages: (number | '…')[] = [];
  for (let p = 1; p <= last; p++) {
    if (p === 1 || p === last || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  const btn = 'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-[13px] font-semibold transition';

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-5 py-3.5 sm:flex-row dark:border-ink-800">
      <p className="text-[13px] text-ink-500">
        Showing <span className="num font-semibold text-ink-700 dark:text-ink-200">{meta.from}–{meta.to}</span> of{' '}
        <span className="num font-semibold text-ink-700 dark:text-ink-200">{meta.total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button className={cn(btn, 'text-ink-500 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1 text-ink-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={cn(btn, 'num', p === page ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800')}
            >
              {p}
            </button>
          ),
        )}
        <button className={cn(btn, 'text-ink-500 hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800')} disabled={page >= last} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
      <input autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pr-9 pl-10" />
      {value && (
        <button onClick={() => onChange('')} className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800" aria-label="Clear search">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Pill-style segmented filter. */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }>; className?: string }) {
  return (
    <div className={cn('no-scrollbar inline-flex max-w-full overflow-x-auto rounded-xl bg-ink-100 p-1 dark:bg-ink-800', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition',
            value === o.value ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-950 dark:text-white' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
