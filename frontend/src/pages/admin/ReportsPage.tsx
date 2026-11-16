import { useMemo, useState } from 'react';
import { Banknote, ClipboardCheck, Download, Printer, ReceiptText, TrendingUp, WalletCards, XCircle } from 'lucide-react';
import { downloadFile, toApiError } from '../../lib/api';
import { cn, isoDate, peso, pesoShort } from '../../lib/format';
import { useApiQuery } from '../../lib/hooks';
import { STATUS_STYLE } from '../../lib/status';
import { useToast } from '../../lib/toast';
import type { OrderStatus, Payment } from '../../lib/types';
import { Card, CardHeader, PageHeader, StatCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Chart } from '../../components/ui/Chart';
import { Segmented } from '../../components/ui/DataTable';
import { Input } from '../../components/ui/Field';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback';

type Tab = 'sales' | 'orders' | 'payments';
type Preset = 'today' | 'week' | 'month' | 'custom';

interface SalesReport {
  totals: { orders_count: number; order_value: string; discounts: string; collected: string; outstanding: string };
  rows: Array<{ period: string; label: string; orders_count: number; order_value: string; discounts: string; collected: string }>;
}
interface OrdersReport {
  totals: { total_orders: number; completed_orders: number; cancelled_orders: number; active_orders: number; order_value: string; average_order_value: string };
  by_status: Array<{ status: OrderStatus; label: string; count: number }>;
  by_service: Array<{ service_name: string; pricing_type: string; orders_count: number; quantity: string; revenue: string }>;
}
interface PaymentsReport {
  totals: { collected: string; transactions: number };
  by_method: Array<{ payment_method_id: number; name: string; code: string; transactions: number; received: string; refunded: string; net: string }>;
  transactions: Payment[];
}

function rangeFor(preset: Preset): { from: string; to: string } {
  const now = new Date();
  if (preset === 'today') return { from: isoDate(now), to: isoDate(now) };
  if (preset === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return { from: isoDate(start), to: isoDate(now) };
  }
  return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) };
}

