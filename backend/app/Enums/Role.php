<?php

namespace App\Enums;

enum Role: string
{
    case Owner = 'owner';
    case Operator = 'operator';
    case Staff = 'staff';

    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Owner / Administrator',
            self::Operator => 'Desk Operator',
            self::Staff => 'Laundry Staff',
        };
    }

    /**
     * Permissions granted to the role. Checked by Laravel gates (see
     * AppServiceProvider) and mirrored to the client only for UI hints.
     *
     * @return list<string>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Owner => Permission::all(),
            self::Operator => [
                Permission::DashboardView,
                Permission::CustomersView,
                Permission::CustomersManage,
                Permission::ServicesView,
                Permission::OrdersView,
                Permission::OrdersCreate,
                Permission::OrdersUpdate,
                Permission::OrdersStatus,
                Permission::OrdersRelease,
                Permission::DiscountsApply,
                Permission::PaymentsView,
                Permission::PaymentsCreate,
            ],
            self::Staff => [
                Permission::DashboardView,
                Permission::ServicesView,
                Permission::OrdersView,
                Permission::OrdersStatus,
            ],
        };
    }

    public function can(string $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }
}
