<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentType;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Business reporting. "Collected" always means money actually received
 * (payments minus refunds), never order value.
 */
class ReportService
{
    /** @return array<string, mixed> */
    public function sales(Carbon $from, Carbon $to, string $groupBy = 'day'): array
    {
        $orders = Order::query()
            ->notCancelled()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as orders_count, SUM(ROUND(total * 100)) as value_cents, SUM(ROUND(discount_amount * 100)) as discount_cents')
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $collections = $this->collectionsByDay($from, $to);

        $periods = [];
        $cursor = $from->copy()->startOfDay();

        while ($cursor->lte($to)) {
            $day = $cursor->toDateString();
            $key = $this->periodKey($cursor, $groupBy);

            $periods[$key] ??= [
                'period' => $key,
                'label' => $this->periodLabel($cursor, $groupBy),
                'orders_count' => 0,
                'order_value_cents' => 0,
                'discount_cents' => 0,
                'collected_cents' => 0,
            ];

            $row = $orders->get($day);
            $periods[$key]['orders_count'] += (int) ($row->orders_count ?? 0);
            $periods[$key]['order_value_cents'] += (int) ($row->value_cents ?? 0);
            $periods[$key]['discount_cents'] += (int) ($row->discount_cents ?? 0);
            $periods[$key]['collected_cents'] += $collections[$day] ?? 0;

            $cursor->addDay();
        }

        $rows = array_map(fn (array $p) => [
            'period' => $p['period'],
            'label' => $p['label'],
            'orders_count' => $p['orders_count'],
            'order_value' => Money::fromCents($p['order_value_cents']),
            'discounts' => Money::fromCents($p['discount_cents']),
            'collected' => Money::fromCents($p['collected_cents']),
        ], array_values($periods));

        $outstanding = (int) Order::query()
            ->notCancelled()
            ->whereBetween('created_at', [$from, $to])
            ->sum(DB::raw('ROUND(balance * 100)'));

        return [
            'range' => $this->range($from, $to, $groupBy),
            'totals' => [
                'orders_count' => array_sum(array_column($periods, 'orders_count')),
                'order_value' => Money::fromCents(array_sum(array_column($periods, 'order_value_cents'))),
                'discounts' => Money::fromCents(array_sum(array_column($periods, 'discount_cents'))),
                'collected' => Money::fromCents(array_sum(array_column($periods, 'collected_cents'))),
                'outstanding' => Money::fromCents($outstanding),
            ],
            'rows' => $rows,
        ];
    }

    /** @return array<string, mixed> */
    public function orders(Carbon $from, Carbon $to): array
    {
        $base = Order::query()->whereBetween('created_at', [$from, $to]);

        $byStatus = (clone $base)->selectRaw('status, COUNT(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status');

        $statusRows = array_map(fn (OrderStatus $s) => [
            'status' => $s->value,
            'label' => $s->label(),
            'count' => (int) ($byStatus[$s->value] ?? 0),
        ], OrderStatus::cases());

        $nonCancelled = (clone $base)->notCancelled();
        $count = (clone $nonCancelled)->count();
        $value = (int) (clone $nonCancelled)->sum(DB::raw('ROUND(total * 100)'));

        $services = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereBetween('orders.created_at', [$from, $to])
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->selectRaw('order_items.service_name, order_items.pricing_type, COUNT(*) as lines_count, SUM(ROUND(order_items.quantity * 100)) as qty_hundredths, SUM(ROUND(order_items.line_total * 100)) as revenue_cents')
            ->groupBy('order_items.service_name', 'order_items.pricing_type')
            ->orderByDesc('revenue_cents')
            ->get()
            ->map(fn ($r) => [
                'service_name' => $r->service_name,
                'pricing_type' => $r->pricing_type instanceof \BackedEnum ? $r->pricing_type->value : $r->pricing_type,
                'orders_count' => (int) $r->lines_count,
                'quantity' => Money::fromCents((int) $r->qty_hundredths),
                'revenue' => Money::fromCents((int) $r->revenue_cents),
            ])->all();

        return [
            'range' => $this->range($from, $to),
            'totals' => [
                'total_orders' => (int) $byStatus->sum(),
                'completed_orders' => (int) ($byStatus[OrderStatus::Released->value] ?? 0),
                'cancelled_orders' => (int) ($byStatus[OrderStatus::Cancelled->value] ?? 0),
                'active_orders' => (int) collect(OrderStatus::active())->sum(fn ($s) => $byStatus[$s->value] ?? 0),
                'order_value' => Money::fromCents($value),
                'average_order_value' => Money::fromCents($count > 0 ? intdiv($value + intdiv($count, 2), $count) : 0),
            ],
            'by_status' => $statusRows,
            'by_service' => $services,
        ];
    }

