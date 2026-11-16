import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Printer, X } from 'lucide-react';
import { useApiQuery } from '../lib/hooks';
import { formatFull, peso, quantity } from '../lib/format';
import type { Receipt } from '../lib/types';
import { Button } from '../components/ui/Button';
import { ErrorState, LoadingBlock } from '../components/ui/Feedback';

/**
 * Thermal receipt (58mm / 80mm) rendered from GET /orders/{id}/receipt.
 * Uses plain monospace-friendly markup so it prints crisply on POS printers.
 */
export function ReceiptPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, error, loading, reload } = useApiQuery<Receipt>(`/orders/${id}/receipt`);

  useEffect(() => {
    if (data && params.get('autoprint')) {
      const t = setTimeout(() => window.print(), 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [data, params]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !data) return <LoadingBlock label="Preparing receipt…" />;

  return (
    <div className="min-h-dvh bg-ink-100 py-6 print:bg-white print:py-0 dark:bg-ink-950">
      <style>{`@media print { @page { size: ${data.paper_width}mm auto; margin: 0; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-sm justify-center gap-2 px-4">
        <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print
        </Button>
        <Button variant="secondary" icon={<X className="size-4" />} onClick={() => (window.opener ? window.close() : window.history.back())}>
          Close
        </Button>
      </div>
      <ReceiptView receipt={data} />
    </div>
  );
}

export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const { order, shop } = receipt;
  const width = receipt.paper_width === '58' ? '58mm' : '80mm';
  const small = receipt.paper_width === '58';
  const lastPayment = order.payments?.filter((p) => p.type === 'payment').at(-1);

  const Line = ({ left, right, bold }: { left: React.ReactNode; right: React.ReactNode; bold?: boolean }) => (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold' : ''}`}>
      <span className="min-w-0">{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  );
  const Rule = () => <div className="my-2 border-t border-dashed border-black" />;

  return (
    <div
      className="mx-auto bg-white text-black shadow-pop print:shadow-none"
      style={{ width, padding: small ? '3mm' : '5mm', fontFamily: 'ui-monospace, "Courier New", monospace', fontSize: small ? '10px' : '11.5px', lineHeight: 1.4 }}
    >
      <div className="text-center">
        {shop.logo_url && <img src={shop.logo_url} alt="" className="mx-auto mb-1.5 max-h-14 grayscale" />}
        <p className="font-bold uppercase" style={{ fontSize: small ? '13px' : '15px' }}>
          {shop.name}
        </p>
        {shop.address && <p>{shop.address}</p>}
        {(shop.phone || shop.email) && <p>{[shop.phone, shop.email].filter(Boolean).join(' · ')}</p>}
      </div>
      <Rule />
      <div className="text-center">
        <p className="font-bold" style={{ fontSize: small ? '12px' : '14px' }}>
          {order.order_number}
        </p>
        <p>{formatFull(order.created_at)}</p>
      </div>
      <Rule />
      <Line left="Customer" right={order.customer?.name} />
      <Line left="Phone" right={order.customer?.phone} />
      <Line left="Served by" right={order.created_by?.name ?? '—'} />
      <Rule />
      {order.items?.map((i) => (
        <div key={i.id} className="mb-1">
          <p className="font-bold">{i.service_name}</p>
          <Line left={`  ${quantity(i.billable_quantity, i.unit)} x ${peso(i.unit_price)}`} right={peso(i.line_total)} />
          {i.billable_quantity !== i.quantity && <p>  (actual {quantity(i.quantity, i.unit)}, minimum applied)</p>}
        </div>
      ))}
      {!!order.addons?.length && (
        <>
          <p className="mt-1 font-bold">Additional charges</p>
          {order.addons.map((a) => (
            <Line key={a.id} left={`  ${a.addon_name}${a.quantity > 1 ? ` x${a.quantity}` : ''}`} right={peso(a.line_total)} />
          ))}
        </>
      )}
      <Rule />
      <Line left="Subtotal" right={peso(order.subtotal)} />
      {Number(order.discount_amount) > 0 && <Line left={`Discount${order.discount_type === 'percent' ? ` (${Number(order.discount_value)}%)` : ''}`} right={`-${peso(order.discount_amount)}`} />}
      {Number(order.tax_amount) > 0 && <Line left={`${receipt.tax_label || 'Tax'} (${Number(order.tax_rate)}%)`} right={peso(order.tax_amount)} />}
      <div style={{ fontSize: small ? '12px' : '14px' }}>
        <Line left="TOTAL" right={peso(order.total)} bold />
      </div>
      <Line left="Amount paid" right={peso(order.amount_paid)} />
      {lastPayment && Number(lastPayment.change_given) > 0 && (
        <>
          <Line left={`  Cash tendered`} right={peso(lastPayment.amount_tendered)} />
          <Line left={`  Change`} right={peso(lastPayment.change_given)} />
        </>
      )}
      <Line left="BALANCE" right={peso(order.balance)} bold />
      <p className="mt-1 text-center font-bold">*** {order.payment_status_label.toUpperCase()} ***</p>
      <Rule />
      <Line left="Pickup on" right={formatFull(order.expected_at)} bold />
      {order.notes && <p className="mt-1">Note: {order.notes}</p>}
      <Rule />
      {receipt.terms.length > 0 && (
        <ul className="space-y-0.5" style={{ fontSize: small ? '9px' : '10px' }}>
          {receipt.terms.map((t, i) => (
            <li key={i}>• {t}</li>
          ))}
        </ul>
      )}
      {receipt.footer && <p className="mt-2 text-center font-bold">{receipt.footer}</p>}
      <p className="mt-2 text-center" style={{ fontSize: '9px' }}>
        Printed {formatFull(receipt.printed_at)}
      </p>
    </div>
  );
}
