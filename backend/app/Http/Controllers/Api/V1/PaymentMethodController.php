<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Permission;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentMethodRequest;
use App\Http\Resources\PaymentMethodResource;
use App\Models\PaymentMethod;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PaymentMethodController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $includeInactive = $request->boolean('include_inactive') && $request->user()->hasPermission(Permission::SettingsManage);

        return PaymentMethodResource::collection(
            PaymentMethod::query()
                ->when(! $includeInactive, fn ($q) => $q->where('is_active', true))
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(PaymentMethodRequest $request): JsonResponse
    {
        $method = PaymentMethod::create($request->validated() + ['is_active' => true]);

        ActivityLogger::log('payment_method.created', "Added payment method {$method->name}", $method);

        return (new PaymentMethodResource($method))->response()->setStatusCode(201);
    }

    public function update(PaymentMethodRequest $request, PaymentMethod $paymentMethod): PaymentMethodResource
    {
        $paymentMethod->update($request->validated());

        ActivityLogger::log('payment_method.updated', "Updated payment method {$paymentMethod->name}", $paymentMethod);

        return new PaymentMethodResource($paymentMethod);
    }

    public function destroy(PaymentMethod $paymentMethod): JsonResponse
    {
        if ($paymentMethod->payments()->exists()) {
            throw new BusinessRuleException('This payment method has recorded payments. Deactivate it instead of deleting.', [], 409);
        }

        $paymentMethod->delete();

        ActivityLogger::log('payment_method.deleted', "Deleted payment method {$paymentMethod->name}");

        return response()->json(['message' => 'Payment method deleted.']);
    }
}
