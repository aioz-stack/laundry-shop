<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Received = 'received';
    case Washing = 'washing';
    case Drying = 'drying';
    case Folding = 'folding';
    case ReadyForPickup = 'ready_for_pickup';
    case Released = 'released';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Received => 'Received',
            self::Washing => 'Washing',
            self::Drying => 'Drying',
            self::Folding => 'Folding',
            self::ReadyForPickup => 'Ready for Pickup',
            self::Released => 'Released',
            self::Cancelled => 'Cancelled',
        };
    }

    /** Position in the processing pipeline (cancelled has none). */
    public function step(): ?int
    {
        return match ($this) {
            self::Received => 1,
            self::Washing => 2,
            self::Drying => 3,
            self::Folding => 4,
            self::ReadyForPickup => 5,
            self::Released => 6,
            self::Cancelled => null,
        };
    }

    public function isFinal(): bool
    {
        return $this === self::Released || $this === self::Cancelled;
    }

    /** Statuses that represent laundry still in the shop. */
    public static function active(): array
    {
        return [self::Received, self::Washing, self::Drying, self::Folding, self::ReadyForPickup];
    }

    /** Statuses a laundry attendant may move an order into. */
    public static function processing(): array
    {
        return [self::Washing, self::Drying, self::Folding, self::ReadyForPickup];
    }
}
