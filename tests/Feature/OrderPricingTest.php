<?php

use App\Models\Order;
use App\Models\Setting;

beforeEach(fn () => seedCatalogue());

test('an order is priced on the server from current service prices', function () {
    actingAsRole('operator');

    $response = $this->postJson('/api/v1/orders', orderPayload([
        'items' => [
            ['service_id' => service('Wash, Dry & Fold')->id, 'quantity' => '5.5'], // 5.5 x 35 = 192.50
            ['service_id' => service('Ironing')->id, 'quantity' => '4'],            // 4 x 15 = 60.00
        ],
        'addons' => [['addon_id' => addon('Fabric Conditioner')->id, 'quantity' => 2]], // 2 x 15 = 30.00
        // Client-sent money values must be ignored.
        'subtotal' => '1.00',
        'total' => '1.00',
    ]));

    $response->assertCreated()
        ->assertJsonPath('data.subtotal', '282.50')
        ->assertJsonPath('data.total', '282.50')
        ->assertJsonPath('data.balance', '282.50')
        ->assertJsonPath('data.payment_status', 'unpaid')
        ->assertJsonPath('data.status', 'received')
        ->assertJsonPath('data.total_weight', '5.50')
        ->assertJsonPath('data.total_pieces', 4);

    expect($response->json('data.order_number'))->toMatch('/^LND-\d{8}-0001$/');
});

test('minimum kilogram charge is applied', function () {
    actingAsRole('operator');

    $this->postJson('/api/v1/orders', orderPayload([
        'items' => [['service_id' => service('Wash, Dry & Fold')->id, 'quantity' => '1.2']], // min 3 kg
    ]))->assertCreated()
        ->assertJsonPath('data.items.0.quantity', '1.20')
        ->assertJsonPath('data.items.0.billable_quantity', '3.00')
        ->assertJsonPath('data.total', '105.00');
});

test('per-piece services reject fractional quantities', function () {
    actingAsRole('operator');

    $this->postJson('/api/v1/orders', orderPayload([
        'items' => [['service_id' => service('Ironing')->id, 'quantity' => '2.5']],
    ]))->assertStatus(422)->assertJsonValidationErrors('items.0.quantity');
});

test('percent and fixed discounts are calculated and limited for operators', function () {
    actingAsRole('operator');

    // 10 kg x 35 = 350, 10% = 35
    $this->postJson('/api/v1/orders', orderPayload([
        'items' => [['service_id' => service('Wash, Dry & Fold')->id, 'quantity' => '10']],
        'discount' => ['type' => 'percent', 'value' => '10'],
    ]))->assertCreated()->assertJsonPath('data.discount_amount', '35.00')->assertJsonPath('data.total', '315.00');

    $this->postJson('/api/v1/orders', orderPayload([
        'items' => [['service_id' => service('Wash, Dry & Fold')->id, 'quantity' => '10']],
        'discount' => ['type' => 'fixed', 'value' => '50'],
    ]))->assertCreated()->assertJsonPath('data.total', '300.00');

    // Default operator cap is 20%.
    $this->postJson('/api/v1/orders', orderPayload([
        'discount' => ['type' => 'percent', 'value' => '50'],
    ]))->assertStatus(422)->assertJsonValidationErrors('discount.value');

    actingAsRole('owner');
    $this->postJson('/api/v1/orders', orderPayload([
        'items' => [['service_id' => service('Wash, Dry & Fold')->id, 'quantity' => '10']],
        'discount' => ['type' => 'percent', 'value' => '50'],
    ]))->assertCreated()->assertJsonPath('data.total', '175.00');
});

test('tax is applied after discount when configured', function () {
    Setting::putMany(['tax_rate' => '12.00']);
    actingAsRole('operator');

    // 10 x 35 = 350 - 50 = 300, 12% = 36 → 336
    $this->postJson('/api/v1/orders', orderPayload([
        'items' => [['service_id' => service('Wash, Dry & Fold')->id, 'quantity' => '10']],
        'discount' => ['type' => 'fixed', 'value' => '50'],
    ]))->assertCreated()->assertJsonPath('data.tax_amount', '36.00')->assertJsonPath('data.total', '336.00');
});

test('historical orders keep their original prices after a price change', function () {
    actingAsRole('operator');
    $orderId = $this->postJson('/api/v1/orders', orderPayload())->json('data.id'); // 5 x 35 = 175

    actingAsRole('owner');
    $service = service('Wash, Dry & Fold');
    $this->putJson("/api/v1/services/{$service->id}", [
        'name' => $service->name, 'pricing_type' => 'per_kg', 'price' => '50.00',
    ])->assertOk();

    $this->getJson("/api/v1/orders/{$orderId}")
        ->assertJsonPath('data.items.0.unit_price', '35.00')
        ->assertJsonPath('data.total', '175.00');

    $this->postJson('/api/v1/orders', orderPayload())->assertJsonPath('data.total', '250.00');
});

test('the quote endpoint previews totals without saving', function () {
    actingAsRole('operator');

    $this->postJson('/api/v1/orders/quote', [
        'items' => [['service_id' => service('Wash & Dry')->id, 'quantity' => '4']],
    ])->assertOk()->assertJsonPath('data.total', '100.00');

    expect(Order::query()->count())->toBe(0);
});

test('resubmitting the same client reference does not create a duplicate order', function () {
    actingAsRole('operator');
    $payload = orderPayload(['client_reference' => '0d4c6b2e-6e0f-4f7e-9b3e-2a4b6c8d0e1f']);

    $this->postJson('/api/v1/orders', $payload)->assertCreated();
    $this->postJson('/api/v1/orders', $payload)->assertOk()->assertJsonPath('meta.duplicate', true);

    expect(Order::query()->count())->toBe(1);
});

test('order numbers increment per day', function () {
    actingAsRole('operator');

    $first = $this->postJson('/api/v1/orders', orderPayload())->json('data.order_number');
    $second = $this->postJson('/api/v1/orders', orderPayload())->json('data.order_number');

    expect($first)->toEndWith('-0001')->and($second)->toEndWith('-0002');
});
