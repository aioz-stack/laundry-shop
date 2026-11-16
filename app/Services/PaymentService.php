<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Exceptions\BusinessRuleException;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    /** Seconds within which an identical payment is treated as a double submit. */
    private const DUPLICATE_WINDOW_SECONDS = 15;

    public function __construct(private SequenceGenerator $sequences) {}

    /**
     * Record a payment against an order.
     *
     * The order row is locked for the duration, the applied amount is capped
     * at the outstanding balance (cash overpayment becomes change), and the
     * order's paid amount / balance / payment status are recomputed from the
     * payment ledger rather than incremented.
     *
     * @param  array{payment_method_id: int, amount: string, reference_number?: ?string, notes?: ?string, idempotency_key?: ?string}  $data
     * @return array{payment: Payment, duplicate: bool}
     */
    public function record(Order $order, array $data, User $user): array
    {
        return DB::transaction(function () use ($order, $data, $user) {
            if (! empty($data['idempotency_key'])) {
                $existing = Payment::query()->where('idempotency_key', $data['idempotency_key'])->first();

                if ($existing) {
                    if ($existing->order_id !== $order->id) {
                        throw new BusinessRuleException('This payment reference was already used for a different order.');
                    }

                    return ['payment' => $existing, 'duplicate' => true];
                }
            }

            /** @var Order $locked */
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === OrderStatus::Cancelled) {
                throw new BusinessRuleException('Payments cannot be added to a cancelled order.');
            }

            $method = PaymentMethod::query()->whereKey($data['payment_method_id'])->where('is_active', true)->first();

            if (! $method) {
                throw new BusinessRuleException('The selected payment method is not available.', [
                    'payment_method_id' => ['The selected payment method is not available.'],
                ]);
            }

            if ($method->requires_reference && blank($data['reference_number'] ?? null)) {
                throw new BusinessRuleException("A reference number is required for {$method->name} payments.", [
                    'reference_number' => ["A reference number is required for {$method->name} payments."],
                ]);
            }

            $balance = Money::toCents($locked->balance);
            $tendered = Money::toCents($data['amount']);

            if ($balance <= 0) {
                throw new BusinessRuleException('This order is already fully paid.');
            }

            if ($tendered <= 0) {
                throw new BusinessRuleException('The payment amount must be greater than zero.', [
                    'amount' => ['The payment amount must be greater than zero.'],
                ]);
            }

            if ($tendered > $balance && ! $method->is_cash) {
                throw new BusinessRuleException('Non-cash payments cannot exceed the outstanding balance of '.Money::fromCents($balance).'.', [
                    'amount' => ['Non-cash payments cannot exceed the outstanding balance.'],
                ]);
            }

            $applied = min($tendered, $balance);

            $this->guardAgainstDuplicate($locked, $method, $applied);

            $payment = $locked->payments()->create([
                'payment_number' => $this->sequences->nextPaymentNumber(),
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'payment_method_id' => $method->id,
                'type' => PaymentType::Payment,
                'amount' => Money::fromCents($applied),
                'amount_tendered' => $method->is_cash ? Money::fromCents($tendered) : null,
                'change_given' => Money::fromCents($tendered - $applied),
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'paid_at' => now(),
                'received_by' => $user->id,
            ]);

            $this->refreshTotals($locked);

            ActivityLogger::log('payment.recorded', "Recorded {$method->name} payment of ₱".Money::fromCents($applied)." for {$locked->order_number}", $locked, [
                'payment_number' => $payment->payment_number,
                'amount' => $payment->amount,
                'method' => $method->code,
            ]);

            $order->setRawAttributes($locked->getAttributes(), true);

            return ['payment' => $payment, 'duplicate' => false];
        }, 3);
    }

    /**
     * Refund money back to the customer (owner only; enforced by gate).
     *
     * @param  array{payment_method_id: int, amount: string, notes: string, reference_number?: ?string}  $data
     */
    public function refund(Order $order, array $data, User $user): Payment
    {
        return DB::transaction(function () use ($order, $data, $user) {
            /** @var Order $locked */
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            $paid = Money::toCents($locked->amount_paid);
            $amount = Money::toCents($data['amount']);

            if ($amount <= 0 || $amount > $paid) {
                throw new BusinessRuleException('Refund amount must be between ₱0.01 and the amount paid (₱'.Money::fromCents($paid).').', [
                    'amount' => ['Refund amount exceeds the amount paid.'],
                ]);
            }

            $method = PaymentMethod::query()->findOrFail($data['payment_method_id']);

            $payment = $locked->payments()->create([
                'payment_number' => $this->sequences->nextPaymentNumber(),
                'payment_method_id' => $method->id,
                'type' => PaymentType::Refund,
                'amount' => Money::fromCents($amount),
                'change_given' => '0.00',
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'],
                'paid_at' => now(),
                'received_by' => $user->id,
            ]);

            $this->refreshTotals($locked);

            ActivityLogger::log('payment.refunded', "Refunded ₱{$payment->amount} on {$locked->order_number}", $locked, [
                'payment_number' => $payment->payment_number,
                'reason' => $data['notes'],
            ]);

            $order->setRawAttributes($locked->getAttributes(), true);

            return $payment;
        }, 3);
    }

    /**
     * Recompute amount paid, balance and payment status from the ledger.
     */
    public function refreshTotals(Order $order): void
    {
        $payments = Payment::query()->where('order_id', $order->id)->get(['type', 'amount']);

        $paid = 0;
        $refunded = 0;

        foreach ($payments as $payment) {
            if ($payment->type === PaymentType::Refund) {
                $refunded += Money::toCents($payment->amount);
            } else {
                $paid += Money::toCents($payment->amount);
            }
        }

        $net = $paid - $refunded;
        $total = Money::toCents($order->total);
        $balance = max(0, $total - $net);

        $status = match (true) {
            $refunded > 0 && $net <= 0 => PaymentStatus::Refunded,
            $total > 0 && $net >= $total, $total === 0 => PaymentStatus::Paid,
            $net > 0 => PaymentStatus::PartiallyPaid,
            default => PaymentStatus::Unpaid,
        };

        // A cancelled order owes nothing further.
        if ($order->status === OrderStatus::Cancelled) {
            $balance = 0;
        }

        $order->forceFill([
            'amount_paid' => Money::fromCents($net),
            'balance' => Money::fromCents($balance),
            'payment_status' => $status,
        ])->save();
    }

    private function guardAgainstDuplicate(Order $order, PaymentMethod $method, int $amount): void
    {
        $recent = Payment::query()
            ->where('order_id', $order->id)
            ->where('payment_method_id', $method->id)
            ->where('type', PaymentType::Payment->value)
            ->where('amount', Money::fromCents($amount))
            ->where('created_at', '>=', now()->subSeconds(self::DUPLICATE_WINDOW_SECONDS))
            ->exists();

        if ($recent) {
            throw new BusinessRuleException('An identical payment was just recorded for this order. Refresh the order before trying again.', [], 409);
        }
    }
}
