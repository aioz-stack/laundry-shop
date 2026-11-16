<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\Permission;
use App\Exceptions\BusinessRuleException;
use App\Models\Customer;
use App\Models\LaundryService;
use App\Models\Order;
use App\Models\ServiceAddon;
use App\Models\Setting;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    public function __construct(
        private PricingCalculator $calculator,
        private SequenceGenerator $sequences,
        private PaymentService $payments,
    ) {}

    /**
     * Build a price quote without saving anything. Used by the POS preview so
     * the screen always shows the same numbers the backend will store.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function quote(array $data, User $user): array
    {
        $result = $this->price($data, $user);
        unset($result['subtotal_cents'], $result['discount_cents'], $result['total_cents']);

        return $result;
    }

    /**
     * Create an order (and its optional initial payment) atomically.
     *
     * @param  array<string, mixed>  $data  Validated StoreOrderRequest data
     * @return array{order: Order, duplicate: bool}
     */
    public function create(array $data, User $user): array
    {
        if (! empty($data['client_reference'])) {
            $existing = Order::query()->where('client_reference', $data['client_reference'])->first();

            if ($existing) {
                return ['order' => $existing, 'duplicate' => true];
            }
        }

        return DB::transaction(function () use ($data, $user) {
            $customer = Customer::query()->findOrFail($data['customer_id']);
            $pricing = $this->price($data, $user);

            $order = Order::create([
                'order_number' => $this->sequences->nextOrderNumber(),
                'client_reference' => $data['client_reference'] ?? null,
                'customer_id' => $customer->id,
                'status' => OrderStatus::Received,
                'payment_status' => $pricing['total_cents'] === 0 ? PaymentStatus::Paid : PaymentStatus::Unpaid,
                'subtotal' => $pricing['subtotal'],
                'discount_type' => $pricing['discount_type'],
                'discount_value' => $pricing['discount_value'],
                'discount_amount' => $pricing['discount_amount'],
                'discount_reason' => $pricing['discount_type'] ? ($data['discount']['reason'] ?? null) : null,
                'tax_rate' => $pricing['tax_rate'],
                'tax_amount' => $pricing['tax_amount'],
                'total' => $pricing['total'],
                'amount_paid' => '0.00',
                'balance' => $pricing['total'],
                'expected_at' => $this->expectedAt($data),
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            $order->items()->createMany($pricing['items']);
            $order->addons()->createMany($pricing['addons']);

            $order->statusHistories()->create([
                'from_status' => null,
                'to_status' => OrderStatus::Received,
                'remarks' => 'Order received',
                'user_id' => $user->id,
            ]);

            ActivityLogger::log('order.created', "Created order {$order->order_number} for {$customer->name} (₱{$order->total})", $order, [
                'total' => $order->total,
                'discount' => $order->discount_amount,
            ]);

            $payment = $data['payment'] ?? null;

            if ($payment && Money::toCents((string) ($payment['amount'] ?? '0')) > 0) {
                if (! $user->hasPermission(Permission::PaymentsCreate)) {
                    throw new BusinessRuleException('You are not allowed to accept payments.', [], 403);
                }

                $this->payments->record($order, [
                    'payment_method_id' => $payment['payment_method_id'],
                    'amount' => (string) $payment['amount'],
                    'reference_number' => $payment['reference_number'] ?? null,
                    'idempotency_key' => null,
                ], $user);
            }

            return ['order' => $order->refresh(), 'duplicate' => false];
        }, 3);
    }

    /**
     * Move an order to a new laundry status, enforcing role rules.
     */
    public function changeStatus(Order $order, OrderStatus $to, User $user, ?string $remarks = null): Order
    {
        return DB::transaction(function () use ($order, $to, $user, $remarks) {
            /** @var Order $order */
            $order = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $from = $order->status;

            $this->assertTransitionAllowed($order, $from, $to, $user, $remarks);

            $attributes = ['status' => $to];

            if ($to === OrderStatus::Released) {
                $attributes['released_at'] = now();
                $attributes['released_by'] = $user->id;
            }

            if ($to === OrderStatus::Cancelled) {
                $attributes['cancelled_at'] = now();
            }

            $order->forceFill($attributes)->save();

            if ($to === OrderStatus::Cancelled) {
                $this->payments->refreshTotals($order);
            }

            $order->statusHistories()->create([
                'from_status' => $from,
                'to_status' => $to,
                'remarks' => $remarks,
                'user_id' => $user->id,
            ]);

            ActivityLogger::log('order.status_changed', "{$order->order_number}: {$from->label()} → {$to->label()}", $order, [
                'from' => $from->value,
                'to' => $to->value,
                'remarks' => $remarks,
            ]);

            return $order->refresh();
        }, 3);
    }

    /**
     * @param  array{notes?: ?string, expected_at?: ?string}  $data
     */
    public function updateDetails(Order $order, array $data): Order
    {
        if ($order->status->isFinal()) {
            throw new BusinessRuleException('Released or cancelled orders can no longer be edited.');
        }

        $order->fill(array_intersect_key($data, array_flip(['notes', 'expected_at'])))->save();

        ActivityLogger::log('order.updated', "Updated details of {$order->order_number}", $order, $data);

        return $order;
    }

    private function assertTransitionAllowed(Order $order, OrderStatus $from, OrderStatus $to, User $user, ?string $remarks): void
    {
        if ($from === $to) {
            throw new BusinessRuleException("The order is already {$to->label()}.");
        }

        if ($from->isFinal()) {
            throw new BusinessRuleException("A {$from->label()} order can no longer change status.");
        }

        if ($to === OrderStatus::Cancelled) {
            if (! $user->hasPermission(Permission::OrdersCancel)) {
                throw new BusinessRuleException('Only the owner can cancel orders.', [], 403);
            }

            if (blank($remarks)) {
                throw ValidationException::withMessages(['remarks' => 'Please give a reason for cancelling.']);
            }

            return;
        }

        if ($to === OrderStatus::Released) {
            if (! $user->hasPermission(Permission::OrdersRelease)) {
                throw new BusinessRuleException('You are not allowed to release laundry.', [], 403);
            }

            if ($from !== OrderStatus::ReadyForPickup) {
                throw new BusinessRuleException('Only orders that are Ready for Pickup can be released.');
            }

            if (Setting::get('require_full_payment_on_release', true) && Money::toCents($order->balance) > 0) {
                throw new BusinessRuleException('The order still has an unpaid balance of ₱'.$order->balance.'. Collect payment before releasing.');
            }

            return;
        }

        // Remaining targets are processing statuses (Received..Ready).
        $isForward = $to->step() > $from->step();

        if (! $isForward) {
            if (! $user->isOwner()) {
                throw new BusinessRuleException('Orders can only move forward. Ask the owner to correct a status.', [], 403);
            }

            if (blank($remarks)) {
                throw ValidationException::withMessages(['remarks' => 'Please explain why the status is being moved back.']);
            }
        }

        if ($to === OrderStatus::Received && ! $user->isOwner()) {
            throw new BusinessRuleException('Orders cannot be moved back to Received.', [], 403);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function price(array $data, User $user): array
    {
        $serviceIds = collect($data['items'] ?? [])->pluck('service_id')->unique()->all();
        $services = LaundryService::query()->whereIn('id', $serviceIds)->where('is_active', true)->get()->keyBy('id');

        $items = [];

        foreach ($data['items'] ?? [] as $index => $item) {
            $service = $services->get($item['service_id']);

            if (! $service) {
                throw ValidationException::withMessages(["items.{$index}.service_id" => 'This service is no longer available.']);
            }

            $items[] = ['service' => $service, 'quantity' => (string) $item['quantity'], 'notes' => $item['notes'] ?? null];
        }

        $addonIds = collect($data['addons'] ?? [])->pluck('addon_id')->unique()->all();
        $addonModels = ServiceAddon::query()->whereIn('id', $addonIds)->where('is_active', true)->get()->keyBy('id');

        $addons = [];

        foreach ($data['addons'] ?? [] as $index => $line) {
            $addon = $addonModels->get($line['addon_id']);

            if (! $addon) {
                throw ValidationException::withMessages(["addons.{$index}.addon_id" => 'This add-on is no longer available.']);
            }

            $addons[] = ['addon' => $addon, 'quantity' => (int) ($line['quantity'] ?? 1)];
        }

        $discount = $data['discount'] ?? [];
        $hasDiscount = ! empty($discount['type']) && Money::toCents((string) ($discount['value'] ?? '0')) > 0;

        if ($hasDiscount && ! $user->hasPermission(Permission::DiscountsApply)) {
            throw new BusinessRuleException('You are not allowed to apply discounts.', [], 403);
        }

        $result = $this->calculator->calculate($items, $addons, $discount, (string) Setting::get('tax_rate', '0'));

        if ($hasDiscount && ! $user->hasPermission(Permission::DiscountsUnlimited)) {
            $maxPercent = Money::toCents((string) Setting::get('operator_max_discount_percent', '0'));

            // discount / subtotal <= max%  <=>  discount * 10000 <= subtotal * max(hundredths)
            if ($result['discount_cents'] * 10000 > $result['subtotal_cents'] * $maxPercent) {
                throw ValidationException::withMessages([
                    'discount.value' => 'Discounts above '.Money::fromCents($maxPercent).'% need owner approval.',
                ]);
            }
        }

        return $result;
    }

    /** @param array<string, mixed> $data */
    private function expectedAt(array $data): Carbon
    {
        if (! empty($data['expected_at'])) {
            return Carbon::parse($data['expected_at']);
        }

        $hours = LaundryService::query()
            ->whereIn('id', collect($data['items'] ?? [])->pluck('service_id'))
            ->max('turnaround_hours');

        $hours = $hours ?: (int) Setting::get('default_turnaround_hours', 48);

        return now()->addHours($hours);
    }
}
