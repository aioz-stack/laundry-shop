import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CalendarRange, ClipboardList, ScanLine } from 'lucide-react';
import { P, useAuth } from '../lib/auth';
import { formatDateTime, peso, relativeTime } from '../lib/format';
import { useApiQuery, useDebounce } from '../lib/hooks';
import { PAYMENT_LABELS, STATUS_LABELS } from '../lib/status';
import type { Order, OrderStatus, Paginated, PaymentStatus } from '../lib/types';
import { Card, PageHeader } from '../components/ui/Card';
import { DataTable, Pagination, SearchInput, Segmented, type Column } from '../components/ui/DataTable';
import { PaymentBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { EmptyState, ErrorState } from '../components/ui/Feedback';

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'active', label: 'In shop' },
  ...(['received', 'washing', 'drying', 'folding', 'ready_for_pickup', 'released', 'cancelled'] as OrderStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

export function OrdersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const payment = params.get('payment_status') ?? '';
  const from = params.get('date_from') ?? '';
  const to = params.get('date_to') ?? '';
  const page = Number(params.get('page') ?? 1);
  const debouncedQ = useDebounce(q, 300);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const query = useMemo(
    () => ({
      q: debouncedQ || undefined,
      status: status && status !== 'active' ? status : undefined,
      active: status === 'active' ? 1 : undefined,
      payment_status: payment || undefined,
      date_from: from || undefined,
      date_to: to || undefined,
      page,
      per_page: 15,
    }),
    [debouncedQ, status, payment, from, to, page],
  );

  const { data, loading, error, reload } = useApiQuery<Paginated<Order>>('/orders', query, (r) => r);

  const columns: Column<Order>[] = [
    {
      key: 'order',
      header: 'Order',
      cell: (o) => (
        <div>
          <p className="num font-bold text-ink-900 dark:text-white">{o.order_number}</p>
          <p className="text-[12.5px] text-ink-500">{formatDateTime(o.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (o) => (
        <div>
          <p className="font-semibold text-ink-800 dark:text-ink-100">{o.customer?.name}</p>
          <p className="num text-[12.5px] text-ink-500">{o.customer?.phone}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Laundry', cell: (o) => <StatusBadge status={o.status} /> },
    { key: 'pickup', header: 'Pickup', hideOnMobile: true, cell: (o) => <span className="text-[13px] text-ink-600 dark:text-ink-300">{o.status === 'released' ? `Released ${relativeTime(o.released_at)}` : relativeTime(o.expected_at)}</span> },
    { key: 'payment', header: 'Payment', cell: (o) => <PaymentBadge status={o.payment_status} /> },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (o) => (
        <div>
          <p className="num font-bold text-ink-900 dark:text-white">{peso(o.total)}</p>
          {Number(o.balance) > 0 && <p className="num text-[12px] font-semibold text-amber-600">Bal {peso(o.balance)}</p>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        description="Search, filter and manage every laundry order."
        actions={
          can(P.OrdersCreate) && (
            <Link to="/pos">
              <Button icon={<ScanLine className="size-4" />}>New order</Button>
            </Link>
          )
        }
      />

      <Card>
        <div className="space-y-3 border-b border-ink-100 p-4 dark:border-ink-800">
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchInput value={q} onChange={(v) => update({ q: v })} placeholder="Order number, customer name or phone" className="lg:max-w-sm lg:flex-1" />
            <Select value={payment} onChange={(e) => update({ payment_status: e.target.value })} className="lg:w-48">
              <option value="">Any payment</option>
              {(Object.keys(PAYMENT_LABELS) as PaymentStatus[]).map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_LABELS[p]}
                </option>
              ))}
            </Select>
            <div className="flex items-center gap-2">
              <CalendarRange className="size-4 shrink-0 text-ink-400" />
              <Input type="date" value={from} onChange={(e) => update({ date_from: e.target.value })} aria-label="From date" className="lg:w-40" />
              <span className="text-ink-400">–</span>
              <Input type="date" value={to} onChange={(e) => update({ date_to: e.target.value })} aria-label="To date" className="lg:w-40" />
            </div>
          </div>
          <Segmented value={status} onChange={(v) => update({ status: v })} options={STATUS_TABS} />
        </div>

        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data}
              loading={loading}
              rowKey={(o) => o.id}
              onRowClick={(o) => navigate(`/orders/${o.id}`)}
              empty={<EmptyState icon={<ClipboardList className="size-6" />} title="No orders found" description="Try a different search or clear the filters." />}
            />
            <Pagination meta={data?.meta} onPage={(p) => update({ page: String(p) })} />
          </>
        )}
      </Card>
    </>
  );
}
