<?php

use App\Models\Customer;
use App\Models\LaundryService;
use App\Models\PaymentMethod;
use App\Models\ServiceAddon;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Laravel\Sanctum\Sanctum;

/**
 * Shared helpers for feature tests. Seeds the core catalogue (no demo data
 * because the testing environment is not "local").
 */
function seedCatalogue(): void
{
    test()->seed(DatabaseSeeder::class);
}

function actingAsRole(string $role): User
{
    $user = User::factory()->{$role}()->create();
    Sanctum::actingAs($user);

    return $user;
}

function service(string $name): LaundryService
{
    return LaundryService::query()->where('name', $name)->firstOrFail();
}

function addon(string $name): ServiceAddon
{
    return ServiceAddon::query()->where('name', $name)->firstOrFail();
}

function method(string $code): PaymentMethod
{
    return PaymentMethod::query()->where('code', $code)->firstOrFail();
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function orderPayload(array $overrides = []): array
{
    return array_replace([
        'customer_id' => Customer::factory()->create()->id,
        'items' => [['service_id' => service('Wash, Dry & Fold')->id, 'quantity' => '5']],
    ], $overrides);
}
