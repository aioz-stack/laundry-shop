<?php

namespace Database\Factories;

use App\Models\ServiceAddon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceAddon>
 */
class ServiceAddonFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'price' => '10.00',
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
