<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\StatusHistoryResource;
use App\Models\Order;
use App\Models\Setting;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(private OrderService $orders) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string'],
            'payment_status' => ['nullable', Rule::enum(PaymentStatus::class)],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'active' => ['nullable', 'boolean'],
            'customer_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
            'sort' => ['nullable', 'in:latest,oldest,expected'],
        ]);

        // status accepts a single value or a comma-separated list.
        $statuses = collect(explode(',', (string) $request->query('status')))
            ->map(fn ($s) => OrderStatus::tryFrom(trim($s)))
            ->filter()
            ->map(fn (OrderStatus $s) => $s->value)
            ->values();

        $orders = Order::query()
            ->with('customer')
            ->search($request->query('q'))
            ->when($statuses->isNotEmpty(), fn ($q) => $q->whereIn('status', $statuses))
            ->when($request->boolean('active'), fn ($q) => $q->whereIn('status', array_map(fn ($s) => $s->value, OrderStatus::active())))
            ->when($request->query('payment_status'), fn ($q, $v) => $q->where('payment_status', $v))
            ->when($request->query('customer_id'), fn ($q, $v) => $q->where('customer_id', $v))
            ->when($request->query('date_from'), fn ($q, $v) => $q->where('created_at', '>=', Carbon::parse($v)->startOfDay()))
            ->when($request->query('date_to'), fn ($q, $v) => $q->where('created_at', '<=', Carbon::parse($v)->endOfDay()))
            ->when($request->query('sort', 'latest'), fn ($q, $sort) => match ($sort) {
                'oldest' => $q->oldest()->oldest('id'),
                'expected' => $q->orderBy('expected_at')->orderBy('id'),
                default => $q->latest()->latest('id'),
            })
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    public function quote(StoreOrderRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->orders->quote($request->validated(), $request->user())]);
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        ['order' => $order, 'duplicate' => $duplicate] = $this->orders->create($request->validated(), $request->user());

        return (new OrderResource($this->loadDetails($order)))
            ->additional(['meta' => ['duplicate' => $duplicate]])
            ->response()
            ->setStatusCode($duplicate ? 200 : 201);
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($this->loadDetails($order));
    }

    public function update(UpdateOrderRequest $request, Order $order): OrderResource
    {
        return new OrderResource($this->loadDetails($this->orders->updateDetails($order, $request->validated())));
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): OrderResource
    {
        $order = $this->orders->changeStatus(
            $order,
            OrderStatus::from($request->validated('status')),
            $request->user(),
            $request->validated('remarks'),
        );

        return new OrderResource($this->loadDetails($order));
    }

    public function history(Order $order): AnonymousResourceCollection
    {
        return StatusHistoryResource::collection($order->statusHistories()->with('user:id,name')->get());
    }

    /**
     * Printer-agnostic receipt payload. The browser renders it as HTML today;
     * a future ESC/POS driver can consume the same structure.
     */
    public function receipt(Order $order): JsonResponse
    {
        $settings = Setting::allValues();
        $order = $this->loadDetails($order);

        return response()->json(['data' => [
            'shop' => [
                'name' => $settings['shop_name'],
                'address' => $settings['shop_address'],
                'phone' => $settings['shop_phone'],
                'email' => $settings['shop_email'],
                'logo_url' => $settings['shop_logo'] ? Storage::disk('public')->url($settings['shop_logo']) : null,
            ],
            'paper_width' => (string) $settings['receipt_paper_width'],
            'currency_symbol' => $settings['currency_symbol'],
            'tax_label' => $settings['tax_label'],
            'footer' => $settings['receipt_footer'],
            'terms' => array_values(array_filter(array_map('trim', explode("\n", (string) $settings['receipt_terms'])))),
            'order' => (new OrderResource($order))->resolve(),
            'printed_at' => now()->toIso8601String(),
        ]]);
    }

    private function loadDetails(Order $order): Order
    {
        return $order->load([
            'customer',
            'items',
            'addons',
            'payments.method',
            'payments.receiver:id,name',
            'statusHistories.user:id,name',
            'creator:id,name',
            'releaser:id,name',
        ]);
    }
}
