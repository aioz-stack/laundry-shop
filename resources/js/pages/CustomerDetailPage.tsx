import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Mail, MapPin, Pencil, Phone, ScanLine, Trash2, StickyNote } from 'lucide-react';
import { api, toApiError } from '../lib/api';
import { P, useAuth } from '../lib/auth';
import { formatDate, formatDateTime, initials, peso } from '../lib/format';
import { useApiQuery } from '../lib/hooks';
import { useToast } from '../lib/toast';
import type { Customer, Order } from '../lib/types';
import { Card, CardHeader, PageHeader, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DataTable, type Column } from '../components/ui/DataTable';
import { PaymentBadge, StatusBadge } from '../components/ui/Badge';
import { EmptyState, ErrorState, LoadingBlock } from '../components/ui/Feedback';
import { ConfirmDialog } from '../components/ui/Modal';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import { ClipboardList, Wallet, Banknote } from 'lucide-react';

export function CustomerDetailPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiQuery<{ data: Customer; orders: Order[] }>(`/customers/${id}`, undefined, (r) => r);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock />;
  if (!data) return null;
  const c = data.data;

  const columns: Column<Order>[] = [
    { key: 'num', header: 'Order', cell: (o) => <span className="num font-bold text-ink-900 dark:text-white">{o.order_number}</span> },
    { key: 'date', header: 'Date', cell: (o) => <span className="text-[13px]">{formatDateTime(o.created_at)}</span> },
    { key: 'status', header: 'Laundry', cell: (o) => <StatusBadge status={o.status} /> },
    { key: 'pay', header: 'Payment', cell: (o) => <PaymentBadge status={o.payment_status} /> },
    { key: 'total', header: 'Total', align: 'right', cell: (o) => <span className="num font-semibold">{peso(o.total)}</span> },
    { key: 'bal', header: 'Balance', align: 'right', cell: (o) => (Number(o.balance) > 0 ? <span className="num font-bold text-amber-600">{peso(o.balance)}</span> : <span className="text-ink-400">—</span>) },
  ];

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: c.name }]}
        title={
          <span className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-full bg-brand-600 text-[16px] font-bold text-white">{initials(c.name)}</span>
            {c.name}
          </span>
        }
        description={`${c.customer_code} · Customer since ${formatDate(c.created_at)}`}
        actions={
          <>
            {can(P.CustomersDelete) && c.orders_count === 0 && (
              <Button variant="ghost" className="text-rose-600" icon={<Trash2 className="size-4" />} onClick={() => setDeleting(true)}>
                Delete
              </Button>
            )}
            {can(P.CustomersManage) && (
              <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {can(P.OrdersCreate) && (
              <Link to="/pos">
                <Button icon={<ScanLine className="size-4" />}>New order</Button>
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={c.orders_count ?? 0} icon={<ClipboardList className="size-5" />} />
        <StatCard label="Total paid" value={peso(c.total_spent)} icon={<Banknote className="size-5" />} tone="emerald" />
        <StatCard label="Outstanding balance" value={peso(c.outstanding_balance)} icon={<Wallet className="size-5" />} tone={Number(c.outstanding_balance) > 0 ? 'amber' : 'sky'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="h-fit p-5">
          <p className="eyebrow mb-4">Contact</p>
          <ul className="space-y-3.5 text-[14px]">
            <li className="flex items-center gap-3">
              <Phone className="size-4 text-ink-400" /> <span className="num font-semibold">{c.phone}</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="size-4 text-ink-400" /> {c.email || <span className="text-ink-400">No email</span>}
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 text-ink-400" /> {c.address || <span className="text-ink-400">No address</span>}
            </li>
            {c.notes && (
              <li className="flex items-start gap-3">
                <StickyNote className="mt-0.5 size-4 text-ink-400" /> <span className="text-ink-600 dark:text-ink-300">{c.notes}</span>
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Order history" description="Most recent 50 orders" />
          <DataTable columns={columns} rows={data.orders} rowKey={(o) => o.id} onRowClick={(o) => navigate(`/orders/${o.id}`)} empty={<EmptyState title="No orders yet" />} />
        </Card>
      </div>

      <CustomerFormModal open={editing} customer={c} onClose={() => setEditing(false)} onSaved={() => reload()} />
      <ConfirmDialog
        open={deleting}
        title="Delete customer?"
        message={`${c.name} will be removed. This is only possible because they have no orders.`}
        confirmLabel="Delete customer"
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          try {
            await api.delete(`/customers/${c.id}`);
            toast.success('Customer deleted');
            navigate('/customers');
          } catch (e) {
            toast.error('Could not delete', toApiError(e).message);
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
