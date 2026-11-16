<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\ReportService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(Request $request, ReportService $reports): JsonResponse
    {
        $user = $request->user();
        $canSeeMoney = $user->hasPermission(Permission::PaymentsView);

        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        $statusCounts = Order::query()
            ->whereIn('status', array_map(fn ($s) => $s->value, OrderStatus::active()))
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $count = fn (OrderStatus ...$statuses) => (int) collect($statuses)->sum(fn ($s) => $statusCounts[$s->value] ?? 0);

        $todayOrders = Order::query()->notCancelled()->whereBetween('created_at', [$todayStart, $todayEnd]);

        $stats = [
            'today_orders' => (clone $todayOrders)->count(),
            'pending_orders' => $count(OrderStatus::Received),
            'processing_orders' => $count(OrderStatus::Washing, OrderStatus::Drying, OrderStatus::Folding),
            'ready_orders' => $count(OrderStatus::ReadyForPickup),
        ];

        if ($canSeeMoney) {
            $collected = $reports->collectionsByDay($todayStart, $todayEnd);
            $stats['today_sales'] = Money::fromCents(array_sum($collected));
            $stats['today_order_value'] = Money::fromCents((int) (clone $todayOrders)->sum(DB::raw('ROUND(total * 100)')));
            $stats['unpaid_balance'] = Money::fromCents((int) Order::query()->notCancelled()->sum(DB::raw('ROUND(balance * 100)')));
            $stats['unpaid_orders'] = Order::query()->notCancelled()->where('balance', '>', 0)->count();
        }

        $chartFrom = now()->subDays(13)->startOfDay();
        $chart = $canSeeMoney ? $reports->sales($chartFrom, $todayEnd, 'day')['rows'] : [];

        $recentOrders = Order::query()->with('customer')->latest()->limit(8)->get();

        $recentPayments = $canSeeMoney
            ? Payment::query()->with(['method:id,name,code', 'order:id,order_number,customer_id', 'order.customer:id,name', 'receiver:id,name'])->latest('paid_at')->latest('id')->limit(8)->get()
            : collect();

        return response()->json(['data' => [
            'stats' => $stats,
            'status_overview' => array_map(fn (OrderStatus $s) => [
                'status' => $s->value,
                'label' => $s->label(),
                'count' => (int) ($statusCounts[$s->value] ?? 0),
            ], OrderStatus::active()),
            'sales_chart' => $chart,
            'recent_orders' => OrderResource::collection($recentOrders),
            'recent_payments' => PaymentResource::collection($recentPayments),
        ]]);
    }
}
