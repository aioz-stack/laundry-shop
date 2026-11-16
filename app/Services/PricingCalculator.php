<?php

namespace App\Services;

use App\Enums\PricingType;
use App\Models\LaundryService;
use App\Models\ServiceAddon;
use App\Support\Money;
use Illuminate\Validation\ValidationException;

/**
 * Computes order charges from current service/add-on prices. The frontend
 * may preview totals, but only these numbers are ever stored.
 */
class PricingCalculator
{
    /**
     * @param  list<array{service: LaundryService, quantity: string|int, notes?: string|null}>  $items
     * @param  list<array{addon: ServiceAddon, quantity: int}>  $addons
     * @param  array{type?: string|null, value?: string|int|null}  $discount
     * @return array{
     *     items: list<array<string, mixed>>,
     *     addons: list<array<string, mixed>>,
     *     subtotal: string, discount_type: ?string, discount_value: string, discount_amount: string,
     *     tax_rate: string, tax_amount: string, total: string,
     *     subtotal_cents: int, discount_cents: int, total_cents: int
     * }
     */
    public function calculate(array $items, array $addons = [], array $discount = [], string|int $taxRate = '0'): array
    {
        $lines = [];
        $subtotal = 0;

        foreach ($items as $index => $item) {
            /** @var LaundryService $service */
            $service = $item['service'];
            $quantity = Money::toCents((string) $item['quantity']); // hundredths

            if ($quantity <= 0) {
                throw ValidationException::withMessages(["items.{$index}.quantity" => 'Quantity must be greater than zero.']);
            }

            if ($service->pricing_type !== PricingType::PerKg && $quantity % 100 !== 0) {
                throw ValidationException::withMessages(["items.{$index}.quantity" => 'Piece and fixed-price services need a whole-number quantity.']);
            }

            $billable = $quantity;
            $minimum = Money::toCents($service->minimum_quantity);

            if ($service->pricing_type !== PricingType::Fixed && $minimum > 0 && $billable < $minimum) {
                $billable = $minimum;
            }

            $unitPrice = Money::toCents($service->price);
            $lineTotal = Money::multiply($unitPrice, $billable);
            $subtotal += $lineTotal;

            $lines[] = [
                'laundry_service_id' => $service->id,
                'service_name' => $service->name,
                'pricing_type' => $service->pricing_type->value,
                'unit_price' => Money::fromCents($unitPrice),
                'quantity' => Money::fromCents($quantity),
                'billable_quantity' => Money::fromCents($billable),
                'line_total' => Money::fromCents($lineTotal),
                'notes' => $item['notes'] ?? null,
            ];
        }

        $addonLines = [];

        foreach ($addons as $index => $line) {
            /** @var ServiceAddon $addon */
            $addon = $line['addon'];
            $quantity = (int) $line['quantity'];

            if ($quantity < 1) {
                throw ValidationException::withMessages(["addons.{$index}.quantity" => 'Add-on quantity must be at least 1.']);
            }

            $unitPrice = Money::toCents($addon->price);
            $lineTotal = $unitPrice * $quantity;
            $subtotal += $lineTotal;

            $addonLines[] = [
                'service_addon_id' => $addon->id,
                'addon_name' => $addon->name,
                'unit_price' => Money::fromCents($unitPrice),
                'quantity' => $quantity,
                'line_total' => Money::fromCents($lineTotal),
            ];
        }

        [$discountType, $discountValue, $discountAmount] = $this->discount($subtotal, $discount);

        $taxRateHundredths = Money::toCents((string) $taxRate);
        $taxable = $subtotal - $discountAmount;
        $taxAmount = $taxRateHundredths > 0 ? Money::percentOf($taxable, $taxRateHundredths) : 0;
        $total = $taxable + $taxAmount;

        return [
            'items' => $lines,
            'addons' => $addonLines,
            'subtotal' => Money::fromCents($subtotal),
            'discount_type' => $discountType,
            'discount_value' => Money::fromCents($discountValue),
            'discount_amount' => Money::fromCents($discountAmount),
            'tax_rate' => Money::fromCents($taxRateHundredths),
            'tax_amount' => Money::fromCents($taxAmount),
            'total' => Money::fromCents($total),
            'subtotal_cents' => $subtotal,
            'discount_cents' => $discountAmount,
            'total_cents' => $total,
        ];
    }

    /**
     * @param  array{type?: string|null, value?: string|int|null}  $discount
     * @return array{0: ?string, 1: int, 2: int}
     */
    private function discount(int $subtotal, array $discount): array
    {
        $type = $discount['type'] ?? null;
        $value = Money::toCents(isset($discount['value']) ? (string) $discount['value'] : null);

        if (! $type || $value <= 0) {
            return [null, 0, 0];
        }

        $amount = match ($type) {
            'percent' => $value > 10000
                ? throw ValidationException::withMessages(['discount.value' => 'A percentage discount cannot exceed 100%.'])
                : Money::percentOf($subtotal, $value),
            'fixed' => $value,
            default => throw ValidationException::withMessages(['discount.type' => 'Unknown discount type.']),
        };

        if ($amount > $subtotal) {
            throw ValidationException::withMessages(['discount.value' => 'The discount cannot be larger than the subtotal.']);
        }

        return [$type, $value, $amount];
    }
}
