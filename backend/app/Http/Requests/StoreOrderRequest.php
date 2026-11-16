<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Only identifiers and quantities are accepted. Prices, subtotals and totals
 * are never read from the client: OrderService recalculates everything.
 */
class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isQuote = $this->routeIs('*.quote');

        return [
            'client_reference' => ['nullable', 'uuid'],
            'customer_id' => [$isQuote ? 'nullable' : 'required', 'integer', 'exists:customers,id,deleted_at,NULL'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.service_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'decimal:0,2', 'gt:0', 'max:9999'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
            'addons' => ['nullable', 'array', 'max:20'],
            'addons.*.addon_id' => ['required', 'integer'],
            'addons.*.quantity' => ['nullable', 'integer', 'min:1', 'max:999'],
            'discount' => ['nullable', 'array'],
            'discount.type' => ['nullable', 'in:percent,fixed'],
            'discount.value' => ['nullable', 'decimal:0,2', 'min:0', 'max:999999'],
            'discount.reason' => ['nullable', 'string', 'max:255'],
            'expected_at' => ['nullable', 'date', 'after:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment' => ['nullable', 'array'],
            'payment.payment_method_id' => ['required_with:payment.amount', 'nullable', 'integer', 'exists:payment_methods,id'],
            'payment.amount' => ['nullable', 'decimal:0,2', 'min:0', 'max:9999999'],
            'payment.reference_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one laundry service.',
            'items.*.quantity.gt' => 'Enter a weight or quantity greater than zero.',
            'customer_id.required' => 'Select or register a customer first.',
        ];
    }
}
