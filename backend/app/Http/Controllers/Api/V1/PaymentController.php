<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\RefundPaymentRequest;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    /** All payments (cashier log), filterable by date and method. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'payment_method_id' => ['nullable', 'integer'],
            'type' => ['nullable', 'in:payment,refund'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $payments = Payment::query()
            ->with(['method:id,name,code', 'order:id,order_number,customer_id', 'order.customer:id,name', 'receiver:id,name'])
            ->when($request->query('q'), fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('payment_number', 'like', "%{$term}%")
                ->orWhere('reference_number', 'like', "%{$term}%")
                ->orWhereHas('order', fn ($o) => $o->search($term))))
            ->when($request->query('payment_method_id'), fn ($q, $v) => $q->where('payment_method_id', $v))
            ->when($request->query('type'), fn ($q, $v) => $q->where('type', $v))
            ->when($request->query('date_from'), fn ($q, $v) => $q->where('paid_at', '>=', Carbon::parse($v)->startOfDay()))
            ->when($request->query('date_to'), fn ($q, $v) => $q->where('paid_at', '<=', Carbon::parse($v)->endOfDay()))
            ->latest('paid_at')
            ->latest('id')
            ->paginate($request->integer('per_page', 20))
            ->withQueryString();

        return PaymentResource::collection($payments);
    }

    public function forOrder(Order $order): AnonymousResourceCollection
    {
        return PaymentResource::collection($order->payments()->with(['method', 'receiver:id,name'])->get());
    }

    public function store(StorePaymentRequest $request, Order $order): JsonResponse
    {
        ['payment' => $payment, 'duplicate' => $duplicate] = $this->payments->record($order, $request->validated(), $request->user());

        return $this->respond($order, $payment, $duplicate ? 200 : 201, $duplicate);
    }

    public function refund(RefundPaymentRequest $request, Order $order): JsonResponse
    {
        $payment = $this->payments->refund($order, $request->validated(), $request->user());

        return $this->respond($order, $payment, 201);
    }

    private function respond(Order $order, Payment $payment, int $status, bool $duplicate = false): JsonResponse
    {
        $order->refresh()->load(['customer', 'items', 'addons', 'payments.method', 'payments.receiver:id,name', 'statusHistories.user:id,name', 'creator:id,name']);

        return response()->json([
            'data' => (new PaymentResource($payment->load(['method', 'receiver:id,name'])))->resolve(),
            'order' => (new OrderResource($order))->resolve(),
            'meta' => ['duplicate' => $duplicate],
        ], $status);
    }
}
