<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Exact money arithmetic in integer centavos.
 *
 * Every monetary value enters as a decimal string ("35.00") or int and is
 * converted to centavos; quantities (kg / pieces) are handled in hundredths.
 * No floating point is ever used for financial math.
 */
final class Money
{
    /** Convert a decimal string / int to centavos (or hundredths for quantities). */
    public static function toCents(string|int|null $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        if (is_int($value)) {
            return $value * 100;
        }

        $value = trim($value);

        if (! preg_match('/^(-)?(\d+)(?:\.(\d{0,}))?$/', $value, $m)) {
            throw new InvalidArgumentException("Invalid decimal value [{$value}].");
        }

        $negative = $m[1] === '-';
        $whole = (int) $m[2];
        $fraction = $m[3] ?? '';

        // Round half-up on the third decimal place.
        $cents = (int) str_pad(substr($fraction, 0, 2), 2, '0');
        $roundUp = strlen($fraction) > 2 && (int) $fraction[2] >= 5;

        $result = $whole * 100 + $cents + ($roundUp ? 1 : 0);

        return $negative ? -$result : $result;
    }

    /** Convert centavos back to a 2-decimal string. */
    public static function fromCents(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $cents = abs($cents);

        return $sign.intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    /**
     * Multiply a price (centavos) by a quantity expressed in hundredths
     * (e.g. 3.50 kg => 350), rounding half-up to the nearest centavo.
     */
    public static function multiply(int $priceCents, int $quantityHundredths): int
    {
        $product = $priceCents * $quantityHundredths;

        return intdiv($product + ($product >= 0 ? 50 : -50), 100);
    }

    /** Percentage of an amount; percent is given in hundredths (12.5% => 1250). */
    public static function percentOf(int $amountCents, int $percentHundredths): int
    {
        $product = $amountCents * $percentHundredths;

        return intdiv($product + ($product >= 0 ? 5000 : -5000), 10000);
    }

    public static function normalize(string|int|null $value): string
    {
        return self::fromCents(self::toCents($value));
    }
}
