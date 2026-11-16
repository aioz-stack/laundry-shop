import { useState } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus, Users } from 'lucide-react';
import { P, useAuth } from '../lib/auth';
import { formatDate, initials, peso, relativeTime } from '../lib/format';
import { useApiQuery, useDebounce } from '../lib/hooks';
import type { Customer, Paginated } from '../lib/types';
import { Card, PageHeader } from '../components/ui/Card';
import { DataTable, Pagination, SearchInput, Segmented, type Column } from '../components/ui/DataTable';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState } from '../components/ui/Feedback';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';

export function CustomersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'balance'>('all');
  const [creating, setCreating] = useState(false);
  const debounced = useDebounce(q, 300);

  const { data, loading, error, reload } = useApiQuery<Paginated<Customer>>('/customers', { q: debounced || undefined, page, with_balance: filter === 'balance' ? 1 : undefined, per_page: 15 }, (r) => r);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{initials(c.name)}</span>
          <div>
            <p className="font-semibold text-ink-900 dark:text-white">{c.name}</p>
            <p className="text-[12.5px] text-ink-500">{c.customer_code}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (c) => <span className="num font-medium">{c.phone}</span> },
    { key: 'orders', header: 'Orders', align: 'right', cell: (c) => <span className="num">{c.orders_count}</span> },
    { key: 'spent', header: 'Total paid', align: 'right', hideOnMobile: true, cell: (c) => <span className="num font-semibold">{peso(c.total_spent)}</span> },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      cell: (c) => (Number(c.outstanding_balance) > 0 ? <span className="num font-bold text-amber-600">{peso(c.outstanding_balance)}</span> : <span className="text-ink-400">—</span>),
    },
    { key: 'last', header: 'Last order', hideOnMobile: true, cell: (c) => <span className="text-[13px] text-ink-500">{c.last_order_at ? relativeTime(c.last_order_at) : '—'}</span> },
    { key: 'since', header: 'Registered', hideOnMobile: true, cell: (c) => <span className="text-[13px] text-ink-500">{formatDate(c.created_at)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Look up customers by phone, see their history and balances."
        actions={
          can(P.CustomersManage) && (
            <Button icon={<UserPlus className="size-4" />} onClick={() => setCreating(true)}>
              New customer
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center dark:border-ink-800">
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Phone number, name or customer ID"
            className="sm:max-w-sm sm:flex-1"
            autoFocus
          />
          <Segmented
            className="sm:ml-auto"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'All customers' },
              { value: 'balance', label: 'With unpaid balance' },
            ]}
          />
        </div>
        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data}
              loading={loading}
              rowKey={(c) => c.id}
              onRowClick={(c) => navigate(`/customers/${c.id}`)}
              empty={
                <EmptyState
                  icon={<Users className="size-6" />}
                  title={q ? 'No matching customers' : 'No customers yet'}
                  description={q ? 'Check the number or register them as a new customer.' : 'Customers you register will appear here.'}
                  action={can(P.CustomersManage) && <Button variant="secondary" onClick={() => setCreating(true)}>Register customer</Button>}
                />
              }
            />
            <Pagination meta={data?.meta} onPage={setPage} />
          </>
        )}
      </Card>
      <CustomerFormModal open={creating} onClose={() => setCreating(false)} onSaved={(c) => navigate(`/customers/${c.id}`)} initial={/^[\d+\s()-]+$/.test(q) ? { phone: q } : { name: q }} />
    </>
  );
}
