<?php

namespace App\Http\Resources;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PaymentMethod */
class PaymentMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'requires_reference' => $this->requires_reference,
            'is_cash' => $this->is_cash,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
        ];
    }
}
