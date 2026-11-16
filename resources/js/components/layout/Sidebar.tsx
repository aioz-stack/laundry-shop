import { NavLink } from 'react-router';
import { ScanLine } from 'lucide-react';
import { P, useAuth } from '../../lib/auth';
import { cn } from '../../lib/format';
import { Brand } from './Brand';
import { NAV_GROUPS } from './nav';

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { can } = useAuth();

  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.permission)) })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        'no-print fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-ink-200/70 bg-white transition-transform duration-200 lg:static lg:translate-x-0 dark:border-ink-800 dark:bg-ink-900',
        open ? 'translate-x-0 shadow-pop' : '-translate-x-full',
      )}
    >
      <div className="flex h-16 items-center px-5">
        <Brand />
      </div>

      {can(P.OrdersCreate) && (
        <div className="px-4 pt-1 pb-3">
          <NavLink
            to="/pos"
            onClick={onNavigate}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 font-semibold text-white shadow-sm shadow-brand-900/20 transition hover:bg-brand-700"
          >
            <ScanLine className="size-[18px]" />
            New Laundry Order
            <kbd className="ml-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[10.5px] font-bold">F2</kbd>
          </NavLink>
        </div>
      )}

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((group) => (
          <div key={group.title} className="mt-4 first:mt-1">
            <p className="eyebrow mb-1.5 px-3">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex h-10 items-center gap-3 rounded-xl px-3 font-semibold transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('size-[18px]', isActive ? 'text-brand-600 dark:text-brand-300' : 'text-ink-400 group-hover:text-ink-600 dark:group-hover:text-ink-200')} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
