import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  RotateCcw,
  Scale,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  Building2,
} from 'lucide-react';
import { api, toApiError, uuid } from '../lib/api';
import { P, useAuth } from '../lib/auth';
import { cn, formatFull, peso, quantity as fmtQty } from '../lib/format';
import { useApiQuery, useDebounce } from '../lib/hooks';
import { openReceipt } from '../lib/print';
import { useToast } from '../lib/toast';
import type { Customer, LaundryService, Order, PaymentMethod, Quote, ServiceAddon } from '../lib/types';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Field';
import { Alert, Skeleton } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Segmented } from '../components/ui/DataTable';
import { CustomerPicker } from '../components/pos/CustomerPicker';
import { CounterMascot } from '../components/pos/CounterMascot';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';

interface Line {
  key: string;
  serviceId: number;
  quantity: string;
}

const METHOD_ICONS: Record<string, typeof Banknote> = { cash: Banknote, gcash: Smartphone, maya: Wallet, bank_transfer: Building2 };

/** Integer centavos for display-only previews (change due). Never sent as a price. */
const cents = (v: string | number | undefined) => Math.round(Number(v || 0) * 100);

function Section({ step, title, icon, children, aside }: { step: number; title: string; icon: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-[16px] font-bold text-ink-900 dark:text-white">
          <span className="grid size-8 place-items-center rounded-xl bg-ink-900 text-[13px] font-extrabold text-white dark:bg-white dark:text-ink-900">{step}</span>
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function PosPage() {
  const { can, settings } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const services = useApiQuery<LaundryService[]>('/services');
  const addons = useApiQuery<ServiceAddon[]>('/service-addons');
  const methods = useApiQuery<PaymentMethod[]>('/payment-methods');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [registering, setRegistering] = useState<{ name?: string; phone?: string } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [addonQty, setAddonQty] = useState<Record<number, number>>({});
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [methodId, setMethodId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [clientRef, setClientRef] = useState(uuid);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string[]>>({});
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<Record<string, string[]>>({});
  const [completed, setCompleted] = useState<Order | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const serviceById = useMemo(() => new Map((services.data ?? []).map((s) => [s.id, s])), [services.data]);
  const method = methods.data?.find((m) => m.id === methodId) ?? null;

  useEffect(() => {
    if (methodId === null && methods.data?.length) setMethodId(methods.data.find((m) => m.is_cash)?.id ?? methods.data[0].id);
  }, [methods.data, methodId]);

  // ---- Server-side quote (single source of truth for every peso shown) ----
  const quotePayload = useMemo(() => {
    const items = lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ service_id: l.serviceId, quantity: l.quantity }));
    return {
      items,
      addons: Object.entries(addonQty)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ addon_id: Number(id), quantity: q })),
      discount: Number(discountValue) > 0 ? { type: discountType, value: discountValue, reason: discountReason || null } : null,
    };
  }, [lines, addonQty, discountType, discountValue, discountReason]);

  const debouncedPayload = useDebounce(quotePayload, 220);

  useEffect(() => {
    if (debouncedPayload.items.length === 0) {
      setQuote(null);
      setQuoteErrors({});
      return;
    }
    let cancelled = false;
    setQuoting(true);
    api
      .post('/orders/quote', debouncedPayload)
      .then((res) => {
        if (cancelled) return;
        setQuote(res.data.data);
        setQuoteErrors({});
      })
      .catch((e) => {
        if (cancelled) return;
        const err = toApiError(e);
        setQuoteErrors(Object.keys(err.errors).length ? err.errors : { _: [err.message] });
      })
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedPayload]);

  const stale = JSON.stringify(debouncedPayload) !== JSON.stringify(quotePayload) || quoting;

  // ---- Line editing ----
  const addService = (s: LaundryService) => {
    const existing = lines.find((l) => l.serviceId === s.id);
    if (existing) {
      if (s.pricing_type !== 'per_kg') updateQty(existing.key, String(Number(existing.quantity || 0) + 1));
      requestAnimationFrame(() => qtyRefs.current[existing.key]?.select());
      return;
    }
    const key = uuid();
    setLines((ls) => [...ls, { key, serviceId: s.id, quantity: s.pricing_type === 'per_kg' ? '' : '1' }]);
    requestAnimationFrame(() => qtyRefs.current[key]?.focus());
  };

  const updateQty = (key: string, quantity: string) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, quantity } : l)));
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const step = (line: Line, delta: number) => {
    const s = serviceById.get(line.serviceId);
    const inc = s?.pricing_type === 'per_kg' ? 0.5 : 1;
    const next = Math.max(0, Number(line.quantity || 0) + delta * inc);
    updateQty(line.key, s?.pricing_type === 'per_kg' ? String(Math.round(next * 100) / 100) : String(Math.round(next)));
  };

  // ---- Payment preview (display only; the server applies the real amounts) ----
  const totalCents = quote ? cents(quote.total) : 0;
  const tenderedCents = cents(amount);
  const appliedCents = Math.min(tenderedCents, totalCents);
  const changeCents = method?.is_cash ? Math.max(0, tenderedCents - totalCents) : 0;
  const balanceAfterCents = Math.max(0, totalCents - appliedCents);
  const overNonCash = !!method && !method.is_cash && tenderedCents > totalCents;

  const quickAmounts = useMemo(() => {
    if (!totalCents) return [];
    const total = totalCents / 100;
    const opts = [100, 200, 500, 1000].filter((n) => n > total).slice(0, 3);
    return opts;
  }, [totalCents]);

  const reset = useCallback(() => {
    setCustomer(null);
    setLines([]);
    setAddonQty({});
    setDiscountValue('');
    setDiscountReason('');
    setNotes('');
    setExpectedAt('');
    setAmount('');
    setReference('');
    setQuote(null);
    setSubmitErrors({});
    setClientRef(uuid());
    setMethodId(methods.data?.find((m) => m.is_cash)?.id ?? null);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [methods.data]);

  const blockers: string[] = [];
  if (!customer) blockers.push('Select a customer');
  if (!quotePayload.items.length) blockers.push('Add a service with weight or quantity');
  if (Object.keys(quoteErrors).length) blockers.push('Fix the highlighted issues');
  if (tenderedCents > 0 && method?.requires_reference && !reference.trim()) blockers.push(`Enter the ${method.name} reference number`);
  if (overNonCash) blockers.push(`${method?.name} payment can't exceed the total`);
  const canSubmit = blockers.length === 0 && !stale && !submitting;

  const submit = async () => {
    if (!canSubmit || !customer) return;
    setSubmitting(true);
    setSubmitErrors({});
    try {
      const res = await api.post('/orders', {
        client_reference: clientRef,
        customer_id: customer.id,
        ...quotePayload,
        discount: quotePayload.discount ?? undefined,
        notes: notes || null,
        expected_at: expectedAt ? new Date(expectedAt).toISOString() : null,
        payment: tenderedCents > 0 && methodId ? { payment_method_id: methodId, amount, reference_number: reference || null } : null,
      });
      setCompleted(res.data.data);
      toast.success('Order saved', res.data.data.order_number);
    } catch (e) {
      const err = toApiError(e);
      setSubmitErrors(err.errors);
      toast.error('Order not saved', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Keyboard: "/" focuses search, Ctrl+Enter completes ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !completed) {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const lineError = (index: number) => quoteErrors[`items.${index}.quantity`]?.[0] ?? submitErrors[`items.${index}.quantity`]?.[0];
  const discountError = quoteErrors['discount.value']?.[0];
  const generalError = quoteErrors._?.[0] ?? quoteErrors['discount']?.[0];
  const filledIndex = (key: string) => lines.filter((l) => Number(l.quantity) > 0).findIndex((l) => l.key === key);

  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
      {/* LEFT: build the order */}
      <div className="space-y-5">
        <Section step={1} title="Customer" icon={null} aside={<span className="hidden text-[12px] text-ink-400 sm:block">Press <kbd className="rounded border border-ink-200 px-1 font-bold dark:border-ink-700">/</kbd> to search</span>}>
          <CustomerPicker ref={searchRef} value={customer} onChange={setCustomer} canRegister={can(P.CustomersManage)} onRegister={(prefill) => setRegistering(prefill)} />
        </Section>

        <Section step={2} title="Laundry services" icon={null}>
          {services.loading && !services.data ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {(services.data ?? []).map((s) => {
                const selected = lines.some((l) => l.serviceId === s.id);
                const Icon = s.pricing_type === 'per_kg' ? Scale : s.pricing_type === 'per_piece' ? Shirt : ShoppingBasket;
                return (
                  <button
                    key={s.id}
                    onClick={() => addService(s)}
                    className={cn(
                      'group relative flex min-h-[92px] flex-col justify-between rounded-2xl border-2 p-3.5 text-left transition',
                      selected ? 'border-brand-500 bg-brand-50/70 dark:border-brand-400 dark:bg-brand-500/10' : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/30 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-700',
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[14.5px] leading-snug font-bold text-ink-900 dark:text-white">{s.name}</span>
                      <Icon className={cn('size-4 shrink-0', selected ? 'text-brand-600' : 'text-ink-300 group-hover:text-brand-500')} />
                    </span>
                    <span className="mt-2 flex items-baseline gap-1">
                      <span className="num text-[17px] font-extrabold text-brand-700 dark:text-brand-300">{peso(s.price)}</span>
                      <span className="text-[12px] font-semibold text-ink-400">/{s.unit === 'svc' ? 'load' : s.unit}</span>
                    </span>
                    {selected && <CheckCircle2 className="absolute -top-2 -right-2 size-6 rounded-full bg-white text-brand-600 dark:bg-ink-900" />}
                  </button>
                );
              })}
            </div>
          )}

          {lines.length > 0 && (
            <div className="mt-5 space-y-3">
              {lines.map((line) => {
                const s = serviceById.get(line.serviceId);
                if (!s) return null;
                const fi = filledIndex(line.key);
                const err = fi >= 0 ? lineError(fi) : undefined;
                const q = quote?.items[fi];
                const isKg = s.pricing_type === 'per_kg';
                return (
                  <div key={line.key} className="rounded-2xl bg-ink-50 p-3.5 ring-1 ring-ink-200/70 dark:bg-ink-800/50 dark:ring-ink-700">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-[140px] flex-1">
                        <p className="font-bold text-ink-900 dark:text-white">{s.name}</p>
                        <p className="text-[12.5px] text-ink-500">
                          {peso(s.price)} per {isKg ? 'kg' : s.pricing_type === 'per_piece' ? 'piece' : 'load'}
                          {s.minimum_quantity && Number(s.minimum_quantity) > 0 && ` · min ${fmtQty(s.minimum_quantity, s.unit)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => step(line, -1)} className="grid size-12 place-items-center rounded-xl bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700" aria-label="Decrease">
                          <Minus className="size-4" />
                        </button>
                        <div className="relative w-32">
                          <input
                            ref={(el) => {
                              qtyRefs.current[line.key] = el;
                            }}
                            value={line.quantity}
                            onChange={(e) => updateQty(line.key, e.target.value.replace(/[^\d.]/g, ''))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') searchRef.current?.blur();
                            }}
                            inputMode="decimal"
                            placeholder={isKg ? '0.0' : '0'}
                            aria-label={`${s.name} ${isKg ? 'weight in kilograms' : 'quantity'}`}
                            className={cn('input num h-12 pr-11 text-center text-[19px] font-extrabold', err && 'input-error')}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] font-bold text-ink-400 uppercase">{isKg ? 'kg' : s.pricing_type === 'per_piece' ? 'pcs' : 'qty'}</span>
                        </div>
                        <button onClick={() => step(line, 1)} className="grid size-12 place-items-center rounded-xl bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-100 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700" aria-label="Increase">
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <div className="w-28 text-right">
                        <p className={cn('num text-[16px] font-extrabold text-ink-900 dark:text-white', stale && 'opacity-50')}>{q ? peso(q.line_total) : '—'}</p>
                        {q && q.billable_quantity !== q.quantity && <p className="text-[11.5px] font-semibold text-amber-600">billed {fmtQty(q.billable_quantity, s.unit)}</p>}
                      </div>
                      <button onClick={() => removeLine(line.key)} className="grid size-10 place-items-center rounded-xl text-ink-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label="Remove service">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {err && <p className="mt-2 text-[12.5px] font-medium text-rose-600">{err}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section step={3} title="Add-ons" icon={<Sparkles className="size-4 text-ink-400" />} aside={<span className="text-[12.5px] text-ink-400">Optional</span>}>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {(addons.data ?? []).map((a) => {
              const qty = addonQty[a.id] ?? 0;
              return (
                <div key={a.id} className={cn('flex items-center gap-2 rounded-xl border-2 p-2.5 pl-3.5 transition', qty ? 'border-brand-500 bg-brand-50/60 dark:border-brand-400 dark:bg-brand-500/10' : 'border-ink-200 dark:border-ink-700')}>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setAddonQty((m) => ({ ...m, [a.id]: qty ? 0 : 1 }))}>
                    <span className="block truncate font-semibold text-ink-800 dark:text-ink-100">{a.name}</span>
                    <span className="num text-[12.5px] font-bold text-brand-700 dark:text-brand-300">+{peso(a.price)}</span>
                  </button>
                  {qty > 0 ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setAddonQty((m) => ({ ...m, [a.id]: qty - 1 }))} className="grid size-8 place-items-center rounded-lg bg-white ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700" aria-label="Less">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="num w-6 text-center font-bold">{qty}</span>
                      <button onClick={() => setAddonQty((m) => ({ ...m, [a.id]: qty + 1 }))} className="grid size-8 place-items-center rounded-lg bg-white ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700" aria-label="More">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setAddonQty((m) => ({ ...m, [a.id]: 1 }))} className="grid size-8 place-items-center rounded-lg text-ink-400 ring-1 ring-ink-200 hover:text-brand-600 dark:ring-ink-700" aria-label={`Add ${a.name}`}>
                      <Plus className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Notes for the laundry team" className="sm:col-span-1">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Separate whites, 1 jacket with stain" className="min-h-[46px]" rows={2} />
            </Field>
            <Field label="Expected pickup" hint={`Leave blank for the default (${settings?.default_turnaround_hours ?? 48}h or the service turnaround)`} error={submitErrors.expected_at?.[0]}>
              <Input type="datetime-local" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} leading={<CalendarClock className="size-4" />} />
            </Field>
          </div>
        </Section>
      </div>

      {/* RIGHT: summary & payment */}
      <aside className="lg:sticky lg:top-[88px] lg:self-start">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4 dark:border-ink-800">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-ink-900 dark:text-white">
              <ReceiptIcon className="size-[18px] text-ink-400" /> Order summary
            </h2>
            {(lines.length > 0 || customer) && (
              <button onClick={reset} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-800">
                <RotateCcw className="size-3.5" /> Clear
              </button>
            )}
          </div>

          <div className="space-y-4 px-5 py-4">
            {!quote && !quotePayload.items.length ? (
              <div className="rounded-2xl border-2 border-dashed border-ink-200 px-4 py-8 text-center dark:border-ink-700">
                <ShoppingBasket className="mx-auto size-8 text-ink-300" />
                <p className="mt-2 font-semibold text-ink-600 dark:text-ink-300">No services yet</p>
                <p className="text-[13px] text-ink-400">Pick a service and enter the weight.</p>
              </div>
            ) : (
              <div className={cn('space-y-2 transition-opacity', stale && 'opacity-60')}>
                {quote?.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between gap-3 text-[14px]">
                    <span className="text-ink-600 dark:text-ink-300">
                      {i.service_name} <span className="text-ink-400">× {fmtQty(i.billable_quantity, i.pricing_type === 'per_kg' ? 'kg' : i.pricing_type === 'per_piece' ? 'pc' : 'svc')}</span>
                    </span>
                    <span className="num font-semibold text-ink-900 dark:text-white">{peso(i.line_total)}</span>
                  </div>
                ))}
                {quote?.addons.map((a, idx) => (
                  <div key={`a${idx}`} className="flex justify-between gap-3 text-[14px]">
                    <span className="text-ink-600 dark:text-ink-300">
                      {a.addon_name} {a.quantity > 1 && <span className="text-ink-400">× {a.quantity}</span>}
                    </span>
                    <span className="num font-semibold text-ink-900 dark:text-white">{peso(a.line_total)}</span>
                  </div>
                ))}
              </div>
            )}

            {generalError && <Alert tone="error">{generalError}</Alert>}

            {can(P.DiscountsApply) && quotePayload.items.length > 0 && (
              <div className="rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-200/60 dark:bg-ink-800/40 dark:ring-ink-700">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-ink-400" />
                  <span className="text-[13px] font-semibold text-ink-700 dark:text-ink-200">Discount</span>
                  <Segmented
                    className="ml-auto"
                    value={discountType}
                    onChange={setDiscountType}
                    options={[
                      { value: 'percent', label: '%' },
                      { value: 'fixed', label: '₱' },
                    ]}
                  />
                </div>
                <div className="mt-2.5 grid grid-cols-[110px_1fr] gap-2">
                  <Input value={discountValue} onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="0" invalid={!!discountError} className="num h-10 font-bold" />
                  <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Reason (e.g. Senior, Suki)" className="h-10" />
                </div>
                {discountError && <p className="mt-1.5 text-[12.5px] font-medium text-rose-600">{discountError}</p>}
              </div>
            )}

            <dl className={cn('space-y-1.5 border-t border-dashed border-ink-200 pt-4 text-[14px] dark:border-ink-700', stale && 'opacity-60')}>
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="num font-semibold">{peso(quote?.subtotal)}</dd>
              </div>
              {quote && Number(quote.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <dt>Discount {quote.discount_type === 'percent' && `(${Number(quote.discount_value)}%)`}</dt>
                  <dd className="num font-semibold">−{peso(quote.discount_amount)}</dd>
                </div>
              )}
              {quote && Number(quote.tax_amount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">
                    {settings?.tax_label || 'Tax'} ({Number(quote.tax_rate)}%)
                  </dt>
                  <dd className="num font-semibold">{peso(quote.tax_amount)}</dd>
                </div>
              )}
            </dl>

            <div className="flex items-end justify-between rounded-2xl bg-ink-900 px-5 py-4 text-white dark:bg-black/40 dark:ring-1 dark:ring-ink-800">
              <span className="text-[13px] font-semibold tracking-wide text-ink-300 uppercase">Total</span>
              <span className={cn('num text-[32px] leading-none font-extrabold tracking-tight', stale && 'opacity-60')}>{peso(quote?.total)}</span>
            </div>

            {/* Payment */}
            {can(P.PaymentsCreate) && (
              <div className="space-y-3 pt-1">
                <p className="eyebrow">Payment</p>
                <div className="grid grid-cols-4 gap-2">
                  {(methods.data ?? []).map((m) => {
                    const Icon = METHOD_ICONS[m.code] ?? Wallet;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMethodId(m.id)}
                        className={cn(
                          'flex h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 text-[12px] font-bold transition',
                          methodId === m.id ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-200' : 'border-ink-200 text-ink-600 hover:border-ink-300 dark:border-ink-700 dark:text-ink-300',
                        )}
                      >
                        <Icon className="size-[18px]" />
                        <span className="w-full truncate px-1 text-center">{m.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[18px] font-bold text-ink-400">₱</span>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-label="Amount received"
                      className={cn('input num h-14 pl-9 text-right text-[22px] font-extrabold', (overNonCash || submitErrors['payment.amount']) && 'input-error')}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button disabled={!totalCents} onClick={() => setAmount((totalCents / 100).toFixed(2))} className="rounded-lg bg-brand-600 px-3 py-1.5 text-[12.5px] font-bold text-white hover:bg-brand-700 disabled:opacity-40">
                      Exact
                    </button>
                    {method?.is_cash &&
                      quickAmounts.map((n) => (
                        <button key={n} onClick={() => setAmount(String(n))} className="num rounded-lg bg-ink-100 px-3 py-1.5 text-[12.5px] font-bold text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-200">
                          ₱{n}
                        </button>
                      ))}
                    <button onClick={() => setAmount('')} className="rounded-lg px-3 py-1.5 text-[12.5px] font-bold text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
                      Pay later
                    </button>
                  </div>
                </div>

                {method?.requires_reference && tenderedCents > 0 && (
                  <Field error={submitErrors.reference_number?.[0]}>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={`${method.name} reference number`} />
                  </Field>
                )}

                {quote && (
                  <dl className="space-y-1.5 rounded-2xl bg-ink-50 px-4 py-3 text-[14px] ring-1 ring-ink-200/60 dark:bg-ink-800/40 dark:ring-ink-700">
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Amount paid</dt>
                      <dd className="num font-semibold">{peso(appliedCents / 100)}</dd>
                    </div>
                    {changeCents > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <dt className="font-semibold">Change</dt>
                        <dd className="num text-[16px] font-extrabold">{peso(changeCents / 100)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Remaining balance</dt>
                      <dd className={cn('num font-extrabold', balanceAfterCents > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>{peso(balanceAfterCents / 100)}</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}

            <Button size="xl" className="w-full" onClick={submit} disabled={!canSubmit} loading={submitting} icon={!submitting && <CheckCircle2 className="size-5" />}>
              Complete Order
            </Button>
            <p className="text-center text-[12px] text-ink-400">
              {blockers.length ? blockers[0] : (
                <>
                  Press <kbd className="rounded border border-ink-200 px-1 font-bold dark:border-ink-700">Ctrl</kbd> + <kbd className="rounded border border-ink-200 px-1 font-bold dark:border-ink-700">Enter</kbd> to complete
                </>
              )}
            </p>

            <div className="border-t border-dashed border-ink-200 pt-3 dark:border-ink-700">
              <CounterMascot />
            </div>
          </div>
        </div>
      </aside>

      <CustomerFormModal
        open={registering !== null}
        initial={registering ?? undefined}
        onClose={() => setRegistering(null)}
        onSaved={(c) => setCustomer({ ...c, orders_count: 0, outstanding_balance: '0.00' })}
      />

      <Modal
        open={!!completed}
        onClose={() => {
          setCompleted(null);
          reset();
        }}
        size="sm"
        title={
          <span className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
              <CheckCircle2 className="size-6" />
            </span>
            Order saved
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => completed && navigate(`/orders/${completed.id}`)}>
              View order
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setCompleted(null);
                reset();
              }}
            >
              New order
            </Button>
            {can(P.PaymentsView) && (
              <Button icon={<Printer className="size-4" />} onClick={() => completed && openReceipt(completed.id)} data-autofocus>
                Print receipt
              </Button>
            )}
          </>
        }
      >
        {completed && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-ink-50 p-4 text-center dark:bg-ink-800/60">
              <p className="eyebrow">Order number</p>
              <p className="num mt-1 text-[24px] font-extrabold tracking-tight text-ink-900 dark:text-white">{completed.order_number}</p>
              <p className="mt-1 text-[13px] text-ink-500">
                {completed.customer?.name} · ready {formatFull(completed.expected_at)}
              </p>
            </div>
            <dl className="space-y-1.5 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-500">Total</dt>
                <dd className="num font-bold">{peso(completed.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Paid</dt>
                <dd className="num font-bold">{peso(completed.amount_paid)}</dd>
              </div>
              {completed.payments?.[0] && Number(completed.payments[0].change_given) > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <dt className="font-semibold">Change to give</dt>
                  <dd className="num text-[18px] font-extrabold">{peso(completed.payments[0].change_given)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-500">Balance</dt>
                <dd className={cn('num font-extrabold', Number(completed.balance) > 0 ? 'text-amber-600' : 'text-emerald-600')}>{peso(completed.balance)}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