    /** @return array<string, mixed> */
    public function payments(Carbon $from, Carbon $to): array
    {
        $rows = Payment::query()
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('payment_method_id, type, COUNT(*) as tx_count, SUM(ROUND(amount * 100)) as amount_cents')
            ->groupBy('payment_method_id', 'type')
            ->get();

        $methods = PaymentMethod::query()->orderBy('sort_order')->get();

        $byMethod = $methods->map(function (PaymentMethod $method) use ($rows) {
            $mine = $rows->where('payment_method_id', $method->id);
            $received = (int) $mine->filter(fn ($r) => $this->typeValue($r->type) === PaymentType::Payment->value)->sum('amount_cents');
            $refunded = (int) $mine->filter(fn ($r) => $this->typeValue($r->type) === PaymentType::Refund->value)->sum('amount_cents');

            return [
                'payment_method_id' => $method->id,
                'name' => $method->name,
                'code' => $method->code,
                'transactions' => (int) $mine->sum('tx_count'),
                'received' => Money::fromCents($received),
                'refunded' => Money::fromCents($refunded),
                'net' => Money::fromCents($received - $refunded),
                'net_cents' => $received - $refunded,
            ];
        })->filter(fn ($m) => $m['transactions'] > 0 || $methods->firstWhere('id', $m['payment_method_id'])?->is_active)->values();

        $transactions = Payment::query()
            ->with(['method:id,name', 'order:id,order_number,customer_id', 'order.customer:id,name', 'receiver:id,name'])
            ->whereBetween('paid_at', [$from, $to])
            ->latest('paid_at')
            ->limit(500)
            ->get();

        $net = (int) $byMethod->sum('net_cents');

        return [
            'range' => $this->range($from, $to),
            'totals' => [
                'collected' => Money::fromCents($net),
                'transactions' => (int) $byMethod->sum('transactions'),
            ],
            'by_method' => $byMethod->map(fn ($m) => collect($m)->except('net_cents')->all())->all(),
            'transactions' => $transactions,
        ];
    }

    /**
     * Net collections (payments minus refunds) per calendar day, in centavos.
     *
     * @return array<string, int>
     */
    public function collectionsByDay(Carbon $from, Carbon $to): array
    {
        return Payment::query()
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw("DATE(paid_at) as day, SUM(CASE WHEN type = 'refund' THEN -ROUND(amount * 100) ELSE ROUND(amount * 100) END) as net_cents")
            ->groupBy('day')
            ->pluck('net_cents', 'day')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    private function typeValue(mixed $type): string
    {
        return $type instanceof \BackedEnum ? (string) $type->value : (string) $type;
    }

    private function periodKey(Carbon $day, string $groupBy): string
    {
        return match ($groupBy) {
            'week' => $day->copy()->startOfWeek(Carbon::MONDAY)->toDateString(),
            'month' => $day->format('Y-m'),
            default => $day->toDateString(),
        };
    }

    private function periodLabel(Carbon $day, string $groupBy): string
    {
        return match ($groupBy) {
            'week' => 'Week of '.$day->copy()->startOfWeek(Carbon::MONDAY)->format('M j'),
            'month' => $day->format('F Y'),
            default => $day->format('M j, Y'),
        };
    }

    /** @return array<string, string> */
    private function range(Carbon $from, Carbon $to, ?string $groupBy = null): array
    {
        return array_filter([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'group_by' => $groupBy,
        ]);
    }
}
