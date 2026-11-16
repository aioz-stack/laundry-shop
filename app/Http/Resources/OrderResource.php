<?php

namespace App\Http\Resources;

use App\Enums\Permission;
use App\Enums\PricingType;
use App\Models\Order;
use App\Models\OrderItem;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_step' => $this->status->step(),
            'payment_status' => $this->payment_status->value,
            'payment_status_label' => $this->payment_status->label(),
            'subtotal' => $this->subtotal,
            'discount_type' => $this->discount_type,
            'discount_value' => $this->discount_value,
            'discount_amount' => $this->discount_amount,
            'discount_reason' => $this->discount_reason,
            'tax_rate' => $this->tax_rate,
            'tax_amount' => $this->tax_amount,
            'total' => $this->total,
            'amount_paid' => $this->amount_paid,
            'balance' => $this->balance,
            'notes' => $this->notes,
            'expected_at' => $this->expected_at?->toIso8601String(),
            'released_at' => $this->released_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'customer' => $this->whenLoaded('customer', fn () => [
                'id' => $this->customer->id,
                'customer_code' => $this->customer->customer_code,
                'name' => $this->customer->name,
                'phone' => $this->customer->phone,
            ]),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'released_by' => $this->whenLoaded('releaser', fn () => $this->releaser ? ['id' => $this->releaser->id, 'name' => $this->releaser->name] : null),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'laundry_service_id' => $item->laundry_service_id,
                'service_name' => $item->service_name,
                'pricing_type' => $item->pricing_type->value,
                'unit' => $item->pricing_type->unit(),
                'unit_price' => $item->unit_price,
                'quantity' => $item->quantity,
                'billable_quantity' => $item->billable_quantity,
                'line_total' => $item->line_total,
                'notes' => $item->notes,
            ])),
            'addons' => $this->whenLoaded('addons', fn () => $this->addons->map(fn ($addon) => [
                'id' => $addon->id,
                'service_addon_id' => $addon->service_addon_id,
                'addon_name' => $addon->addon_name,
                'unit_price' => $addon->unit_price,
                'quantity' => $addon->quantity,
                'line_total' => $addon->line_total,
            ])),
            'total_weight' => $this->whenLoaded('items', fn () => Money::fromCents($this->items
                ->filter(fn ($i) => $i->pricing_type === PricingType::PerKg)
                ->sum(fn ($i) => Money::toCents($i->quantity)))),
            'total_pieces' => $this->whenLoaded('items', fn () => (int) ($this->items
                ->filter(fn ($i) => $i->pricing_type === PricingType::PerPiece)
                ->sum(fn ($i) => Money::toCents($i->quantity)) / 100)),
            'payments' => $this->when(
                $request->user()?->hasPermission(Permission::PaymentsView) ?? false,
                fn () => PaymentResource::collection($this->whenLoaded('payments')),
            ),
            'status_history' => StatusHistoryResource::collection($this->whenLoaded('statusHistories')),
        ];
    }
}
