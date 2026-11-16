import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowRight, Ban, CalendarClock, HandPlatter, Pencil, Phone, Printer, Undo2, User, Wallet } from 'lucide-react';
import { api, toApiError } from '../lib/api';
import { P, useAuth } from '../lib/auth';
import { cn, formatFull, peso, quantity } from '../lib/format';
import { useApiQuery } from '../lib/hooks';
import { openReceipt } from '../lib/print';
import { nextStatus, STATUS_LABELS } from '../lib/status';
import { useToast } from '../lib/toast';
import type { Order, OrderStatus } from '../lib/types';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PaymentBadge, StatusBadge } from '../components/ui/Badge';
import { ErrorState, LoadingBlock } from '../components/ui/Feedback';
import { Field, Input, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { OrderProgress } from '../components/orders/OrderProgress';
import { PaymentModal, StatusModal } from '../components/orders/OrderActions';

const PROCESSING: OrderStatus[] = ['received', 'washing', 'drying', 'folding', 'ready_for_pickup'];

export function OrderDetailPage() {
  const { id } = useParams();
  const { can, user } = useAuth();
  const toast = useToast();
  const { data: order, loading, error, reload, setData } = useApiQuery<Order>(`/orders/${id}`);

  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<OrderStatus | 'pick' | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading && !order) return <LoadingBlock />;
  if (!order) return null;

  const isFinal = order.status === 'released' || order.status === 'cancelled';
  const next = nextStatus(order.status);
  const canRelease = order.status === 'ready_for_pickup' && can(P.OrdersRelease);
  const canAdvance = next && next !== 'released' && can(P.OrdersStatus) && !isFinal;
  const owner = user?.role === 'owner';
  const pickOptions = owner ? PROCESSING.filter((s) => s !== order.status) : PROCESSING.filter((s) => PROCESSING.indexOf(s) > PROCESSING.indexOf(order.status));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Orders', to: '/orders' }, { label: order.order_number }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="num">{order.order_number}</span>
            <StatusBadge status={order.status} size="lg" />
            <PaymentBadge status={order.payment_status} />
          </span>
        }
        description={`Created ${formatFull(order.created_at)}${order.created_by ? ` by ${order.created_by.name}` : ''}`}
        actions={
          <>
            {can(P.PaymentsView) && (
              <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => openReceipt(order.id)}>
                Print receipt
              </Button>
            )}
            {can(P.OrdersUpdate) && !isFinal && (
              <Button variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-6 p-5 sm:p-6">
        <OrderProgress status={order.status} history={order.status_history} />
        {!isFinal && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-5 dark:border-ink-800">
            {canAdvance && (
              <Button size="lg" onClick={() => setStatusTarget(next)} icon={<ArrowRight className="size-[18px]" />}>
                Mark as {STATUS_LABELS[next]}
              </Button>
            )}
            {canRelease && (
              <Button size="lg" variant="success" onClick={() => setStatusTarget('released')} icon={<HandPlatter className="size-[18px]" />}>
                Release to customer
              </Button>
            )}
            {can(P.PaymentsCreate) && Number(order.balance) > 0 && (
              <Button size="lg" variant="secondary" onClick={() => setPayOpen(true)} icon={<Wallet className="size-[18px]" />}>
                Receive payment
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {can(P.OrdersStatus) && pickOptions.length > 0 && (
                <Button variant="ghost" onClick={() => setStatusTarget('pick')}>
                  Other status…
                </Button>
              )}
              {can(P.OrdersCancel) && (
                <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10" onClick={() => setStatusTarget('cancelled')} icon={<Ban className="size-4" />}>
                  Cancel order
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Laundry items" description={[Number(order.total_weight) > 0 && `${quantity(order.total_weight!, 'kg')}`, order.total_pieces ? `${order.total_pieces} pcs` : null].filter(Boolean).join(' · ') || undefined} />
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {order.items?.map((i) => (
                <div key={i.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900 dark:text-white">{i.service_name}</p>
                    <p className="text-[13px] text-ink-500">
                      {quantity(i.quantity, i.unit)} × {peso(i.unit_price)}
                      {i.billable_quantity !== i.quantity && <span className="font-semibold text-amber-600"> · billed as {quantity(i.billable_quantity, i.unit)} (minimum)</span>}
                    </p>
                  </div>
                  <p className="num font-bold">{peso(i.line_total)}</p>
                </div>
              ))}
              {order.addons?.map((a) => (
                <div key={`a${a.id}`} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-700 dark:text-ink-200">+ {a.addon_name}</p>
                    <p className="text-[13px] text-ink-500">
                      {a.quantity} × {peso(a.unit_price)}
                    </p>
                  </div>
                  <p className="num font-semibold">{peso(a.line_total)}</p>
                </div>
              ))}
            </div>
            <dl className="space-y-1.5 border-t border-ink-100 bg-ink-50/50 px-5 py-4 text-[14px] dark:border-ink-800 dark:bg-ink-950/30">
              <Row label="Subtotal" value={peso(order.subtotal)} />
              {Number(order.discount_amount) > 0 && <Row label={`Discount${order.discount_reason ? ` · ${order.discount_reason}` : ''}`} value={`−${peso(order.discount_amount)}`} className="text-emerald-700 dark:text-emerald-400" />}
              {Number(order.tax_amount) > 0 && <Row label={`Tax (${Number(order.tax_rate)}%)`} value={peso(order.tax_amount)} />}
              <Row label="Total" value={peso(order.total)} className="pt-1 text-[16px] font-extrabold text-ink-900 dark:text-white" />
              <Row label="Paid" value={peso(order.amount_paid)} />
              <Row label="Balance" value={peso(order.balance)} className={cn('font-extrabold', Number(order.balance) > 0 ? 'text-amber-600' : 'text-emerald-600')} />
            </dl>
          </Card>

          {can(P.PaymentsView) && (
            <Card>
              <CardHeader
                title="Payments"
                action={
                  can(P.PaymentsRefund) &&
                  Number(order.amount_paid) > 0 && (
                    <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" />} onClick={() => setRefundOpen(true)}>
                      Refund
                    </Button>
                  )
                }
              />
              {order.payments?.length ? (
                <div className="divide-y divide-ink-100 dark:divide-ink-800">
                  {order.payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-900 dark:text-white">
                          {p.type === 'refund' ? 'Refund' : p.method?.name} <span className="num text-[12.5px] font-medium text-ink-400">{p.payment_number}</span>
                        </p>
                        <p className="text-[13px] text-ink-500">
                          {formatFull(p.paid_at)} · {p.received_by?.name}
                          {p.reference_number && ` · Ref ${p.reference_number}`}
                          {Number(p.change_given) > 0 && ` · tendered ${peso(p.amount_tendered)}, change ${peso(p.change_given)}`}
                        </p>
                        {p.notes && <p className="text-[12.5px] text-ink-400 italic">{p.notes}</p>}
                      </div>
                      <p className={cn('num font-bold', p.type === 'refund' ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400')}>
                        {p.type === 'refund' ? '−' : '+'}
                        {peso(p.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-6 text-center text-ink-500">No payments yet.</p>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <p className="eyebrow mb-3">Customer</p>
            <Link to={`/customers/${order.customer?.id}`} className="group flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <User className="size-5" />
              </span>
              <span>
                <span className="block font-bold text-ink-900 group-hover:text-brand-700 dark:text-white">{order.customer?.name}</span>
                <span className="num flex items-center gap-1 text-[13px] text-ink-500">
                  <Phone className="size-3.5" /> {order.customer?.phone}
                </span>
              </span>
            </Link>
            <div className="mt-5 space-y-3 border-t border-ink-100 pt-4 text-[13.5px] dark:border-ink-800">
              <div className="flex items-start gap-2.5">
                <CalendarClock className="mt-0.5 size-4 text-ink-400" />
                <div>
                  <p className="text-ink-500">Expected pickup</p>
                  <p className="font-semibold text-ink-900 dark:text-white">{formatFull(order.expected_at)}</p>
                </div>
              </div>
              {order.released_at && (
                <div className="flex items-start gap-2.5">
                  <HandPlatter className="mt-0.5 size-4 text-ink-400" />
                  <div>
                    <p className="text-ink-500">Released</p>
                    <p className="font-semibold text-ink-900 dark:text-white">
                      {formatFull(order.released_at)} {order.released_by && `· ${order.released_by.name}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {order.notes && <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{order.notes}</p>}
          </Card>

          <Card>
            <CardHeader title="Status history" />
            <ol className="relative space-y-5 px-5 py-5">
              {[...(order.status_history ?? [])].reverse().map((h, i) => (
                <li key={h.id} className="relative flex gap-3">
                  {i < (order.status_history?.length ?? 0) - 1 && <span className="absolute top-6 bottom-[-20px] left-[5px] w-px bg-ink-200 dark:bg-ink-700" />}
                  <span className={cn('mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-white dark:ring-ink-900', i === 0 ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-600')} />
                  <div>
                    <p className="font-semibold text-ink-900 dark:text-white">{h.from_label ? `${h.from_label} → ${h.to_label}` : h.to_label}</p>
                    <p className="text-[12.5px] text-ink-500">
                      {formatFull(h.created_at)} · {h.user?.name ?? 'System'}
                    </p>
                    {h.remarks && <p className="mt-0.5 text-[13px] text-ink-600 italic dark:text-ink-300">“{h.remarks}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <PaymentModal order={order} open={payOpen} onClose={() => setPayOpen(false)} onDone={setData} />
      <PaymentModal order={order} open={refundOpen} mode="refund" onClose={() => setRefundOpen(false)} onDone={setData} />
      <StatusModal
        order={order}
        open={statusTarget !== null}
        target={statusTarget === 'pick' || statusTarget === null ? undefined : statusTarget}
        options={statusTarget === 'pick' ? pickOptions : statusTarget ? [statusTarget] : []}
        onClose={() => setStatusTarget(null)}
        onDone={setData}
      />
      <EditOrderModal
        order={order}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(o) => {
          setData(o);
          toast.success('Order updated');
        }}
      />
    </>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex justify-between gap-4', className)}>
      <dt className={className ? '' : 'text-ink-500'}>{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditOrderModal({ order, open, onClose, onSaved }: { order: Order; open: boolean; onClose: () => void; onSaved: (o: Order) => void }) {
  const [notes, setNotes] = useState(order.notes ?? '');
  const [expected, setExpected] = useState(toLocalInput(order.expected_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.put(`/orders/${order.id}`, { notes: notes || null, expected_at: expected ? new Date(expected).toISOString() : null });
      onSaved(res.data.data);
      onClose();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={busy}
      title="Edit order details"
      description="Prices and items are locked once an order is saved."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-[13px] font-medium text-rose-600">{error}</p>}
        <Field label="Expected pickup">
          <Input type="datetime-local" value={expected} onChange={(e) => setExpected(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
