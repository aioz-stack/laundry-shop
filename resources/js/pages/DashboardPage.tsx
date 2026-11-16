import { Link, useNavigate } from 'react-router';
import { ArrowUpRight, Banknote, ClipboardList, Hourglass, PackageCheck, ScanLine, WalletCards, Waves } from 'lucide-react';
import { P, useAuth } from '../lib/auth';
import { useApiQuery } from '../lib/hooks';
import { peso, pesoShort, relativeTime } from '../lib/format';
import { STATUS_STYLE } from '../lib/status';
import type { DashboardData } from '../lib/types';
import { Card, CardHeader, PageHeader, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Chart } from '../components/ui/Chart';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/Feedback';
import { PaymentBadge, StatusBadge } from '../components/ui/Badge';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiQuery<DashboardData>('/dashboard');
  const money = can(P.PaymentsView);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;

  const stats = data?.stats;
  const chart = data?.sales_chart ?? [];
  const overview = data?.status_overview ?? [];
  const activeTotal = overview.reduce((s, o) => s + o.count, 0);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(' ')[0]}`}
        description="Here's what's happening at the shop today."
        actions={
          can(P.OrdersCreate) && (
            <Link to="/pos">
              <Button size="lg" icon={<ScanLine className="size-[18px]" />}>
                New Order
              </Button>
            </Link>
          )
        }
      />

      <div className={`grid gap-4 sm:grid-cols-2 ${money ? 'xl:grid-cols-4' : 'xl:grid-cols-4'}`}>
        {loading && !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-2xl" />)
        ) : (
          <>
            {money && <StatCard label="Today's collections" value={peso(stats?.today_sales)} icon={<Banknote className="size-5" />} tone="emerald" hint={`Order value ${peso(stats?.today_order_value)}`} to="/payments" />}
            <StatCard label="Orders today" value={stats?.today_orders ?? 0} icon={<ClipboardList className="size-5" />} tone="brand" hint={`${stats?.pending_orders ?? 0} waiting to be washed`} to="/orders" />
            <StatCard label="In process" value={stats?.processing_orders ?? 0} icon={<Waves className="size-5" />} tone="sky" hint="Washing, drying & folding" to="/tracking" />
            <StatCard label="Ready for pickup" value={stats?.ready_orders ?? 0} icon={<PackageCheck className="size-5" />} tone="violet" hint="Waiting for customers" to="/orders?status=ready_for_pickup" />
            {!money && <StatCard label="Received" value={stats?.pending_orders ?? 0} icon={<Hourglass className="size-5" />} tone="amber" hint="Not started yet" to="/tracking" />}
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {money && (
          <Card className="xl:col-span-2">
            <CardHeader
              title="Sales overview"
              description="Money collected vs. order value — last 14 days"
              action={
                stats?.unpaid_balance && (
                  <span className="hidden items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-[12.5px] font-semibold text-amber-700 sm:flex dark:bg-amber-500/10 dark:text-amber-300">
                    <WalletCards className="size-4" />
                    {peso(stats.unpaid_balance)} unpaid · {stats.unpaid_orders} orders
                  </span>
                )
              }
            />
            <div className="px-3 pt-2 pb-3">
              {loading && !data ? (
                <Skeleton className="m-3 h-[290px]" />
              ) : (
                <Chart
                  className="h-[310px]"
                  options={{
                    chart: { type: 'area', height: 310 },
                    series: [
                      { name: 'Collected', data: chart.map((r) => Number(r.collected)) },
                      { name: 'Order value', data: chart.map((r) => Number(r.order_value)) },
                    ],
                    colors: ['#0e7890', '#a3e6ed'],
                    stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 5] },
                    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 95] } },
                    dataLabels: { enabled: false },
                    legend: { position: 'top', horizontalAlign: 'right', fontWeight: 600, markers: { size: 6 } },
                    xaxis: {
                      categories: chart.map((r) => r.label.replace(/, \d{4}$/, '')),
                      axisBorder: { show: false },
                      axisTicks: { show: false },
                      labels: { rotate: 0, hideOverlappingLabels: true },
                    },
                    yaxis: { labels: { formatter: (v: number) => pesoShort(v) } },
                    tooltip: { y: { formatter: (v: number) => peso(v) } },
                  }}
                />
              )}
            </div>
          </Card>
        )}

        <Card className={money ? '' : 'xl:col-span-3'}>
          <CardHeader title="Laundry in the shop" description={`${activeTotal} active orders`} />
          <div className="p-5">
            {activeTotal === 0 && !loading ? (
              <EmptyState title="The shop is clear" description="No active laundry right now." className="py-6" />
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  {overview.map((o) =>
                    o.count > 0 ? <div key={o.status} style={{ width: `${(o.count / Math.max(activeTotal, 1)) * 100}%`, background: STATUS_STYLE[o.status].hex }} title={`${o.label}: ${o.count}`} /> : null,
                  )}
                </div>
                <ul className="mt-5 space-y-1">
                  {overview.map((o) => (
                    <li key={o.status}>
                      <Link to={`/orders?status=${o.status}`} className="flex items-center justify-between rounded-xl px-2.5 py-2.5 hover:bg-ink-50 dark:hover:bg-ink-800/60">
                        <span className="flex items-center gap-3 font-semibold text-ink-700 dark:text-ink-200">
                          <span className="size-2.5 rounded-full" style={{ background: STATUS_STYLE[o.status].hex }} />
                          {o.label}
                        </span>
                        <span className="num text-[15px] font-bold text-ink-900 dark:text-white">{o.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className={money ? 'xl:col-span-3' : 'xl:col-span-5'}>
          <CardHeader
            title="Recent orders"
            action={
              <Link to="/orders" className="flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700">
                View all <ArrowUpRight className="size-4" />
              </Link>
            }
          />
          {data && data.recent_orders.length === 0 ? (
            <EmptyState title="No orders yet" description="Orders created at the POS will show here." />
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {(data?.recent_orders ?? []).map((o) => (
                <li key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="flex cursor-pointer items-center gap-4 px-5 py-3.5 hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                  <div className="min-w-0 flex-1">
                    <p className="num font-bold text-ink-900 dark:text-white">{o.order_number}</p>
                    <p className="truncate text-[13px] text-ink-500">
                      {o.customer?.name} · {relativeTime(o.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                  <div className="hidden w-28 text-right sm:block">
                    <p className="num font-bold text-ink-900 dark:text-white">{peso(o.total)}</p>
                    <PaymentBadge status={o.payment_status} />
                  </div>
                </li>
              ))}
              {loading && !data && Array.from({ length: 5 }).map((_, i) => <li key={i} className="px-5 py-4"><Skeleton className="h-9" /></li>)}
            </ul>
          )}
        </Card>

        {money && (
          <Card className="xl:col-span-2">
            <CardHeader
              title="Recent payments"
              action={
                <Link to="/payments" className="flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:text-brand-700">
                  View all <ArrowUpRight className="size-4" />
                </Link>
              }
            />
            {data && data.recent_payments.length === 0 ? (
              <EmptyState title="No payments yet" />
            ) : (
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {(data?.recent_payments ?? []).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-100 text-[11px] font-extrabold text-ink-600 uppercase dark:bg-ink-800 dark:text-ink-300">
                      {p.method?.code === 'cash' ? '₱' : p.method?.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink-800 dark:text-ink-100">{p.order?.customer_name ?? p.order?.order_number}</p>
                      <p className="text-[12.5px] text-ink-500">
                        {p.method?.name} · {relativeTime(p.paid_at)}
                      </p>
                    </div>
                    <span className={`num font-bold ${p.type === 'refund' ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {p.type === 'refund' ? '−' : '+'}
                      {peso(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
