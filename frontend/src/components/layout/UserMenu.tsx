import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { cn, initials } from '../../lib/format';
import { useClickOutside } from '../../lib/hooks';
import { useTheme } from '../../lib/theme';

export function Avatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" className={cn('size-9 rounded-full object-cover', className)} />
  ) : (
    <span className={cn('grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-[12.5px] font-bold text-brand-800 dark:from-brand-800 dark:to-brand-900 dark:text-brand-100', className)}>
      {initials(name)}
    </span>
  );
}

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <button onClick={toggle} className="grid size-10 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white" aria-label="Toggle dark mode">
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, useCallback(() => setOpen(false), []), open);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 hover:bg-ink-100 dark:hover:bg-ink-800">
        <Avatar name={user.name} url={user.avatar_url} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13.5px] font-bold text-ink-900 dark:text-white">{user.name}</span>
          <span className="block text-[11.5px] text-ink-500">{user.role_label}</span>
        </span>
        <ChevronDown className={cn('size-4 text-ink-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 animate-pop-in overflow-hidden rounded-2xl border border-ink-200 bg-white p-1.5 shadow-pop dark:border-ink-700 dark:bg-ink-900">
          <div className="px-3 py-2.5">
            <p className="font-bold text-ink-900 dark:text-white">{user.name}</p>
            <p className="text-[12.5px] text-ink-500">@{user.username}</p>
          </div>
          <div className="my-1 h-px bg-ink-100 dark:bg-ink-800" />
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
