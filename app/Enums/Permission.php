<?php

namespace App\Enums;

/**
 * Permission names used with Gate / `can:` middleware.
 */
final class Permission
{
    public const DashboardView = 'dashboard.view';

    public const CustomersView = 'customers.view';

    public const CustomersManage = 'customers.manage';

    public const CustomersDelete = 'customers.delete';

    public const ServicesView = 'services.view';

    public const ServicesManage = 'services.manage';

    public const OrdersView = 'orders.view';

    public const OrdersCreate = 'orders.create';

    public const OrdersUpdate = 'orders.update';

    public const OrdersStatus = 'orders.status';

    public const OrdersRelease = 'orders.release';

    public const OrdersCancel = 'orders.cancel';

    public const DiscountsApply = 'discounts.apply';

    public const DiscountsUnlimited = 'discounts.unlimited';

    public const PaymentsView = 'payments.view';

    public const PaymentsCreate = 'payments.create';

    public const PaymentsRefund = 'payments.refund';

    public const ReportsView = 'reports.view';

    public const UsersManage = 'users.manage';

    public const SettingsManage = 'settings.manage';

    public const ActivityLogsView = 'activity_logs.view';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return array_values((new \ReflectionClass(self::class))->getConstants());
    }
}
