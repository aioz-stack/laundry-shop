import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { api, toApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { cn, relativeTime } from '../../lib/format';
import { useApiQuery } from '../../lib/hooks';
import { useToast } from '../../lib/toast';
import type { Paginated, RoleName, User } from '../../lib/types';
import { Card, PageHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Field, Input, Toggle } from '../../components/ui/Field';
import { ErrorState } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/layout/UserMenu';

const ROLES: Array<{ value: RoleName; label: string; description: string }> = [
  { value: 'owner', label: 'Owner / Administrator', description: 'Full access: pricing, reports, users and settings.' },
  { value: 'operator', label: 'Desk Operator', description: 'POS, customers, payments, receipts and releasing laundry.' },
  { value: 'staff', label: 'Laundry Staff', description: 'Views active orders and updates washing / drying / folding.' },
];

const ROLE_STYLE: Record<RoleName, string> = {
  owner: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
  operator: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20',
  staff: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
};

export function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApiQuery<Paginated<User>>('/users', { per_page: 100 }, (r) => r);
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Employee',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} url={u.avatar_url} />
          <div>
            <p className="font-semibold text-ink-900 dark:text-white">
              {u.name} {u.id === me?.id && <span className="text-[12px] font-medium text-ink-400">(you)</span>}
            </p>
            <p className="text-[12.5px] text-ink-500">@{u.username}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: (u) => <Badge className={ROLE_STYLE[u.role]}>{u.role_label}</Badge> },
    { key: 'contact', header: 'Contact', hideOnMobile: true, cell: (u) => <span className="text-[13px] text-ink-500">{u.phone || u.email || '—'}</span> },
    { key: 'last', header: 'Last sign-in', hideOnMobile: true, cell: (u) => <span className="text-[13px] text-ink-500">{u.last_login_at ? relativeTime(u.last_login_at) : 'Never'}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => <Badge className={u.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20' : 'bg-ink-100 text-ink-500 ring-ink-200'}>{u.is_active ? 'Active' : 'Deactivated'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}>
            <Pencil className="size-4" />
          </Button>
          {u.id !== me?.id && (
            <Button size="icon" variant="ghost" className="hover:text-rose-600" onClick={() => setDeleting(u)} aria-label={`Delete ${u.name}`}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users & employees"
        description="Who can sign in, and what each person can do."
        actions={
          <Button icon={<UserPlus className="size-4" />} onClick={() => setEditing('new')}>
            Add user
          </Button>
        }
      />
      <Card>{error ? <ErrorState message={error.message} onRetry={reload} /> : <DataTable columns={columns} rows={data?.data} loading={loading} rowKey={(u) => u.id} />}</Card>

      <UserModal value={editing} onClose={() => setEditing(null)} onSaved={reload} />
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name}?`}
        message="Users with orders or payments on record can't be deleted — deactivate them instead so history stays intact."
        confirmLabel="Delete user"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await api.delete(`/users/${deleting!.id}`);
            toast.success('User deleted');
            reload();
          } catch (e) {
            toast.error('Could not delete user', toApiError(e).message);
          }
          setDeleting(null);
        }}
      />
    </>
  );
}

function UserModal({ value, onClose, onSaved }: { value: User | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const editing = value && value !== 'new' ? value : null;
  const [form, setForm] = useState({ name: '', username: '', email: '', phone: '', role: 'operator' as RoleName, is_active: true, password: '' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!value) return;
    setErrors({});
    setMessage(null);
    setForm(
      editing
        ? { name: editing.name, username: editing.username, email: editing.email ?? '', phone: editing.phone ?? '', role: editing.role, is_active: editing.is_active, password: '' }
        : { name: '', username: '', email: '', phone: '', role: 'operator', is_active: true, password: '' },
    );
  }, [value, editing]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const payload = { ...form, email: form.email || null, phone: form.phone || null, password: form.password || null };
      if (editing) await api.put(`/users/${editing.id}`, payload);
      else await api.post('/users', payload);
      toast.success(editing ? 'User updated' : 'User created', form.name);
      onSaved();
      onClose();
    } catch (err) {
      const apiError = toApiError(err);
      setErrors(apiError.errors);
      if (!Object.keys(apiError.errors).length) setMessage(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!value}
      onClose={onClose}
      locked={busy}
      size="lg"
      title={editing ? `Edit ${editing.name}` : 'Add user'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={busy}>
            Save user
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {message && <p className="text-[13px] font-medium text-rose-600 sm:col-span-2">{message}</p>}
        <Field label="Full name" required error={errors.name?.[0]}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Username" required error={errors.username?.[0]} hint="Used to sign in">
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
        </Field>
        <Field label="Email" error={errors.email?.[0]}>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone" error={errors.phone?.[0]}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <p className="label">Role</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => setForm({ ...form, role: r.value })}
                className={cn('rounded-xl border-2 p-3 text-left transition', form.role === r.value ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-ink-200 dark:border-ink-700')}
              >
                <span className="flex items-center gap-1.5 font-bold text-ink-900 dark:text-white">
                  {form.role === r.value && <ShieldCheck className="size-4 text-brand-600" />}
                  {r.label}
                </span>
                <span className="mt-1 block text-[12.5px] text-ink-500">{r.description}</span>
              </button>
            ))}
          </div>
          {errors.role?.[0] && <p className="mt-1.5 text-[12.5px] text-rose-600">{errors.role[0]}</p>}
        </div>
        <Field label={editing ? 'New password' : 'Password'} required={!editing} hint={editing ? 'Leave blank to keep the current password' : 'At least 8 characters'} error={errors.password?.[0]} className="sm:col-span-2">
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
        </Field>
        {editing && (
          <div className="sm:col-span-2">
            <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Account active" description="Deactivated users are signed out and can't sign in." />
          </div>
        )}
      </form>
    </Modal>
  );
}
