import { useEffect, useState, type FormEvent } from 'react';
import { api, toApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import type { Customer } from '../../lib/types';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  customer?: Customer | null;
  /** Prefill when registering from the POS search box. */
  initial?: { name?: string; phone?: string };
}

const empty = { name: '', phone: '', email: '', address: '', notes: '' };

export function CustomerFormModal({ open, onClose, onSaved, customer, initial }: Props) {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      customer
        ? { name: customer.name, phone: customer.phone, email: customer.email ?? '', address: customer.address ?? '', notes: customer.notes ?? '' }
        : { ...empty, name: initial?.name ?? '', phone: initial?.phone ?? '' },
    );
  }, [open, customer, initial?.name, initial?.phone]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const payload = { ...form, email: form.email || null, address: form.address || null, notes: form.notes || null };
      const res = customer ? await api.put(`/customers/${customer.id}`, payload) : await api.post('/customers', payload);
      toast.success(customer ? 'Customer updated' : 'Customer registered', res.data.data.name);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      const apiError = toApiError(err);
      setErrors(apiError.errors);
      if (!Object.keys(apiError.errors).length) toast.error('Could not save customer', apiError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={busy}
      title={customer ? 'Edit customer' : 'Register new customer'}
      description={customer ? customer.customer_code : 'Name and phone number are all you need.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" loading={busy}>
            {customer ? 'Save changes' : 'Register customer'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone number" required error={errors.phone?.[0]} className="sm:col-span-1">
          <Input value={form.phone} onChange={set('phone')} placeholder="0917 123 4567" inputMode="tel" invalid={!!errors.phone} data-autofocus={!initial?.phone ? true : undefined} />
        </Field>
        <Field label="Full name" required error={errors.name?.[0]} className="sm:col-span-1">
          <Input value={form.name} onChange={set('name')} placeholder="Juan Dela Cruz" invalid={!!errors.name} data-autofocus={initial?.phone ? true : undefined} />
        </Field>
        <Field label="Email" hint="Optional" error={errors.email?.[0]} className="sm:col-span-2">
          <Input type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} />
        </Field>
        <Field label="Address" hint="Optional — useful for delivery" error={errors.address?.[0]} className="sm:col-span-2">
          <Input value={form.address} onChange={set('address')} />
        </Field>
        <Field label="Notes" error={errors.notes?.[0]} className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set('notes')} placeholder="e.g. Prefers unscented detergent" />
        </Field>
      </form>
    </Modal>
  );
}
