import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CreditCard } from 'lucide-react';
import { formatFull, isoDate, peso } from '../lib/format';
import { useApiQuery, useDebounce } from '../lib/hooks';
import type { Paginated, Payment, PaymentMethod } from '../lib/types';
import { Card, PageHeader } from '../components/ui/Card';
import { DataTable, Pagination, SearchInput, type Column } from '../components/ui/DataTable';
import { Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { EmptyState, ErrorState } from '../components/ui/Feedback';

export function PaymentsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [methodId, setMethodId] = useState('');
  const [from, setFrom] = useState(isoDate());
  const [to, setTo] = useState(isoDate());
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q, 300);
  const methods = useApiQuery<PaymentMethod[]>('/payment-methods');

  const params = useMemo(() => ({ q: debounced || undefined, payment_method_id: methodId || undefined, date_from: from || undefined, date_to: to || undefined, page, per_page: 20 }), [debounced, methodId, from, to, page]);
  const { data, loading, error, reload } = useApiQuery<Paginated<Payment>>('/payments', params, (r) => r);

  const columns: Column<Payment>[] = [
    {
      key: 'num',
      header: 'Payment',
      cell: (p) => (
        <div>
          <p className="num font-bold text-ink-900 dark:text-white">{p.payment_number}</p>
          <p className="text-[12.5px] text-ink-500">{formatFull(p.paid_at)}</p>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      cell: (p) => (
        <div>
          <p className="num font-semibold">{p.order?.order_number}</p>
          <p className="text-[12.5px] text-ink-500">{p.order?.customer_name}</p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (p) => (
        <span className="flex items-center gap-2">
          {p.method?.name}
          {p.type === 'refund' && <Badge className="bg-rose-50 text-rose-700 ring-rose-200">Refund</Badge>}
        </span>
      ),
    },
    { key: 'ref', header: 'Reference', hideOnMobile: true, cell: (p) => <span className="num text-[13px] text-ink-500">{p.reference_number || '—'}</span> },
    { key: 'by', header: 'Received by', hideOnMobile: true, cell: (p) => <span className="text-[13px]">{p.received_by?.name}</span> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (p) => (
        <span className={`num font-bold ${p.type === 'refund' ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {p.type === 'refund' ? '−' : ''}
          {peso(p.amount)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Payments" description="Every peso received and refunded, with references." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 lg:flex-row lg:items-center dark:border-ink-800">
          <SearchInput value={q} onChange={(v) => (setQ(v), setPage(1))} placeholder="Payment #, reference, order or customer" className="lg:max-w-sm lg:flex-1" />
          <Select value={methodId} onChange={(e) => (setMethodId(e.target.value), setPage(1))} className="lg:w-48">
            <option value="">All methods</option>
            {methods.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} aria-label="From" className="lg:w-40" />
            <span className="text-ink-400">–</span>
            <Input type="date" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} aria-label="To" className="lg:w-40" />
          </div>
        </div>
        {error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data}
              loading={loading}
              rowKey={(p) => p.id}
              onRowClick={(p) => p.order && navigate(`/orders/${p.order.id}`)}
              empty={<EmptyState icon={<CreditCard className="size-6" />} title="No payments in this period" description="Change the dates to see older payments." />}
            />
            <Pagination meta={data?.meta} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
