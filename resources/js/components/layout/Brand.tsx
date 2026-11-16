import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/format';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-sm shadow-brand-900/30', className)}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="4.5" y="3" width="15" height="18" rx="3" />
        <circle cx="12" cy="13" r="4.2" />
        <path d="M9.6 13.4c.8.7 1.6.7 2.4 0s1.6-.7 2.4 0" className="text-brand-200" stroke="currentColor" />
        <circle cx="8" cy="6.3" r=".6" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Brand({ collapsed }: { collapsed?: boolean }) {
  const { settings } = useAuth();
  const name = settings?.shop_name || import.meta.env.VITE_APP_NAME || 'Laundry POS';

  return (
    <div className="flex min-w-0 items-center gap-3">
      {settings?.shop_logo_url ? (
        <img src={settings.shop_logo_url} alt="" className="size-9 shrink-0 rounded-xl object-cover ring-1 ring-ink-200 dark:ring-ink-700" />
      ) : (
        <BrandMark />
      )}
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-ink-900 dark:text-white">{name}</p>
          <p className="text-[11px] font-semibold tracking-wide text-ink-400 uppercase">Laundry POS</p>
        </div>
      )}
    </div>
  );
}
