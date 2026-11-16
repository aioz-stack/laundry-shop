<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Services\ActivityLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CustomerController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'with_balance' => ['nullable', 'boolean'],
        ]);

        $customers = $this->withTotals(Customer::query())
            ->search($request->query('q'))
            ->when($request->boolean('with_balance'), fn (Builder $q) => $q->whereHas('orders', fn ($o) => $o->where('balance', '>', 0)->where('status', '!=', OrderStatus::Cancelled->value)))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15))
            ->withQueryString();

        return CustomerResource::collection($customers);
    }

    public function store(CustomerRequest $request): JsonResponse
    {
        $customer = Customer::create([...$request->validated(), 'created_by' => $request->user()->id]);

        ActivityLogger::log('customer.created', "Registered customer {$customer->name}", $customer);

        return (new CustomerResource($customer->refresh()))->response()->setStatusCode(201);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer = $this->withTotals(Customer::query())->findOrFail($customer->id);

        $orders = $customer->orders()->latest()->limit(50)->get();

        return response()->json([
            'data' => (new CustomerResource($customer))->resolve(),
            'orders' => OrderResource::collection($orders)->resolve(),
        ]);
    }

    public function update(CustomerRequest $request, Customer $customer): CustomerResource
    {
        $customer->update($request->validated());

        ActivityLogger::log('customer.updated', "Updated customer {$customer->name}", $customer);

        return new CustomerResource($customer);
    }

    public function destroy(Customer $customer): JsonResponse
    {
        if ($customer->orders()->exists()) {
            throw new BusinessRuleException('This customer has order history and cannot be deleted.', [], 409);
        }

        $customer->delete();

        ActivityLogger::log('customer.deleted', "Deleted customer {$customer->name}", $customer);

        return response()->json(['message' => 'Customer deleted.']);
    }

    private function withTotals(Builder $query): Builder
    {
        $cancelled = OrderStatus::Cancelled->value;

        return $query
            ->withCount('orders')
            ->withSum(['orders as total_spent_cents' => fn ($q) => $q->where('status', '!=', $cancelled)], \DB::raw('ROUND(amount_paid * 100)'))
            ->withSum(['orders as outstanding_cents' => fn ($q) => $q->where('status', '!=', $cancelled)], \DB::raw('ROUND(balance * 100)'))
            ->withMax('orders as last_order_at', 'created_at');
    }
}