export function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('sales');
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState(rangeFor('month'));
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [exporting, setExporting] = useState(false);

  const range = preset === 'custom' ? custom : rangeFor(preset);
  const params = useMemo(() => ({ from: range.from, to: range.to, ...(tab === 'sales' ? { group_by: groupBy } : {}) }), [range.from, range.to, tab, groupBy]);
  const { data, loading, error, reload } = useApiQuery<any>(`/reports/${tab}`, params);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadFile(`/reports/${tab}`, { ...params, format: 'csv' }, `${tab}-report.csv`);
    } catch (e) {
      toast.error('Export failed', toApiError(e).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${new Date(range.from).toLocaleDateString('en-PH', { dateStyle: 'medium' })} – ${new Date(range.to).toLocaleDateString('en-PH', { dateStyle: 'medium' })}`}
        actions={
          <div className="no-print flex gap-2">
            <Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>
              Print
            </Button>
            <Button variant="secondary" icon={<Download className="size-4" />} loading={exporting} onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="no-print mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sales', label: 'Sales' },
            { value: 'orders', label: 'Laundry orders' },
            { value: 'payments', label: 'Payments' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Segmented
            value={preset}
            onChange={setPreset}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This week' },
              { value: 'month', label: 'This month' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-10 w-40" aria-label="From" />
              <span className="text-ink-400">–</span>
              <Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-10 w-40" aria-label="To" />
            </div>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock />
      ) : !data ? null : tab === 'sales' && data.rows ? (
        <SalesView report={data as SalesReport} groupBy={groupBy} onGroupBy={setGroupBy} loading={loading} />
      ) : tab === 'orders' && data.by_status ? (
        <OrdersView report={data as OrdersReport} />
      ) : tab === 'payments' && data.by_method ? (
        <PaymentsView report={data as PaymentsReport} />
      ) : (
        <LoadingBlock />
      )}
    </>
  );
}

function SalesView({ report, groupBy, onGroupBy, loading }: { report: SalesReport; groupBy: 'day' | 'week' | 'month'; onGroupBy: (v: 'day' | 'week' | 'month') => void; loading: boolean }) {
  const t = report.totals;
  return (
    <div className={cn('space-y-6', loading && 'opacity-70')}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Money collected" value={peso(t.collected)} icon={<Banknote className="size-5" />} tone="emerald" hint="Payments minus refunds" />
        <StatCard label="Order value" value={peso(t.order_value)} icon={<TrendingUp className="size-5" />} hint={`${t.orders_count} orders`} />
        <StatCard label="Outstanding balances" value={peso(t.outstanding)} icon={<WalletCards className="size-5" />} tone="amber" hint="From orders in this period" />
        <StatCard label="Discounts given" value={peso(t.discounts)} icon={<ReceiptText className="size-5" />} tone="violet" />
      </div>
      <Card>
        <CardHeader
          title="Collections vs. order value"
          description="Collections count only money actually received."
          action={
            <Segmented
              value={groupBy}
              onChange={onGroupBy}
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
                { value: 'month', label: 'Monthly' },
              ]}
            />
          }
        />
        <div className="px-3 py-3">
          <Chart
            className="h-[300px]"
            options={{
              chart: { type: 'bar', height: 300 },
              series: [
                { name: 'Collected', data: report.rows.map((r) => Number(r.collected)) },
                { name: 'Order value', data: report.rows.map((r) => Number(r.order_value)) },
              ],
              colors: ['#0e7890', '#a3e6ed'],
              plotOptions: { bar: { borderRadius: 4, columnWidth: report.rows.length > 20 ? '70%' : '45%' } },
              dataLabels: { enabled: false },
              legend: { position: 'top', horizontalAlign: 'right', fontWeight: 600 },
              xaxis: { categories: report.rows.map((r) => r.label.replace(/, \d{4}$/, '')), axisBorder: { show: false }, axisTicks: { show: false }, labels: { hideOverlappingLabels: true } },
              yaxis: { labels: { formatter: (v: number) => pesoShort(v) } },
              tooltip: { y: { formatter: (v: number) => peso(v) } },
            }}
          />
        </div>
      </Card>
      <Card>
        <CardHeader title="Breakdown" />
        <ReportTable
          head={['Period', 'Orders', 'Order value', 'Discounts', 'Collected']}
          rows={report.rows.map((r) => [r.label, r.orders_count, peso(r.order_value), peso(r.discounts), peso(r.collected)])}
          foot={['Total', t.orders_count, peso(t.order_value), peso(t.discounts), peso(t.collected)]}
        />
      </Card>
    </div>
  );
}

function OrdersView({ report }: { report: OrdersReport }) {
  const t = report.totals;
  const visible = report.by_status.filter((s) => s.count > 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value={t.total_orders} icon={<ReceiptText className="size-5" />} />
        <StatCard label="Completed (released)" value={t.completed_orders} icon={<ClipboardCheck className="size-5" />} tone="emerald" />
        <StatCard label="Cancelled" value={t.cancelled_orders} icon={<XCircle className="size-5" />} tone="rose" />
        <StatCard label="Average order value" value={peso(t.average_order_value)} icon={<TrendingUp className="size-5" />} tone="violet" hint={`Total ${peso(t.order_value)}`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader title="Orders by status" />
          <div className="p-4">
            {visible.length ? (
              <Chart
                className="h-[280px]"
                options={{
                  chart: { type: 'donut', height: 280 },
                  series: visible.map((s) => s.count),
                  labels: visible.map((s) => s.label),
                  colors: visible.map((s) => STATUS_STYLE[s.status].hex),
                  legend: { position: 'bottom', fontWeight: 600 },
                  dataLabels: { enabled: false },
                  stroke: { width: 2 },
                  plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Orders', fontWeight: 600 } } } } },
                }}
              />
            ) : (
              <p className="py-16 text-center text-ink-500">No orders in this period.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Revenue by service" description="Excludes cancelled orders" />
          <ReportTable head={['Service', 'Order lines', 'Quantity', 'Revenue']} rows={report.by_service.map((s) => [s.service_name, s.orders_count, `${Number(s.quantity)} ${s.pricing_type === 'per_kg' ? 'kg' : s.pricing_type === 'per_piece' ? 'pcs' : 'loads'}`, peso(s.revenue)])} />
        </Card>
      </div>
    </div>
  );
}

function PaymentsView({ report }: { report: PaymentsReport }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total collected" value={peso(report.totals.collected)} icon={<Banknote className="size-5" />} tone="emerald" hint={`${report.totals.transactions} transactions`} />
        {report.by_method.slice(0, 3).map((m) => (
          <StatCard key={m.payment_method_id} label={m.name} value={peso(m.net)} icon={<WalletCards className="size-5" />} tone="sky" hint={`${m.transactions} transactions`} />
        ))}
      </div>
      <Card>
        <CardHeader title="Collections by payment method" />
        <ReportTable
          head={['Method', 'Transactions', 'Received', 'Refunded', 'Net collected']}
          rows={report.by_method.map((m) => [m.name, m.transactions, peso(m.received), peso(m.refunded), peso(m.net)])}
          foot={['Total', report.totals.transactions, '', '', peso(report.totals.collected)]}
        />
      </Card>
    </div>
  );
}

function ReportTable({ head, rows, foot }: { head: string[]; rows: Array<Array<string | number>>; foot?: Array<string | number> }) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[520px] text-[14px]">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/70 dark:border-ink-800 dark:bg-ink-950/40">
            {head.map((h, i) => (
              <th key={h} className={cn('px-5 py-2.5 text-[11.5px] font-bold tracking-wide text-ink-500 uppercase', i === 0 ? 'text-left' : 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-ink-100 last:border-0 dark:border-ink-800">
              {r.map((c, i) => (
                <td key={i} className={cn('num px-5 py-3', i === 0 ? 'text-left font-semibold text-ink-800 dark:text-ink-100' : 'text-right')}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-5 py-10 text-center text-ink-500">
                No data for this period.
              </td>
            </tr>
          )}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="border-t-2 border-ink-200 bg-ink-50/60 font-extrabold dark:border-ink-700 dark:bg-ink-950/30">
              {foot.map((c, i) => (
                <td key={i} className={cn('num px-5 py-3 text-ink-900 dark:text-white', i === 0 ? 'text-left' : 'text-right')}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
