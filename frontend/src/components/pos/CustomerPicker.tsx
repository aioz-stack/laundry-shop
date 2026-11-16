import { forwardRef, useEffect, useState } from 'react';
import { Phone, Search, UserPlus, X, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { cn, initials, peso } from '../../lib/format';
import { useDebounce } from '../../lib/hooks';
import type { Customer } from '../../lib/types';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Feedback';

interface Props {
  value: Customer | null;
  onChange: (c: Customer | null) => void;
  onRegister: (prefill: { name?: string; phone?: string }) => void;
  canRegister: boolean;
}

/** Phone-first customer lookup with keyboard navigation. */
export const CustomerPicker = forwardRef<HTMLInputElement, Props>(function CustomerPicker({ value, onChange, onRegister, canRegister }, ref) {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q.trim(), 250);
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get('/customers', { params: { q: debounced, per_page: 6 } })
      .then((res) => !cancelled && (setResults(res.data.data), setActive(0)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const pick = (c: Customer) => {
    onChange(c);
    setQ('');
    setResults([]);
  };

  const registerPrefill = () => (/^[\d+\s()-]+$/.test(q.trim()) ? { phone: q.trim() } : { name: q.trim() });

  if (value) {
    const owes = Number(value.outstanding_balance ?? 0) > 0;
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800 dark:bg-brand-500/5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-600 text-[15px] font-bold text-white">{initials(value.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-ink-900 dark:text-white">{value.name}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-500">
            <span className="flex items-center gap-1">
              <Phone className="size-3.5" /> {value.phone}
            </span>
            <span>{value.customer_code}</span>
            {value.orders_count !== undefined && <span>{value.orders_count} orders</span>}
          </p>
          {owes && (
            <p className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-amber-700 dark:text-amber-400">
              <AlertCircle className="size-3.5" /> Has unpaid balance of {peso(value.outstanding_balance)}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)} icon={<X className="size-4" />}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-400" />
        <input
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (results[active]) pick(results[active]);
              else if (canRegister && q.trim().length >= 2 && !loading) onRegister(registerPrefill());
            } else if (e.key === 'Escape') {
              setQ('');
            }
          }}
          placeholder="Search phone number or name…"
          className="input input-lg h-14 pr-12 pl-12 text-[16px] font-medium"
          inputMode="search"
          autoComplete="off"
        />
        {loading && <Spinner className="absolute top-1/2 right-4 -translate-y-1/2" />}
      </div>

      {debounced.length >= 2 && !loading && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 animate-pop-in overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop dark:border-ink-700 dark:bg-ink-900">
          {results.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(c)}
              className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', i === active ? 'bg-brand-50 dark:bg-brand-500/10' : '')}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-[12px] font-bold text-ink-600 dark:bg-ink-800 dark:text-ink-300">{initials(c.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink-900 dark:text-white">{c.name}</span>
                <span className="num block text-[13px] text-ink-500">{c.phone}</span>
              </span>
              {Number(c.outstanding_balance ?? 0) > 0 && <span className="num text-[12px] font-semibold text-amber-600">Owes {peso(c.outstanding_balance)}</span>}
            </button>
          ))}
          {results.length === 0 && <p className="px-4 py-3 text-ink-500">No customer matches “{debounced}”.</p>}
          {canRegister && (
            <button onClick={() => onRegister(registerPrefill())} className="flex w-full items-center gap-3 border-t border-ink-100 px-4 py-3 text-left font-semibold text-brand-700 hover:bg-brand-50 dark:border-ink-800 dark:text-brand-300 dark:hover:bg-brand-500/10">
              <span className="grid size-9 place-items-center rounded-full bg-brand-100 dark:bg-brand-500/15">
                <UserPlus className="size-4" />
              </span>
              Register “{debounced}” as a new customer
            </button>
          )}
        </div>
      )}
    </div>
  );
});
