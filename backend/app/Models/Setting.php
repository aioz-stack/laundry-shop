<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    private const CACHE_KEY = 'app_settings';

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    /**
     * Default values for every supported setting. Anything not stored in the
     * database falls back to these.
     *
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'shop_name' => 'Fresh Fold Laundry',
            'shop_address' => '',
            'shop_phone' => '',
            'shop_email' => '',
            'shop_logo' => null,
            'currency' => 'PHP',
            'currency_symbol' => '₱',
            'order_prefix' => 'LND',
            'order_number_padding' => 4,
            'default_turnaround_hours' => 48,
            'tax_label' => 'VAT',
            'tax_rate' => '0.00',
            'operator_max_discount_percent' => '20.00',
            'require_full_payment_on_release' => true,
            'receipt_paper_width' => '80',
            'receipt_footer' => 'Thank you for choosing us!',
            'receipt_terms' => "Please present this receipt when claiming your laundry.\nItems unclaimed after 30 days are no longer our responsibility.\nWe are not liable for color bleeding, shrinkage, or items left in pockets.",
        ];
    }

    /** @return array<string, mixed> */
    public static function allValues(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $stored = static::query()->pluck('value', 'key')->all();

            return array_merge(static::defaults(), array_intersect_key($stored, static::defaults()));
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::allValues()[$key] ?? $default;
    }

    /** @param array<string, mixed> $values */
    public static function putMany(array $values): void
    {
        foreach ($values as $key => $value) {
            if (! array_key_exists($key, static::defaults())) {
                continue;
            }

            static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }

        Cache::forget(self::CACHE_KEY);
    }
}
