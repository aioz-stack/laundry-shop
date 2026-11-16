<?php

namespace App\Models;

use App\Enums\PricingType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'laundry_service_id', 'service_name', 'pricing_type',
        'unit_price', 'quantity', 'billable_quantity', 'line_total', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'pricing_type' => PricingType::class,
            'unit_price' => 'decimal:2',
            'quantity' => 'decimal:2',
            'billable_quantity' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
