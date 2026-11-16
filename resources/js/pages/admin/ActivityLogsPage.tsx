import { useState } from 'react';
import { Activity, CreditCard, LogIn, Settings, ShoppingBag, Tags, UserCog, Users } from 'lucide-react';
import { formatFull } from '../../lib/format';
import { useApiQuery, useDebounce } from '../../lib/hooks';
import type { ActivityLog, Paginated } from '../../lib/types';
import { Card, PageHeader } from '../../components/ui/Card';
import { Pagination, SearchInput, Segmented } from '../../components/ui/DataTable';
import { EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Feedback';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'order', label: 'Orders' },
  { value: 'payment', label: 'Payments' },
  { value: 'customer', label: 'Customers' },
  { value: 'service', label: 'Pricing' },
  { value: 'user', label: 'Users' },
  { value: 'settings', label: 'Settings' },
  { value: 'auth', label: 'Sign-ins' },
];

const ICON: Record<string, typeof Activity> = { order: ShoppingBag, payment: CreditCard, customer: Users, service: Tags, addon: Tags, user: UserCog, settings: Settings, auth: LogIn, payment_method: CreditCard };

export function ActivityLogsPage() {
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q, 300);
  const { data, loading, error, reload } = useApiQuery<Paginated<ActivityLog>>('/activity-logs', { q: debounced || undefined, action: action || undefined, page }, (r) => r);

  return (
    <>
      <PageHeader title="Activity logs" description="Audit trail of important actions — who did what, and when." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 lg:flex-row lg:items-center dark:border-ink-800">
          <SearchInput value={q} onChange={(v) => (setQ(v), setPage(1))} placeholder="Search descriptions" className="lg:max-w-sm lg:flex-1" />
          <Segmented className="lg:ml-auto" value={action} onChange={(v) => (setAction(v), setPage(1))} options={FILTERS} />
        </div>
        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingBlock />
        ) : data?.data.length === 0 ? (
          <EmptyState title="No activity found" />
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {data?.data.map((log) => {
              const Icon = ICON[log.action.split('.')[0]] ?? Activity;
              return (
                <li key={log.id} className="flex items-start gap-4 px-5 py-3.5">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-800 dark:text-ink-100">{log.description}</p>
                    <p className="text-[12.5px] text-ink-500">
                      {log.user?.name ?? 'System'} · {formatFull(log.created_at)}
                      {log.ip_address && ` · ${log.ip_address}`}
                    </p>
                  </div>
                  <code className="hidden rounded-md bg-ink-100 px-2 py-0.5 text-[11.5px] text-ink-500 sm:block dark:bg-ink-800">{log.action}</code>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
