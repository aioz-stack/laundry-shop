<?php

namespace App\Services;

use App\Models\OrderSequence;
use App\Models\Setting;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Generates human-readable, gap-free daily numbers such as
 * LND-20261116-0001 (orders) and PAY-20261116-0001 (payments).
 *
 * Must be called inside a database transaction: the sequence row is locked
 * so concurrent counters never hand out the same number.
 */
class SequenceGenerator
{
    public function nextOrderNumber(?Carbon $date = null): string
    {
        $prefix = strtoupper(trim((string) Setting::get('order_prefix', 'LND'))) ?: 'LND';

        return $this->next('order', $prefix, $date);
    }

    public function nextPaymentNumber(?Carbon $date = null): string
    {
        return $this->next('payment', 'PAY', $date);
    }

    private function next(string $scope, string $prefix, ?Carbon $date): string
    {
        $date ??= now();
        $day = $date->toDateString();
        $padding = max(3, min(8, (int) Setting::get('order_number_padding', 4)));

        $sequence = OrderSequence::query()
            ->where('scope', $scope)
            ->where('sequence_date', $day)
            ->lockForUpdate()
            ->first();

        if (! $sequence) {
            try {
                $sequence = DB::transaction(fn () => OrderSequence::create([
                    'scope' => $scope,
                    'sequence_date' => $day,
                    'last_number' => 0,
                ]));
            } catch (UniqueConstraintViolationException) {
                // Another request created today's row first; lock and use it.
            }

            $sequence = OrderSequence::query()
                ->where('scope', $scope)
                ->where('sequence_date', $day)
                ->lockForUpdate()
                ->firstOrFail();
        }

        $sequence->increment('last_number');

        return sprintf('%s-%s-%s', $prefix, $date->format('Ymd'), str_pad((string) $sequence->last_number, $padding, '0', STR_PAD_LEFT));
    }
}
