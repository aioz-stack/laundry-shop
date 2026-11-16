<?php

use App\Models\Payment;

beforeEach(fn () => seedCatalogue());

function createOrder(array $overrides = []): array
{
    return test()->postJson('/api/v1/orders', orderPayload($overrides))->assertSuccessful()->json('data');
}

test('a partial payment leaves an outstanding balance', function () {
    actingAsRole('operator');
    $order = createOrder(); // 175.00

    $this->postJson("/api/v1/orders/{$order['id']}/payments", [
        'payment_method_id' => method('cash')->id,
        'amount' => '100',
    ])->assertCreated()
        ->assertJsonPath('order.amount_paid', '100.00')
        ->assertJsonPath('order.balance', '75.00')
        ->assertJsonPath('order.payment_status', 'partially_paid');
});

test('multiple payments settle the order', function () {
    actingAsRole('operator');
    $order = createOrder();

    $this->postJson("/api/v1/orders/{$order['id']}/payments", ['payment_method_id' => method('cash')->id, 'amount' => '75'])->assertCreated();
    $this->postJson("/api/v1/orders/{$order['id']}/payments", [
        'payment_method_id' => method('gcash')->id, 'amount' => '100', 'reference_number' => '1234567890',
    ])->assertCreated()
        ->assertJsonPath('order.balance', '0.00')
        ->assertJsonPath('order.payment_status', 'paid');

    $this->postJson("/api/v1/orders/{$order['id']}/payments", ['payment_method_id' => method('cash')->id, 'amount' => '1'])
        ->assertStatus(422);
});

test('cash overpayment is recorded as change, not extra revenue', function () {
    actingAsRole('operator');
    $order = createOrder();

    $response = $this->postJson("/api/v1/orders/{$order['id']}/payments", [
        'payment_method_id' => method('cash')->id, 'amount' => '200',
    ])->assertCreated();

    $response->assertJsonPath('data.amount', '175.00')
        ->assertJsonPath('data.amount_tendered', '200.00')
        ->assertJsonPath('data.change_given', '25.00')
        ->assertJsonPath('order.payment_status', 'paid');
});

test('non-cash payments cannot exceed the balance and need a reference', function () {
    actingAsRole('operator');
    $order = createOrder();

    $this->postJson("/api/v1/orders/{$order['id']}/payments", ['payment_method_id' => method('gcash')->id, 'amount' => '50'])
        ->assertStatus(422)->assertJsonValidationErrors('reference_number');

    $this->postJson("/api/v1/orders/{$order['id']}/payments", [
        'payment_method_id' => method('gcash')->id, 'amount' => '500', 'reference_number' => 'X1',
    ])->assertStatus(422);
});

test('payment with an initial amount can be taken when the order is created', function () {
    actingAsRole('operator');

    $this->postJson('/api/v1/orders', orderPayload([
        'payment' => ['payment_method_id' => method('cash')->id, 'amount' => '100'],
    ]))->assertCreated()
        ->assertJsonPath('data.amount_paid', '100.00')
        ->assertJsonPath('data.balance', '75.00')
        ->assertJsonPath('data.payment_status', 'partially_paid');
});

test('duplicate payment submissions are prevented', function () {
    actingAsRole('operator');
    $order = createOrder();
    $key = '7a1e9b40-3c55-4e2d-8f0a-1b2c3d4e5f60';

    $payload = ['payment_method_id' => method('cash')->id, 'amount' => '50', 'idempotency_key' => $key];

    $this->postJson("/api/v1/orders/{$order['id']}/payments", $payload)->assertCreated();
    $this->postJson("/api/v1/orders/{$order['id']}/payments", $payload)->assertOk()->assertJsonPath('meta.duplicate', true);

    // Same amount again without a key within seconds is treated as a double-click.
    $this->postJson("/api/v1/orders/{$order['id']}/payments", ['payment_method_id' => method('cash')->id, 'amount' => '50'])
        ->assertStatus(409);

    expect(Payment::query()->count())->toBe(1);
});

test('refunds reduce collections and only the owner may refund', function () {
    actingAsRole('operator');
    $order = createOrder();
    $this->postJson("/api/v1/orders/{$order['id']}/payments", ['payment_method_id' => method('cash')->id, 'amount' => '175'])->assertCreated();

    $this->postJson("/api/v1/orders/{$order['id']}/refunds", ['payment_method_id' => method('cash')->id, 'amount' => '175', 'notes' => 'x'])
        ->assertForbidden();

    actingAsRole('owner');
    $this->postJson("/api/v1/orders/{$order['id']}/refunds", ['payment_method_id' => method('cash')->id, 'amount' => '200', 'notes' => 'x'])
        ->assertStatus(422);
    $this->postJson("/api/v1/orders/{$order['id']}/refunds", ['payment_method_id' => method('cash')->id, 'amount' => '175', 'notes' => 'Damaged item'])
        ->assertCreated()
        ->assertJsonPath('order.amount_paid', '0.00')
        ->assertJsonPath('order.payment_status', 'refunded');
});

test('reports count money collected, not order value', function () {
    actingAsRole('operator');
    $order = createOrder(['items' => [['service_id' => service('Comforter / Blanket')->id, 'quantity' => '2']]]); // 500
    $this->postJson("/api/v1/orders/{$order['id']}/payments", ['payment_method_id' => method('cash')->id, 'amount' => '200'])->assertCreated();

    actingAsRole('owner');
    $this->getJson('/api/v1/reports/sales')->assertOk()
        ->assertJsonPath('data.totals.order_value', '500.00')
        ->assertJsonPath('data.totals.collected', '200.00')
        ->assertJsonPath('data.totals.outstanding', '300.00');

    $report = $this->getJson('/api/v1/reports/payments')->assertOk()->json('data');
    expect(collect($report['by_method'])->firstWhere('code', 'cash')['net'])->toBe('200.00');

    $this->get('/api/v1/reports/sales?format=csv')->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
});
