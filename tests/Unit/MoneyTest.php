<?php

use App\Support\Money;

test('decimal strings convert to centavos exactly', function () {
    expect(Money::toCents('35'))->toBe(3500)
        ->and(Money::toCents('0.1'))->toBe(10)
        ->and(Money::toCents('19.99'))->toBe(1999)
        ->and(Money::toCents('2.345'))->toBe(235)
        ->and(Money::toCents('-5.50'))->toBe(-550)
        ->and(Money::toCents(7))->toBe(700);
});

test('centavos format back to two decimals', function () {
    expect(Money::fromCents(17550))->toBe('175.50')
        ->and(Money::fromCents(5))->toBe('0.05')
        ->and(Money::fromCents(-125))->toBe('-1.25');
});

test('price times fractional kilos rounds half up', function () {
    // 35.00 x 3.33 kg = 116.55
    expect(Money::multiply(3500, 333))->toBe(11655)
        // 12.25 x 1.5 = 18.375 -> 18.38
        ->and(Money::multiply(1225, 150))->toBe(1838);
});

test('percentages are exact', function () {
    expect(Money::percentOf(35000, 1000))->toBe(3500)
        ->and(Money::percentOf(9999, 1250))->toBe(1250);
});

test('invalid input is rejected', function () {
    Money::toCents('12,50');
})->throws(InvalidArgumentException::class);
