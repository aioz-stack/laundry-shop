<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '09'.fake()->unique()->numerify('#########'),
            'email' => fake()->optional(0.3)->safeEmail(),
            'address' => fake()->optional(0.5)->streetAddress(),
        ];
    }
}
