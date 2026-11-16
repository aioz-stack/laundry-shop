<?php

use App\Models\Customer;

beforeEach(fn () => seedCatalogue());

test('desk operators cannot manage services, reports, users or settings', function () {
    actingAsRole('operator');

    $this->postJson('/api/v1/services', ['name' => 'X', 'pricing_type' => 'per_kg', 'price' => '1'])->assertForbidden();
    $this->getJson('/api/v1/reports/sales')->assertForbidden();
    $this->getJson('/api/v1/users')->assertForbidden();
    $this->putJson('/api/v1/settings', ['shop_name' => 'Hacked'])->assertForbidden();
    $this->getJson('/api/v1/activity-logs')->assertForbidden();
});

test('laundry staff cannot create orders, customers or take payments', function () {
    actingAsRole('staff');

    $this->postJson('/api/v1/customers', ['name' => 'A', 'phone' => '09171234567'])->assertForbidden();
    $this->postJson('/api/v1/orders', orderPayload())->assertForbidden();
    $this->getJson('/api/v1/payments')->assertForbidden();
    $this->getJson('/api/v1/orders')->assertOk();
});

test('the owner can access administrative endpoints', function () {
    actingAsRole('owner');

    $this->getJson('/api/v1/reports/sales')->assertOk();
    $this->getJson('/api/v1/users')->assertOk();
    $this->getJson('/api/v1/activity-logs')->assertOk();
    $this->putJson('/api/v1/settings', ['shop_name' => 'Suds & Co'])->assertOk()->assertJsonPath('data.shop_name', 'Suds & Co');
});

test('operators can register and search customers by phone', function () {
    actingAsRole('operator');

    $this->postJson('/api/v1/customers', ['name' => 'Liza Mendoza', 'phone' => '0917 555 1234'])
        ->assertCreated()
        ->assertJsonPath('data.customer_code', fn ($code) => str_starts_with($code, 'CUST-'));

    $this->getJson('/api/v1/customers?q=09175551234')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/customers?q=Liza')->assertOk()->assertJsonCount(1, 'data');
});

test('customers with orders cannot be deleted', function () {
    actingAsRole('operator');
    $payload = orderPayload();
    $this->postJson('/api/v1/orders', $payload)->assertCreated();

    actingAsRole('owner');
    $this->deleteJson('/api/v1/customers/'.$payload['customer_id'])->assertStatus(409);

    $fresh = Customer::factory()->create();
    $this->deleteJson('/api/v1/customers/'.$fresh->id)->assertOk();
});
