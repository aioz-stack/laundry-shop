<?php

namespace App\Http\Resources;

use App\Models\Customer;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/** @mixin Customer */
class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_code' => $this->customer_code,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
            'orders_count' => $this->whenHas('orders_count', fn () => (int) $this->orders_count),
            'total_spent' => $this->whenHas('total_spent_cents', fn () => Money::fromCents((int) $this->total_spent_cents)),
            'outstanding_balance' => $this->whenHas('outstanding_cents', fn () => Money::fromCents((int) $this->outstanding_cents)),
            'last_order_at' => $this->whenHas('last_order_at', fn () => $this->last_order_at ? Carbon::parse($this->last_order_at)->toIso8601String() : null),
        ];
    }
}
