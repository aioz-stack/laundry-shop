import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, AUTH_MODE, ensureCsrfCookie, setUnauthorizedHandler, tokenStore } from './api';
import type { Settings, User } from './types';

interface AuthValue {
  user: User | null;
  settings: Settings | null;
  booting: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [booting, setBooting] = useState(true);

  const refreshSettings = useCallback(async () => {
    const res = await api.get('/settings');
    setSettings(res.data.data);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.set(null);
      setUser(null);
    });

    if (AUTH_MODE === 'token' && !tokenStore.get()) {
      setBooting(false);
      return;
    }

    api
      .get('/auth/me')
      .then(async (res) => {
        setUser(res.data.data);
        await refreshSettings().catch(() => undefined);
      })
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, [refreshSettings]);

  const login = useCallback(
    async (username: string, password: string) => {
      await ensureCsrfCookie();
      const res = await api.post('/auth/login', {
        username,
        password,
        ...(AUTH_MODE === 'token' ? { device_name: navigator.userAgent.slice(0, 90) || 'web' } : {}),
      });

      if (AUTH_MODE === 'token') {
        if (res.data.token) tokenStore.set(res.data.token);
      } else if (res.data.token) {
        // Cookie clients should never receive a bearer token. The server
        // treated this as a token client because the request was not
        // stateful, so no session cookie was created and every later API
        // call would silently 401. Revoke the token and explain the fix.
        await api
          .post('/auth/logout', {}, { headers: { Authorization: `Bearer ${res.data.token}` } })
          .catch(() => undefined);
        throw new Error(
          `The server did not start a browser session for "${window.location.host}". Add that host to SANCTUM_STATEFUL_DOMAINS (or set APP_URL to the public URL), then run "php artisan config:clear" on the server.`,
        );
      }

      setUser(res.data.data);
      await refreshSettings().catch(() => undefined);
      return res.data.data as User;
    },
    [refreshSettings],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      settings,
      booting,
      login,
      logout,
      refreshSettings,
      can: (permission: string) => !!user?.permissions.includes(permission),
    }),
    [user, settings, booting, login, logout, refreshSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Permission names (mirrors App\Enums\Permission on the backend). */
export const P = {
  DashboardView: 'dashboard.view',
  CustomersView: 'customers.view',
  CustomersManage: 'customers.manage',
  CustomersDelete: 'customers.delete',
  ServicesView: 'services.view',
  ServicesManage: 'services.manage',
  OrdersView: 'orders.view',
  OrdersCreate: 'orders.create',
  OrdersUpdate: 'orders.update',
  OrdersStatus: 'orders.status',
  OrdersRelease: 'orders.release',
  OrdersCancel: 'orders.cancel',
  DiscountsApply: 'discounts.apply',
  PaymentsView: 'payments.view',
  PaymentsCreate: 'payments.create',
  PaymentsRefund: 'payments.refund',
  ReportsView: 'reports.view',
  UsersManage: 'users.manage',
  SettingsManage: 'settings.manage',
  ActivityLogsView: 'activity_logs.view',
} as const;
