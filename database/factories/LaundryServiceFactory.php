<?php

namespace Database\Factories;

use App\Enums\PricingType;
use App\Models\LaundryService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LaundryService>
 */
class LaundryServiceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'pricing_type' => PricingType::PerKg,
            'price' => '35.00',
            'minimum_quantity' => null,
            'turnaround_hours' => 24,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function perPiece(string $price = '15.00'): static
    {
        return $this->state(fn () => ['pricing_type' => PricingType::PerPiece, 'price' => $price]);
    }

    public function fixed(string $price = '250.00'): static
    {
        return $this->state(fn () => ['pricing_type' => PricingType::Fixed, 'price' => $price]);
    }
}
