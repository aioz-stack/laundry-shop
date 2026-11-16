<?php

namespace App\Models;

use App\Enums\PricingType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LaundryService extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'description', 'pricing_type', 'price', 'minimum_quantity',
        'turnaround_hours', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'pricing_type' => PricingType::class,
            'price' => 'decimal:2',
            'minimum_quantity' => 'decimal:2',
            'is_active' => 'boolean',
            'turnaround_hours' => 'integer',
            'sort_order' => 'integer',
        ];
    }
}
