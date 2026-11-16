<?php

namespace App\Enums;

enum PricingType: string
{
    case PerKg = 'per_kg';
    case PerPiece = 'per_piece';
    case Fixed = 'fixed';

    public function label(): string
    {
        return match ($this) {
            self::PerKg => 'Per kilogram',
            self::PerPiece => 'Per piece',
            self::Fixed => 'Fixed price',
        };
    }

    public function unit(): string
    {
        return match ($this) {
            self::PerKg => 'kg',
            self::PerPiece => 'pc',
            self::Fixed => 'svc',
        };
    }
}
