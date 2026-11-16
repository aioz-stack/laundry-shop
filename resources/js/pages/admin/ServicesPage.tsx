import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Scale, Shirt, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react';
import { api, toApiError } from '../../lib/api';
import { cn, peso } from '../../lib/format';
import { useApiQuery } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import type { LaundryService, PricingType, ServiceAddon } from '../../lib/types';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Toggle } from '../../components/ui/Field';
import { Alert, EmptyState, ErrorState, LoadingBlock } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { NeutralBadge } from '../../components/ui/Badge';

const PRICING: Record<PricingType, { label: string; icon: typeof Scale; unit: string }> = {
  per_kg: { label: 'Per kilogram', icon: Scale, unit: 'kg' },
  per_piece: { label: 'Per piece', icon: Shirt, unit: 'piece' },
  fixed: { label: 'Fixed price', icon: ShoppingBasket, unit: 'load' },
};

export function ServicesPage() {
  const toast = useToast();
  const services = useApiQuery<LaundryService[]>('/services', { include_inactive: 1 });
  const addons = useApiQuery<ServiceAddon[]>('/service-addons', { include_inactive: 1 });
  const [editService, setEditService] = useState<LaundryService | 'new' | null>(null);
  const [editAddon, setEditAddon] = useState<ServiceAddon | 'new' | null>(null);
  const [removing, setRemoving] = useState<{ kind: 'service' | 'addon'; id: number; name: string } | null>(null);

  if (services.error) return <ErrorState message={services.error.message} onRetry={services.reload} />;

  return (
    <>
      <PageHeader
        title="Services & pricing"
        description="Prices here are used by the POS. Changing a price never alters past orders."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditService('new')}>
            Add service
          </Button>
        }
      />

      <Card>
        <CardHeader title="Laundry services" description="Main services the customer chooses at the counter." />
        {services.loading && !services.data ? (
          <LoadingBlock />
        ) : services.data?.length === 0 ? (
          <EmptyState title="No services yet" action={<Button onClick={() => setEditService('new')}>Add the first service</Button>} />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {services.data?.map((s) => {
              const meta = PRICING[s.pricing_type];
              return (
                <div key={s.id} className={cn('group rounded-2xl border border-ink-200 p-4 transition hover:border-brand-200 dark:border-ink-700', !s.is_active && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                      <meta.icon className="size-5" />
                    </span>
                    <div className="flex gap-1 opacity-70 group-hover:opacity-100">
                      <Button size="icon" variant="ghost" onClick={() => setEditService(s)} aria-label={`Edit ${s.name}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="hover:text-rose-600" onClick={() => setRemoving({ kind: 'service', id: s.id, name: s.name })} aria-label={`Remove ${s.name}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 font-bold text-ink-900 dark:text-white">{s.name}</p>
                  {s.description && <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500">{s.description}</p>}
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="num text-[22px] font-extrabold text-ink-900 dark:text-white">{peso(s.price)}</span>
                    <span className="text-[13px] font-semibold text-ink-400">/ {meta.unit}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <NeutralBadge>{meta.label}</NeutralBadge>
                    {s.minimum_quantity && Number(s.minimum_quantity) > 0 && <NeutralBadge>Min {Number(s.minimum_quantity)} {meta.unit}</NeutralBadge>}
                    {s.turnaround_hours && <NeutralBadge>{s.turnaround_hours}h turnaround</NeutralBadge>}
                    {!s.is_active && <NeutralBadge className="bg-rose-50 text-rose-700 ring-rose-200">Hidden from POS</NeutralBadge>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Add-ons & additional charges"
          description="Optional extras like fabric conditioner or express processing."
          action={
            <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setEditAddon('new')}>
              Add add-on
            </Button>
          }
        />
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {addons.data?.map((a) => (
            <div key={a.id} className={cn('flex items-center gap-4 px-5 py-3.5', !a.is_active && 'opacity-60')}>
              <Sparkles className="size-4 text-ink-400" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900 dark:text-white">
                  {a.name} {!a.is_active && <span className="ml-1 text-[12px] font-medium text-ink-400">(hidden)</span>}
                </p>
                {a.description && <p className="text-[13px] text-ink-500">{a.description}</p>}
              </div>
              <span className="num font-bold">{peso(a.price)}</span>
              <Button size="icon" variant="ghost" onClick={() => setEditAddon(a)} aria-label={`Edit ${a.name}`}>
                <Pencil className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="hover:text-rose-600" onClick={() => setRemoving({ kind: 'addon', id: a.id, name: a.name })} aria-label={`Remove ${a.name}`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {addons.data?.length === 0 && <EmptyState title="No add-ons" className="py-8" />}
        </div>
      </Card>

      <ServiceModal value={editService} onClose={() => setEditService(null)} onSaved={services.reload} />
      <AddonModal value={editAddon} onClose={() => setEditAddon(null)} onSaved={addons.reload} />
      <ConfirmDialog
        open={!!removing}
        title={`Remove ${removing?.name}?`}
        message="It will disappear from the POS. Past orders keep their original name and price."
        confirmLabel="Remove"
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await api.delete(removing.kind === 'service' ? `/services/${removing.id}` : `/service-addons/${removing.id}`);
            toast.success('Removed', removing.name);
            removing.kind === 'service' ? services.reload() : addons.reload();
          } catch (e) {
            toast.error('Could not remove', toApiError(e).message);
          }
          setRemoving(null);
        }}
      />
    </>
  );
}

function ServiceModal({ value, onClose, onSaved }: { value: LaundryService | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const editing = value && value !== 'new' ? value : null;
  const [form, setForm] = useState({ name: '', description: '', pricing_type: 'per_kg' as PricingType, price: '', minimum_quantity: '', turnaround_hours: '', is_active: true, sort_order: '0' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) return;
    setErrors({});
    setForm(
      editing
        ? {
            name: editing.name,
            description: editing.description ?? '',
            pricing_type: editing.pricing_type,
            price: editing.price,
            minimum_quantity: editing.minimum_quantity ?? '',
            turnaround_hours: editing.turnaround_hours ? String(editing.turnaround_hours) : '',
            is_active: editing.is_active,
            sort_order: String(editing.sort_order),
          }
        : { name: '', description: '', pricing_type: 'per_kg', price: '', minimum_quantity: '', turnaround_hours: '24', is_active: true, sort_order: '0' },
    );
  }, [value, editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const payload = {
      ...form,
      description: form.description || null,
      minimum_quantity: form.minimum_quantity || null,
      turnaround_hours: form.turnaround_hours ? Number(form.turnaround_hours) : null,
      sort_order: Number(form.sort_order || 0),
    };
    try {
      if (editing) await api.put(`/services/${editing.id}`, payload);
      else await api.post('/services', payload);
      toast.success(editing ? 'Service updated' : 'Service added', form.name);
      onSaved();
      onClose();
    } catch (err) {
      setErrors(toApiError(err).errors);
    } finally {
      setBusy(false);
    }
  };

  const unit = PRICING[form.pricing_type].unit;

  return (
    <Modal
      open={!!value}
      onClose={onClose}
      locked={busy}
      title={editing ? 'Edit service' : 'Add laundry service'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="service-form" loading={busy}>
            Save service
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {editing && editing.price !== form.price && <Alert tone="info" className="sm:col-span-2">New price applies to new orders only. Existing orders keep {peso(editing.price)}.</Alert>}
        <Field label="Service name" required error={errors.name?.[0]} className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Pricing method" required>
          <Select value={form.pricing_type} onChange={(e) => setForm({ ...form, pricing_type: e.target.value as PricingType })}>
            {Object.entries(PRICING).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Price per ${unit}`} required error={errors.price?.[0]}>
          <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" leading={<span className="font-bold">₱</span>} invalid={!!errors.price} />
        </Field>
        {form.pricing_type !== 'fixed' && (
          <Field label={`Minimum ${unit}s charged`} hint="Optional, e.g. 3 kg minimum" error={errors.minimum_quantity?.[0]}>
            <Input value={form.minimum_quantity} onChange={(e) => setForm({ ...form, minimum_quantity: e.target.value })} inputMode="decimal" />
          </Field>
        )}
        <Field label="Turnaround (hours)" hint="Sets the expected pickup time" error={errors.turnaround_hours?.[0]}>
          <Input value={form.turnaround_hours} onChange={(e) => setForm({ ...form, turnaround_hours: e.target.value })} inputMode="numeric" />
        </Field>
        <Field label="Display order">
          <Input value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} inputMode="numeric" />
        </Field>
        <div className="sm:col-span-2">
          <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Available at the POS" description="Turn off to hide without deleting." />
        </div>
      </form>
    </Modal>
  );
}

function AddonModal({ value, onClose, onSaved }: { value: ServiceAddon | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const editing = value && value !== 'new' ? value : null;
  const [form, setForm] = useState({ name: '', description: '', price: '', is_active: true });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) return;
    setErrors({});
    setForm(editing ? { name: editing.name, description: editing.description ?? '', price: editing.price, is_active: editing.is_active } : { name: '', description: '', price: '', is_active: true });
  }, [value, editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, description: form.description || null };
      if (editing) await api.put(`/service-addons/${editing.id}`, payload);
      else await api.post('/service-addons', payload);
      toast.success(editing ? 'Add-on updated' : 'Add-on added', form.name);
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
      title={editing ? 'Edit add-on' : 'Add add-on'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="addon-form" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="addon-form" onSubmit={submit} className="space-y-4">
        <Field label="Name" required error={errors.name?.[0]}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Price" required error={errors.price?.[0]} hint="Charged per quantity selected at the POS">
          <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" leading={<span className="font-bold">₱</span>} />
        </Field>
        <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Available at the POS" />
      </form>
    </Modal>
  );
}
