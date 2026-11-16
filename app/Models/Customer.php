<?php

namespace App\Models;

use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = ['customer_code', 'name', 'phone', 'email', 'address', 'notes', 'created_by'];

    protected static function booted(): void
    {
        // A temporary unique code is set before insert, then replaced with a
        // readable code derived from the auto-increment id.
        static::creating(function (Customer $customer) {
            $customer->customer_code ??= 'TMP-'.bin2hex(random_bytes(6));
        });

        static::created(function (Customer $customer) {
            if (str_starts_with($customer->customer_code, 'TMP-')) {
                $customer->customer_code = 'CUST-'.str_pad((string) $customer->id, 5, '0', STR_PAD_LEFT);
                $customer->saveQuietly();
            }
        });
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Search by phone, name or customer code. Phone is the primary field. */
    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);

        if ($term === '') {
            return $query;
        }

        $digits = preg_replace('/\D+/', '', $term);

        return $query->where(function (Builder $q) use ($term, $digits) {
            $q->where('name', 'like', "%{$term}%")
                ->orWhere('customer_code', 'like', "%{$term}%")
                ->orWhere('phone', 'like', "%{$term}%");

            if (strlen($digits) >= 4) {
                // "09171234567" should still match "+63 917 123 4567".
                $q->orWhere('phone_digits', 'like', '%'.substr($digits, -10).'%');
            }
        });
    }

    /** Store a digits-only copy of the phone for tolerant searching. */
    protected function setPhoneAttribute(?string $value): void
    {
        $this->attributes['phone'] = $value;
        $this->attributes['phone_digits'] = $value === null ? null : preg_replace('/\D+/', '', $value);
    }
}
