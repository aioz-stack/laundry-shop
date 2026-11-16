import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api, toApiError, uuid } from '../../lib/api';
import { cn, peso } from '../../lib/format';
import { useApiQuery } from '../../lib/hooks';
import { STATUS_LABELS } from '../../lib/status';
import { useToast } from '../../lib/toast';
import type { Order, OrderStatus, PaymentMethod } from '../../lib/types';
import { Button } from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Alert } from '../ui/Feedback';
import { Modal } from '../ui/Modal';

const cents = (v: string | number | undefined) => Math.round(Number(v || 0) * 100);

/** Record a payment (or, for owners, a refund) against an order. */
export function PaymentModal({ order, open, onClose, onDone, mode = 'payment' }: { order: Order; open: boolean; onClose: () => void; onDone: (o: Order) => void; mode?: 'payment' | 'refund' }) {
  const toast = useToast();
  const methods = useApiQuery<PaymentMethod[]>(open ? '/payment-methods' : null);
  const [methodId, setMethodId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per dialog opening: a double-click can never charge twice.
  const idempotencyKey = useMemo(() => (open ? uuid() : ''), [open]);

  useEffect(() => {
    if (!open) return;
    setAmount(mode === 'payment' ? order.balance : '');
    setReference('');
    setNotes('');
    setErrors({});
    setMessage(null);
  }, [open, order.balance, mode]);

  useEffect(() => {
    if (open && methods.data?.length && !methods.data.some((m) => m.id === methodId)) setMethodId(methods.data.find((m) => m.is_cash)?.id ?? methods.data[0].id);
  }, [open, methods.data, methodId]);

  const method = methods.data?.find((m) => m.id === methodId);
  const change = mode === 'payment' && method?.is_cash ? Math.max(0, cents(amount) - cents(order.balance)) : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const url = mode === 'payment' ? `/orders/${order.id}/payments` : `/orders/${order.id}/refunds`;
      const res = await api.post(url, {
        payment_method_id: methodId,
        amount,
        reference_number: reference || null,
        notes: notes || null,
        ...(mode === 'payment' ? { idempotency_key: idempotencyKey } : {}),
      });
      const p = res.data.data;
      toast.success(mode === 'payment' ? 'Payment recorded' : 'Refund recorded', `${peso(p.amount)} via ${p.method?.name}${Number(p.change_given) > 0 ? ` · change ${peso(p.change_given)}` : ''}`);
      onDone(res.data.order);
      onClose();
    } catch (err) {
      const apiError = toApiError(err);
      setErrors(apiError.errors);
      setMessage(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={busy}
      title={mode === 'payment' ? 'Receive payment' : 'Refund payment'}
      description={`${order.order_number} · ${mode === 'payment' ? `Balance ${peso(order.balance)}` : `Paid ${peso(order.amount_paid)}`}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" variant={mode === 'refund' ? 'danger' : 'success'} loading={busy}>
            {mode === 'payment' ? `Receive ${peso(Math.min(cents(amount), cents(order.balance)) / 100)}` : `Refund ${peso(amount)}`}
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="space-y-4">
        {message && !Object.keys(errors).length && <Alert tone="error">{message}</Alert>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(methods.data ?? []).map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setMethodId(m.id)}
              className={cn('h-12 rounded-xl border-2 text-[13px] font-bold transition', methodId === m.id ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200' : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-300')}
            >
              {m.name}
            </button>
          ))}
        </div>
        <Field label={mode === 'payment' ? 'Amount received' : 'Refund amount'} error={errors.amount?.[0]}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" inputSize="lg" className="num text-right text-[22px]" leading={<span className="text-lg font-bold">₱</span>} invalid={!!errors.amount} data-autofocus />
        </Field>
        {change > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="font-semibold">Change to give</span>
            <span className="num text-[18px] font-extrabold">{peso(change / 100)}</span>
          </div>
        )}
        {(method?.requires_reference || mode === 'refund') && (
          <Field label="Reference number" hint={mode === 'refund' ? 'Optional' : undefined} error={errors.reference_number?.[0]}>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} invalid={!!errors.reference_number} />
          </Field>
        )}
        <Field label={mode === 'refund' ? 'Reason for refund' : 'Notes'} required={mode === 'refund'} error={errors.notes?.[0]}>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} invalid={!!errors.notes} />
        </Field>
      </form>
    </Modal>
  );
}

/** Change laundry status with optional / required remarks. */
export function StatusModal({ order, open, onClose, onDone, target, options }: { order: Order; open: boolean; onClose: () => void; onDone: (o: Order) => void; target?: OrderStatus; options: OrderStatus[] }) {
  const toast = useToast();
  const [status, setStatus] = useState<OrderStatus>(target ?? options[0]);
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus(target ?? options[0]);
    setRemarks('');
    setErrors({});
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target, options.join(',')]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await api.post(`/orders/${order.id}/status`, { status, remarks: remarks || null });
      toast.success(`Marked as ${STATUS_LABELS[status]}`, order.order_number);
      onDone(res.data.data);
      onClose();
    } catch (err) {
      const apiError = toApiError(err);
      setErrors(apiError.errors);
      setMessage(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  const danger = status === 'cancelled';

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={busy}
      size="sm"
      title={danger ? 'Cancel this order?' : status === 'released' ? 'Release laundry to customer' : 'Update laundry status'}
      description={`${order.order_number} · currently ${order.status_label}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Back
          </Button>
          <Button type="submit" form="status-form" variant={danger ? 'danger' : 'primary'} loading={busy}>
            {danger ? 'Cancel order' : status === 'released' ? 'Confirm release' : `Mark as ${STATUS_LABELS[status]}`}
          </Button>
        </>
      }
    >
      <form id="status-form" onSubmit={submit} className="space-y-4">
        {message && !Object.keys(errors).length && <Alert tone="error">{message}</Alert>}
        {danger && <Alert tone="warning">Cancelling cannot be undone. Any payments already received stay on record and can be refunded by the owner.</Alert>}
        {status === 'released' && Number(order.balance) > 0 && <Alert tone="warning">This order still has a balance of {peso(order.balance)}.</Alert>}
        {!target && (
          <Field label="New status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              {options.map((o) => (
                <option key={o} value={o}>
                  {STATUS_LABELS[o]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Remarks" required={danger} hint={danger ? undefined : 'Optional'} error={errors.remarks?.[0]}>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="min-h-[60px]" invalid={!!errors.remarks} />
        </Field>
      </form>
    </Modal>
  );
}
