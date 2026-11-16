import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, CreditCard, ImageUp, Pencil, Plus, Receipt, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import { api, toApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/format';
import { useApiQuery } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import type { PaymentMethod, Settings } from '../../lib/types';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea, Toggle } from '../../components/ui/Field';
import { ErrorState, LoadingBlock } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { NeutralBadge } from '../../components/ui/Badge';
import { BrandMark } from '../../components/layout/Brand';

type Section = 'shop' | 'business' | 'receipt' | 'payments';

const SECTIONS: Array<{ id: Section; label: string; icon: typeof Building2 }> = [
  { id: 'shop', label: 'Shop profile', icon: Building2 },
  { id: 'business', label: 'Orders & pricing', icon: SlidersHorizontal },
  { id: 'receipt', label: 'Receipt', icon: Receipt },
  { id: 'payments', label: 'Payment methods', icon: CreditCard },
];

export function SettingsPage() {
  const toast = useToast();
  const { refreshSettings } = useAuth();
  const { data, loading, error, reload, setData } = useApiQuery<Settings>('/settings');
  const [form, setForm] = useState<Settings | null>(null);
  const [section, setSection] = useState<Section>('shop');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !form) return <LoadingBlock />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const err = (k: string) => errors[k]?.[0];

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { shop_logo_url: _logo, ...payload } = form;
      void _logo;
      const res = await api.put('/settings', payload);
      setData(res.data.data);
      await refreshSettings();
      toast.success('Settings saved');
    } catch (e2) {
      const apiError = toApiError(e2);
      setErrors(apiError.errors);
      toast.error('Settings not saved', apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('logo', file);
      const res = await api.post('/settings/logo', body);
      setData(res.data.data);
      await refreshSettings();
      toast.success('Logo updated');
    } catch (e) {
      const apiError = toApiError(e);
      toast.error('Logo not uploaded', apiError.errors.logo?.[0] ?? apiError.message);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    const res = await api.delete('/settings/logo');
    setData(res.data.data);
    await refreshSettings();
  };

  return (
    <>
      <PageHeader title="Settings" description="Shop details, receipts, pricing rules and payment methods." />

      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'flex h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 font-semibold whitespace-nowrap transition',
                section === s.id ? 'bg-white text-brand-700 shadow-card ring-1 ring-ink-200/70 dark:bg-ink-900 dark:text-brand-300 dark:ring-ink-800' : 'text-ink-500 hover:bg-white/60 hover:text-ink-800 dark:hover:bg-ink-900/60',
              )}
            >
              <s.icon className="size-[18px]" />
              {s.label}
            </button>
          ))}
        </nav>

        {section === 'payments' ? (
          <PaymentMethodsSection />
        ) : (
          <form onSubmit={save}>
            <Card>
              {section === 'shop' && (
                <>
                  <CardHeader title="Shop profile" description="Shown on the sidebar and printed on every receipt." />
                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <div className="flex items-center gap-4 sm:col-span-2">
                      {form.shop_logo_url ? <img src={form.shop_logo_url} alt="Shop logo" className="size-16 rounded-2xl object-cover ring-1 ring-ink-200" /> : <BrandMark className="size-16 rounded-2xl" />}
                      <div className="flex flex-wrap gap-2">
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                        <Button variant="secondary" size="sm" icon={<ImageUp className="size-4" />} loading={uploading} onClick={() => fileRef.current?.click()}>
                          Upload logo
                        </Button>
                        {form.shop_logo_url && (
                          <Button variant="ghost" size="sm" onClick={removeLogo}>
                            Remove
                          </Button>
                        )}
                        <p className="w-full text-[12.5px] text-ink-500">PNG, JPG or WebP, up to 1 MB.</p>
                      </div>
                    </div>
                    <Field label="Shop name" required error={err('shop_name')} className="sm:col-span-2">
                      <Input value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} />
                    </Field>
                    <Field label="Business address" error={err('shop_address')} className="sm:col-span-2">
                      <Input value={form.shop_address} onChange={(e) => set('shop_address', e.target.value)} />
                    </Field>
                    <Field label="Contact number" error={err('shop_phone')}>
                      <Input value={form.shop_phone} onChange={(e) => set('shop_phone', e.target.value)} />
                    </Field>
                    <Field label="Email" error={err('shop_email')}>
                      <Input type="email" value={form.shop_email} onChange={(e) => set('shop_email', e.target.value)} />
                    </Field>
                    <Field label="Currency" hint="Philippine Peso">
                      <Input value={`${form.currency} (${form.currency_symbol})`} disabled />
                    </Field>
                  </div>
                </>
              )}

              {section === 'business' && (
                <>
                  <CardHeader title="Orders & pricing rules" description="Service prices are managed under Services & Pricing." />
                  <div className="grid gap-5 p-5 sm:grid-cols-2">
                    <Field label="Order number prefix" error={err('order_prefix')} hint={`Example: ${form.order_prefix || 'LND'}-20261116-${'1'.padStart(form.order_number_padding, '0')}`}>
                      <Input value={form.order_prefix} onChange={(e) => set('order_prefix', e.target.value.toUpperCase())} maxLength={10} />
                    </Field>
                    <Field label="Sequence digits" error={err('order_number_padding')}>
                      <Select value={form.order_number_padding} onChange={(e) => set('order_number_padding', Number(e.target.value))}>
                        {[3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} digits
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Default completion time (hours)" error={err('default_turnaround_hours')} hint="Used when a service has no turnaround of its own">
                      <Input value={form.default_turnaround_hours} onChange={(e) => set('default_turnaround_hours', Number(e.target.value.replace(/\D/g, '')) || 0)} inputMode="numeric" />
                    </Field>
                    <Field label="Max discount for desk operators (%)" error={err('operator_max_discount_percent')} hint="Owners can give any discount">
                      <Input value={form.operator_max_discount_percent} onChange={(e) => set('operator_max_discount_percent', e.target.value)} inputMode="decimal" />
                    </Field>
                    <Field label="Tax label" error={err('tax_label')}>
                      <Input value={form.tax_label} onChange={(e) => set('tax_label', e.target.value)} />
                    </Field>
                    <Field label="Tax rate (%)" error={err('tax_rate')} hint="0 for non-VAT registered shops">
                      <Input value={form.tax_rate} onChange={(e) => set('tax_rate', e.target.value)} inputMode="decimal" />
                    </Field>
                    <div className="sm:col-span-2">
                      <Toggle checked={form.require_full_payment_on_release} onChange={(v) => set('require_full_payment_on_release', v)} label="Require full payment before release" description="Operators can't release laundry while a balance is unpaid." />
                    </div>
                  </div>
                </>
              )}

              {section === 'receipt' && (
                <>
                  <CardHeader title="Receipt" description="Thermal receipt layout for 58mm or 80mm printers." />
                  <div className="grid gap-5 p-5">
                    <Field label="Paper width">
                      <div className="grid max-w-sm grid-cols-2 gap-2">
                        {(['58', '80'] as const).map((w) => (
                          <button type="button" key={w} onClick={() => set('receipt_paper_width', w)} className={cn('h-12 rounded-xl border-2 font-bold', form.receipt_paper_width === w ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200' : 'border-ink-200 text-ink-600 dark:border-ink-700')}>
                            {w} mm
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Terms & reminders" hint="One per line" error={err('receipt_terms')}>
                      <Textarea value={form.receipt_terms} onChange={(e) => set('receipt_terms', e.target.value)} rows={5} />
                    </Field>
                    <Field label="Footer message" error={err('receipt_footer')}>
                      <Input value={form.receipt_footer} onChange={(e) => set('receipt_footer', e.target.value)} />
                    </Field>
                  </div>
                </>
              )}

              <div className="flex justify-end border-t border-ink-100 px-5 py-4 dark:border-ink-800">
                <Button type="submit" loading={saving} icon={<Save className="size-4" />}>
                  Save changes
                </Button>
              </div>
            </Card>
          </form>
        )}
      </div>
    </>
  );
}

function PaymentMethodsSection() {
  const toast = useToast();
  const { data, reload } = useApiQuery<PaymentMethod[]>('/payment-methods', { include_inactive: 1 });
  const [editing, setEditing] = useState<PaymentMethod | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PaymentMethod | null>(null);

  return (
    <Card>
      <CardHeader
        title="Payment methods"
        description="Shown as buttons at the POS. Methods with payments can only be deactivated."
        action={
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditing('new')}>
            Add method
          </Button>
        }
      />
      <div className="divide-y divide-ink-100 dark:divide-ink-800">
        {data?.map((m) => (
          <div key={m.id} className={cn('flex items-center gap-4 px-5 py-3.5', !m.is_active && 'opacity-60')}>
            <CreditCard className="size-4 text-ink-400" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900 dark:text-white">{m.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <NeutralBadge>{m.code}</NeutralBadge>
                {m.is_cash && <NeutralBadge>Gives change</NeutralBadge>}
                {m.requires_reference && <NeutralBadge>Reference required</NeutralBadge>}
                {!m.is_active && <NeutralBadge>Inactive</NeutralBadge>}
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="hover:text-rose-600" onClick={() => setDeleting(m)} aria-label={`Delete ${m.name}`}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <PaymentMethodModal value={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name}?`}
        message="This only works if no payments were ever recorded with this method."
        confirmLabel="Delete"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await api.delete(`/payment-methods/${deleting!.id}`);
            toast.success('Payment method deleted');
            reload();
          } catch (e) {
            toast.error('Could not delete', toApiError(e).message);
          }
          setDeleting(null);
        }}
      />
    </Card>
  );
}

function PaymentMethodModal({ value, onClose, onSaved }: { value: PaymentMethod | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const editing = value && value !== 'new' ? value : null;
  const [form, setForm] = useState({ name: '', code: '', is_cash: false, requires_reference: true, is_active: true, sort_order: 0 });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) return;
    setErrors({});
    setForm(editing ? { name: editing.name, code: editing.code, is_cash: editing.is_cash, requires_reference: editing.requires_reference, is_active: editing.is_active, sort_order: editing.sort_order } : { name: '', code: '', is_cash: false, requires_reference: true, is_active: true, sort_order: 10 });
  }, [value, editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) await api.put(`/payment-methods/${editing.id}`, form);
      else await api.post('/payment-methods', form);
      toast.success('Payment method saved', form.name);
      onSaved();
      onClose();
    } catch (err) {
      setErrors(toApiError(err).errors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!value}
      onClose={onClose}
      locked={busy}
      size="sm"
      title={editing ? 'Edit payment method' : 'Add payment method'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="pm-form" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="pm-form" onSubmit={submit} className="space-y-4">
        <Field label="Name" required error={errors.name?.[0]}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, code: editing ? form.code : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') })} />
        </Field>
        <Field label="Code" required error={errors.code?.[0]} hint="Short identifier, e.g. shopeepay">
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <Toggle checked={form.is_cash} onChange={(v) => setForm({ ...form, is_cash: v })} label="Cash-like" description="Allows overpayment and computes change." />
        <Toggle checked={form.requires_reference} onChange={(v) => setForm({ ...form, requires_reference: v })} label="Require reference number" />
        <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active" />
      </form>
    </Modal>
  );
}
