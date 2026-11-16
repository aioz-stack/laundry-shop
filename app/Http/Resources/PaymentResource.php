<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Payment */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payment_number' => $this->payment_number,
            'type' => $this->type->value,
            'amount' => $this->amount,
            'amount_tendered' => $this->amount_tendered,
            'change_given' => $this->change_given,
            'reference_number' => $this->reference_number,
            'notes' => $this->notes,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'method' => $this->whenLoaded('method', fn () => [
                'id' => $this->method->id,
                'name' => $this->method->name,
                'code' => $this->method->code,
            ]),
            'received_by' => $this->whenLoaded('receiver', fn () => $this->receiver ? [
                'id' => $this->receiver->id,
                'name' => $this->receiver->name,
            ] : null),
            'order' => $this->whenLoaded('order', fn () => [
                'id' => $this->order->id,
                'order_number' => $this->order->order_number,
                'customer_name' => $this->order->relationLoaded('customer') ? $this->order->customer?->name : null,
            ]),
        ];
    }
}
