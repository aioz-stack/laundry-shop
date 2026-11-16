<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\Role;
use App\Models\Customer;
use App\Models\LaundryService;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\ServiceAddon;
use App\Models\User;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Support\Money;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Two weeks of realistic sample activity, created through the real
 * OrderService / PaymentService so every number is consistent.
 *
 * Run manually with: php artisan db:seed --class=DemoSeeder
 */
class DemoSeeder extends Seeder
{
    public function run(OrderService $orders, PaymentService $payments): void
    {
        if (Order::query()->exists()) {
            $this->command?->info('Orders already exist; skipping demo data.');

            return;
        }

        mt_srand(20261116);

        // Fixed anchor: the loop below moves the test clock, so never derive days from now().
        $today = Carbon::now()->startOfDay();

        $operator = User::query()->where('role', Role::Operator->value)->firstOrFail();
        $owner = User::query()->where('role', Role::Owner->value)->firstOrFail();

        $names = [
            'Liza Mendoza', 'Ramon Bautista', 'Grace Villanueva', 'Paolo Garcia', 'Cristina Aquino',
            'Mark Fernandez', 'Joy Navarro', 'Rico Castillo', 'Hazel Ramos', 'Dennis Torres',
            'Kristine Flores', 'Arnel Domingo', 'Bea Salazar', 'Jerome Pascual', 'Nina Valdez',
        ];

        $customers = collect($names)->map(fn (string $name, int $i) => Customer::query()->create([
            'name' => $name,
            'phone' => sprintf('09%02d %03d %04d', 15 + $i, mt_rand(100, 999), mt_rand(1000, 9999)),
            'address' => $i % 3 === 0 ? 'Brgy. San Isidro, Quezon City' : null,
            'created_by' => $operator->id,
        ]));

        $services = LaundryService::query()->get()->keyBy('name');
        $addons = ServiceAddon::query()->get();
        $cash = PaymentMethod::query()->where('code', 'cash')->firstOrFail();
        $gcash = PaymentMethod::query()->where('code', 'gcash')->firstOrFail();

        $statusFlow = [OrderStatus::Washing, OrderStatus::Drying, OrderStatus::Folding, OrderStatus::ReadyForPickup, OrderStatus::Released];

        for ($daysAgo = 13; $daysAgo >= 0; $daysAgo--) {
            $perDay = mt_rand(3, 7);

            for ($n = 0; $n < $perDay; $n++) {
                Carbon::setTestNow($today->copy()->subDays($daysAgo)->setTime(mt_rand(8, 18), mt_rand(0, 59)));

                $items = [['service_id' => $services['Wash, Dry & Fold']->id, 'quantity' => (string) (mt_rand(30, 90) / 10)]];

                if (mt_rand(1, 4) === 1) {
                    $items[] = ['service_id' => $services['Ironing']->id, 'quantity' => (string) mt_rand(3, 12)];
                }

                if (mt_rand(1, 8) === 1) {
                    $items = [['service_id' => $services['Comforter / Blanket']->id, 'quantity' => '1']];
                }

                $orderAddons = mt_rand(1, 2) === 1 ? [['addon_id' => $addons[0]->id, 'quantity' => 1]] : [];

                $paymentPlan = mt_rand(1, 10);
                $method = mt_rand(1, 3) === 1 ? $gcash : $cash;

                ['order' => $order] = $orders->create([
                    'customer_id' => $customers->random()->id,
                    'items' => $items,
                    'addons' => $orderAddons,
                    'discount' => mt_rand(1, 12) === 1 ? ['type' => 'percent', 'value' => '10', 'reason' => 'Suki discount'] : [],
                ], $operator);

                $total = Money::toCents($order->total);

                if ($daysAgo === 5 && $n === 0) {
                    $orders->changeStatus($order, OrderStatus::Cancelled, $owner, 'Customer cancelled');

                    continue;
                }

                if ($paymentPlan <= 6) {
                    $payments->record($order, $this->paymentData($method, Money::fromCents($total)), $operator);
                } elseif ($paymentPlan <= 8) {
                    $payments->record($order, $this->paymentData($cash, Money::fromCents(intdiv($total, 200) * 100)), $operator);
                }

                // Older orders have progressed further through the shop.
                $target = match (true) {
                    $daysAgo >= 3 => 4,
                    $daysAgo === 2 => mt_rand(2, 3),
                    $daysAgo === 1 => mt_rand(0, 3),
                    default => mt_rand(-1, 1),
                };

                for ($step = 0; $step <= $target && $step < 4; $step++) {
                    Carbon::setTestNow(now()->addHours(3));
                    $orders->changeStatus($order, $statusFlow[$step], $operator);
                }

                if ($target >= 4) {
                    $order->refresh();

                    if (Money::toCents($order->balance) > 0) {
                        $payments->record($order, $this->paymentData($cash, $order->balance), $operator);
                    }

                    Carbon::setTestNow(now()->addHours(5));
                    $orders->changeStatus($order, OrderStatus::Released, $operator);
                }

            }
        }

        Carbon::setTestNow();
    }

    /** @return array<string, mixed> */
    private function paymentData(PaymentMethod $method, string $amount): array
    {
        return [
            'payment_method_id' => $method->id,
            'amount' => $amount,
            'reference_number' => $method->requires_reference ? (string) mt_rand(1000000000, 9999999999) : null,
        ];
    }
}
