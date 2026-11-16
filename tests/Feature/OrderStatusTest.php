<?php

use App\Models\Setting;

beforeEach(fn () => seedCatalogue());

function newOrderId(): int
{
    return test()->postJson('/api/v1/orders', orderPayload())->assertCreated()->json('data.id');
}

function moveTo(int $id, string $status, ?string $remarks = null)
{
    return test()->postJson("/api/v1/orders/{$id}/status", array_filter(['status' => $status, 'remarks' => $remarks]));
}

test('staff move orders forward and every change is recorded in history', function () {
    actingAsRole('operator');
    $id = newOrderId();

    $staff = actingAsRole('staff');
    moveTo($id, 'washing')->assertOk()->assertJsonPath('data.status', 'washing');
    moveTo($id, 'drying')->assertOk();
    moveTo($id, 'ready_for_pickup')->assertOk(); // skipping Folding is allowed

    $history = $this->getJson("/api/v1/orders/{$id}/history")->assertOk()->json('data');

    expect($history)->toHaveCount(4)
        ->and($history[1]['from_status'])->toBe('received')
        ->and($history[1]['to_status'])->toBe('washing')
        ->and($history[1]['user']['id'])->toBe($staff->id);
});

test('staff cannot move orders backward, release or cancel', function () {
    actingAsRole('operator');
    $id = newOrderId();

    actingAsRole('staff');
    moveTo($id, 'drying')->assertOk();
    moveTo($id, 'washing')->assertForbidden();
    moveTo($id, 'cancelled', 'x')->assertForbidden();
    moveTo($id, 'ready_for_pickup')->assertOk();
    moveTo($id, 'released')->assertForbidden();
});

test('orders with a balance cannot be released', function () {
    actingAsRole('operator');
    $id = newOrderId();
    moveTo($id, 'ready_for_pickup')->assertOk();

    moveTo($id, 'released')->assertStatus(422);

    $this->postJson("/api/v1/orders/{$id}/payments", ['payment_method_id' => method('cash')->id, 'amount' => '175'])->assertCreated();

    moveTo($id, 'released')->assertOk()
        ->assertJsonPath('data.status', 'released')
        ->assertJsonPath('data.released_by.name', fn ($n) => is_string($n));

    moveTo($id, 'washing')->assertStatus(422); // final state
});

test('release with balance is allowed when the setting is turned off', function () {
    Setting::putMany(['require_full_payment_on_release' => false]);
    actingAsRole('operator');
    $id = newOrderId();
    moveTo($id, 'ready_for_pickup')->assertOk();
    moveTo($id, 'released')->assertOk();
});

test('only received to ready orders can be released', function () {
    actingAsRole('operator');
    $id = newOrderId();
    moveTo($id, 'released')->assertStatus(422);
});

test('owner can cancel with a reason and correct a status backwards', function () {
    actingAsRole('operator');
    $id = newOrderId();
    moveTo($id, 'folding')->assertOk();

    actingAsRole('owner');
    moveTo($id, 'washing')->assertStatus(422)->assertJsonValidationErrors('remarks');
    moveTo($id, 'washing', 'Needs rewash')->assertOk();
    moveTo($id, 'cancelled')->assertStatus(422);
    moveTo($id, 'cancelled', 'Customer request')->assertOk()
        ->assertJsonPath('data.status', 'cancelled')
        ->assertJsonPath('data.balance', '0.00');
});

test('order receipt contains shop details and order lines', function () {
    actingAsRole('operator');
    $id = newOrderId();

    $this->getJson("/api/v1/orders/{$id}/receipt")->assertOk()
        ->assertJsonPath('data.shop.name', 'Fresh Fold Laundry')
        ->assertJsonPath('data.order.items.0.service_name', 'Wash, Dry & Fold')
        ->assertJsonPath('data.order.total', '175.00')
        ->assertJsonStructure(['data' => ['terms', 'footer', 'paper_width', 'order' => ['customer' => ['name', 'phone'], 'expected_at']]]);
});

test('orders can be searched by number, name and phone and filtered by status', function () {
    actingAsRole('operator');
    $order = $this->postJson('/api/v1/orders', orderPayload())->json('data');
    newOrderId();

    $this->getJson('/api/v1/orders?q='.$order['order_number'])->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/orders?q='.urlencode($order['customer']['name']))->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/orders?q='.$order['customer']['phone'])->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/orders?status=washing')->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/orders?payment_status=unpaid')->assertJsonCount(2, 'data');
});

test('dashboard returns real statistics', function () {
    actingAsRole('operator');
    $id = newOrderId();
    $this->postJson("/api/v1/orders/{$id}/payments", ['payment_method_id' => method('cash')->id, 'amount' => '100'])->assertCreated();

    $this->getJson('/api/v1/dashboard')->assertOk()
        ->assertJsonPath('data.stats.today_orders', 1)
        ->assertJsonPath('data.stats.today_sales', '100.00')
        ->assertJsonPath('data.stats.unpaid_balance', '75.00')
        ->assertJsonPath('data.stats.pending_orders', 1);
});
