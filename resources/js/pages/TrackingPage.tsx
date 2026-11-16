import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Clock, HandPlatter, RefreshCw, Scale, AlertTriangle } from 'lucide-react';
import { api, toApiError } from '../lib/api';
import { P, useAuth } from '../lib/auth';
import { cn, formatTime, peso, relativeTime } from '../lib/format';
import { useApiQuery, useDebounce } from '../lib/hooks';
import { nextStatus, STATUS_LABELS, STATUS_STYLE } from '../lib/status';
import { useToast } from '../lib/toast';
import type { Order, OrderStatus, Paginated } from '../lib/types';
import { PageHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/DataTable';
import { PaymentBadge } from '../components/ui/Badge';
import { ErrorState, Skeleton } from '../components/ui/Feedback';
import { PaymentModal, StatusModal } from '../components/orders/OrderActions';

const COLUMNS: OrderStatus[] = ['received', 'washing', 'drying', 'folding', 'ready_for_pickup'];

/** Kanban-style board for attendants: one tap moves laundry to the next stage. */
export function TrackingPage() {
  const { can } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const { data, loading, error, reload, setData } = useApiQuery<Paginated<Order>>('/orders', { active: 1, per_page: 200, sort: 'expected', q: debounced || undefined }, (r) => r);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [releasing, setReleasing] = useState<Order | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, Order[]> = Object.fromEntries(COLUMNS.map((c) => [c, []]));
    data?.data.forEach((o) => map[o.status]?.push(o));
    return map;
  }, [data]);

  const replace = (order: Order) => {
    if (!data) return;
    const stillActive = COLUMNS.includes(order.status);
    setData({ ...data, data: stillActive ? data.data.map((o) => (o.id === order.id ? order : o)) : data.data.filter((o) => o.id !== order.id) });
  };

  const advance = async (order: Order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    if (next === 'released') {
      if (Number(order.balance) > 0 && can(P.PaymentsCreate)) setPaying(order);
      else setReleasing(order);
      return;
    }
    setBusyId(order.id);
    try {
      const res = await api.post(`/orders/${order.id}/status`, { status: next });
      replace(res.data.data);
      toast.success(`${order.order_number} → ${STATUS_LABELS[next]}`);
    } catch (e) {
      toast.error('Status not updated', toApiError(e).message);
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Laundry tracking"
        description="Move each basket through the shop. Overdue orders are flagged."
        actions={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Find order or customer" className="w-64" />
            <Button variant="secondary" icon={<RefreshCw className={cn('size-4', loading && 'animate-spin')} />} onClick={reload}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="scrollbar-thin -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {COLUMNS.map((status) => {
          const orders = grouped[status] ?? [];
          const next = nextStatus(status);
          return (
            <section key={status} className="flex w-[290px] shrink-0 snap-start flex-col rounded-2xl bg-ink-100/70 p-2.5 dark:bg-ink-900/60">
              <header className="flex items-center justify-between px-2 pt-1 pb-3">
                <h2 className="flex items-center gap-2 font-bold text-ink-800 dark:text-ink-100">
                  <span className={cn('size-2.5 rounded-full', STATUS_STYLE[status].dot)} />
                  {STATUS_LABELS[status]}
                </h2>
                <span className="num rounded-lg bg-white px-2 py-0.5 text-[12px] font-bold text-ink-600 shadow-xs dark:bg-ink-800 dark:text-ink-300">{orders.length}</span>
              </header>

              <div className="scrollbar-thin flex max-h-[calc(100dvh-260px)] min-h-[200px] flex-col gap-2.5 overflow-y-auto">
                {loading && !data
                  ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl bg-white dark:bg-ink-800" />)
                  : orders.map((o) => {
                      const overdue = o.expected_at && new Date(o.expected_at).getTime() < now && status !== 'ready_for_pickup';
                      return (
                        <article key={o.id} className="rounded-xl border border-ink-200/70 bg-white p-3.5 shadow-card dark:border-ink-700 dark:bg-ink-800">
                          <div className="flex items-start justify-between gap-2">
                            <Link to={`/orders/${o.id}`} className="num text-[13.5px] font-bold text-ink-900 hover:text-brand-700 dark:text-white">
                              {o.order_number.split('-').slice(-2).join('-')}
                            </Link>
                            {can(P.PaymentsView) && <PaymentBadge status={o.payment_status} />}
                          </div>
                          <p className="mt-1 truncate font-semibold text-ink-700 dark:text-ink-200">{o.customer?.name}</p>
                          <div className={cn('mt-2 flex items-center gap-1.5 text-[12.5px]', overdue ? 'font-semibold text-rose-600' : 'text-ink-500')}>
                            {overdue ? <AlertTriangle className="size-3.5" /> : <Clock className="size-3.5" />}
                            {overdue ? `Overdue · due ${relativeTime(o.expected_at)}` : `Due ${relativeTime(o.expected_at)} · ${formatTime(o.expected_at)}`}
                          </div>
                          {o.notes && <p className="mt-2 line-clamp-2 rounded-lg bg-amber-50 px-2 py-1 text-[12px] text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{o.notes}</p>}
                          {can(P.PaymentsView) && Number(o.balance) > 0 && <p className="num mt-2 text-[12px] font-semibold text-amber-600">Balance {peso(o.balance)}</p>}
                          {next && (next !== 'released' || can(P.OrdersRelease)) && (
                            <Button
                              size="sm"
                              variant={next === 'released' ? 'success' : 'outline'}
                              className="mt-3 w-full"
                              loading={busyId === o.id}
                              onClick={() => advance(o)}
                              icon={next === 'released' ? <HandPlatter className="size-4" /> : <ArrowRight className="size-4" />}
                            >
                              {next === 'released' ? 'Release' : STATUS_LABELS[next]}
                            </Button>
                          )}
                        </article>
                      );
                    })}
                {!loading && orders.length === 0 && (
                  <div className="grid flex-1 place-items-center rounded-xl border-2 border-dashed border-ink-200 py-10 text-center text-[13px] text-ink-400 dark:border-ink-700">
                    <span>
                      <Scale className="mx-auto mb-1 size-5" />
                      Nothing here
                    </span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {paying && (
        <PaymentModal
          order={paying}
          open
          onClose={() => setPaying(null)}
          onDone={(o) => {
            replace(o);
            if (Number(o.balance) === 0) setReleasing(o);
          }}
        />
      )}
      {releasing && <StatusModal order={releasing} open target="released" options={['released']} onClose={() => setReleasing(null)} onDone={replace} />}
    </>
  );
}
