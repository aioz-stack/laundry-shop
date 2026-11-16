<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\PricingType;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * Enumerations clients need to render labels and options.
 */
class MetaController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $map = fn (array $cases) => array_map(fn ($c) => ['value' => $c->value, 'label' => $c->label()], $cases);

        return response()->json(['data' => [
            'order_statuses' => array_map(fn (OrderStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
                'step' => $s->step(),
            ], OrderStatus::cases()),
            'payment_statuses' => $map(PaymentStatus::cases()),
            'pricing_types' => array_map(fn (PricingType $p) => [
                'value' => $p->value,
                'label' => $p->label(),
                'unit' => $p->unit(),
            ], PricingType::cases()),
            'roles' => $map(Role::cases()),
        ]]);
    }
}
