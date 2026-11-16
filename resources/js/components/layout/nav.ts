import {
  BarChart3,
  ClipboardList,
  CreditCard,
  History,
  LayoutDashboard,
  ScanLine,
  Settings,
  Shirt,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { P } from '../../lib/auth';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission: string;
}

export const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, permission: P.DashboardView }],
  },
  {
    title: 'Laundry Operations',
    items: [
      { label: 'Point of Sale', to: '/pos', icon: ScanLine, permission: P.OrdersCreate },
      { label: 'Orders', to: '/orders', icon: ClipboardList, permission: P.OrdersView },
      { label: 'Customers', to: '/customers', icon: Users, permission: P.CustomersView },
      { label: 'Laundry Tracking', to: '/tracking', icon: Shirt, permission: P.OrdersStatus },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Services & Pricing', to: '/services', icon: Tags, permission: P.ServicesManage },
      { label: 'Payments', to: '/payments', icon: CreditCard, permission: P.PaymentsView },
      { label: 'Reports', to: '/reports', icon: BarChart3, permission: P.ReportsView },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', to: '/users', icon: UserCog, permission: P.UsersManage },
      { label: 'Activity Logs', to: '/activity-logs', icon: History, permission: P.ActivityLogsView },
      { label: 'Settings', to: '/settings', icon: Settings, permission: P.SettingsManage },
    ],
  },
];
