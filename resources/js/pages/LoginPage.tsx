import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Eye, EyeOff, Lock, LogIn, User as UserIcon, Sparkles, Shirt, Timer } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { toApiError } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Alert } from '../components/ui/Feedback';
import { BrandMark } from '../components/layout/Brand';
import { ThemeToggle } from '../components/layout/UserMenu';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(username.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : user.permissions.includes('orders.create') && user.role === 'operator' ? '/pos' : '/', { replace: true });
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.errors.username?.[0] ?? apiError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(44,179,198,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(18,150,171,0.3),transparent_50%)]" />
        <svg className="absolute -right-24 -bottom-24 size-[520px] text-white/[0.04]" viewBox="0 0 200 200" fill="currentColor">
          <circle cx="100" cy="100" r="100" />
        </svg>
        <svg className="absolute top-24 -right-10 size-56 text-white/[0.05]" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="14">
          <circle cx="100" cy="100" r="80" />
        </svg>
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <BrandMark className="size-11 from-white/20 to-white/5 ring-1 ring-white/20" />
            <span className="text-lg font-extrabold tracking-tight">Laundry POS</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-[38px] leading-[1.1] font-extrabold tracking-tight">From drop-off to pickup, all in one counter.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-brand-100/80">Register customers, weigh loads, collect payments and print receipts in seconds — then track every basket until it's released.</p>
            <ul className="mt-8 space-y-3 text-[14px] text-brand-50/90">
              {[
                { icon: Timer, text: 'Create an order in under a minute' },
                { icon: Shirt, text: 'Live laundry tracking board' },
                { icon: Sparkles, text: 'Accurate balances and daily sales' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[12.5px] text-brand-100/50">© {new Date().getFullYear()} · Built for Philippine laundry shops</p>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex items-center justify-center px-5 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[400px] animate-pop-in">
          <div className="mb-8 lg:hidden">
            <BrandMark className="size-12" />
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink-900 dark:text-white">Welcome back</h1>
          <p className="mt-1.5 text-ink-500">Sign in to open the counter.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="Username" htmlFor="username">
              <Input id="username" autoFocus autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} leading={<UserIcon className="size-4" />} className="h-12" required />
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} leading={<Lock className="size-4" />} className="h-12 pr-12" required />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-ink-400 hover:text-ink-700" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={busy} icon={<LogIn className="size-[18px]" />}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
