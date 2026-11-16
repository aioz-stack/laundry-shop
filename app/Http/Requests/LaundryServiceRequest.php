<?php

namespace App\Http\Requests;

use App\Enums\PricingType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LaundryServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'pricing_type' => ['required', Rule::enum(PricingType::class)],
            'price' => ['required', 'decimal:0,2', 'min:0', 'max:999999'],
            'minimum_quantity' => ['nullable', 'decimal:0,2', 'min:0', 'max:9999'],
            'turnaround_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];
    }
}
