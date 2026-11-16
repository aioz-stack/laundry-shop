<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shop_name' => ['sometimes', 'required', 'string', 'max:120'],
            'shop_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'shop_phone' => ['sometimes', 'nullable', 'string', 'max:60'],
            'shop_email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'currency' => ['sometimes', 'required', 'string', 'size:3'],
            'currency_symbol' => ['sometimes', 'required', 'string', 'max:5'],
            'order_prefix' => ['sometimes', 'required', 'string', 'max:10', 'alpha_num'],
            'order_number_padding' => ['sometimes', 'required', 'integer', 'min:3', 'max:8'],
            'default_turnaround_hours' => ['sometimes', 'required', 'integer', 'min:1', 'max:720'],
            'tax_label' => ['sometimes', 'nullable', 'string', 'max:20'],
            'tax_rate' => ['sometimes', 'required', 'decimal:0,2', 'min:0', 'max:50'],
            'operator_max_discount_percent' => ['sometimes', 'required', 'decimal:0,2', 'min:0', 'max:100'],
            'require_full_payment_on_release' => ['sometimes', 'boolean'],
            'receipt_paper_width' => ['sometimes', 'required', 'in:58,80'],
            'receipt_footer' => ['sometimes', 'nullable', 'string', 'max:255'],
            'receipt_terms' => ['sometimes', 'nullable', 'string', 'max:1500'],
        ];
    }
}
