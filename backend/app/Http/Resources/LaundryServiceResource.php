<?php

namespace App\Http\Resources;

use App\Models\LaundryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LaundryService */
class LaundryServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'pricing_type' => $this->pricing_type->value,
            'pricing_label' => $this->pricing_type->label(),
            'unit' => $this->pricing_type->unit(),
            'price' => $this->price,
            'minimum_quantity' => $this->minimum_quantity,
            'turnaround_hours' => $this->turnaround_hours,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
        ];
    }
}
