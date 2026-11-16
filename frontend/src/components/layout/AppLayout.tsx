import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Clock, Menu, Search } from 'lucide-react';
import { P, useAuth } from '../../lib/auth';
import { cn } from '../../lib/format';
import { Sidebar } from './Sidebar';
import { Brand } from './Brand';
import { ThemeToggle, UserMenu } from './UserMenu';

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="num hidden items-center gap-1.5 rounded-xl bg-ink-100/70 px-3 py-2 text-[13px] font-semibold text-ink-600 md:flex dark:bg-ink-800 dark:text-ink-300">
      <Clock className="size-4 text-ink-400" />
      {now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
    </span>
  );
}

/** Global order lookup: Ctrl/⌘+K focuses, Enter opens the Orders search. */
function QuickSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/orders?q=${encodeURIComponent(q.trim())}`);
    setQ('');
    ref.current?.blur();
  };

  return (
    <form onSubmit={submit} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find order #, customer name or phone…" className="input h-10 bg-ink-50 pr-14 pl-10 dark:bg-ink-800/60" />
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[10.5px] font-bold text-ink-400 dark:border-ink-700 dark:bg-ink-900">Ctrl K</kbd>
    </form>
  );
}

/** F2 opens the POS from anywhere — the desk operator's main shortcut. */
function useGlobalShortcuts() {
  const navigate = useNavigate();
  const { can } = useAuth();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' && can(P.OrdersCreate)) {
        e.preventDefault();
        navigate('/pos');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate, can]);
}

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useGlobalShortcuts();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open && <div className="fixed inset-0 z-40 bg-ink-950/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink-200/70 bg-white/85 px-4 backdrop-blur sm:px-6 dark:border-ink-800 dark:bg-ink-900/85">
          <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <Brand collapsed />
          </div>
          <QuickSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <LiveClock />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Focused, full-width layout for the counter POS screen. */
export function PosLayout() {
  const { can } = useAuth();
  useGlobalShortcuts();
  const links = [
    { to: '/orders', label: 'Orders', show: can(P.OrdersView) },
    { to: '/tracking', label: 'Tracking', show: can(P.OrdersStatus) },
    { to: '/customers', label: 'Customers', show: can(P.CustomersView) },
  ].filter((l) => l.show);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink-200/70 bg-white/90 px-4 backdrop-blur sm:px-6 dark:border-ink-800 dark:bg-ink-900/90">
        <Link to={can(P.DashboardView) ? '/' : '/orders'} className="grid size-10 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-800" aria-label="Back to dashboard" title="Back to dashboard">
          <ArrowLeft className="size-5" />
        </Link>
        <Brand />
        <span className="ml-1 hidden rounded-lg bg-brand-50 px-2.5 py-1 text-[12px] font-bold tracking-wide text-brand-700 uppercase sm:inline dark:bg-brand-500/10 dark:text-brand-300">Point of Sale</span>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={cn('rounded-lg px-3 py-2 text-[13.5px] font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-800 dark:hover:text-white')}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <LiveClock />
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
