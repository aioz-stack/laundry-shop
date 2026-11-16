<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Owner reports. Append ?format=csv to any endpoint to download a CSV.
 */
class ReportController extends Controller
{
    public function __construct(private ReportService $reports) {}

    public function sales(Request $request): JsonResponse|StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $request->validate(['group_by' => ['nullable', 'in:day,week,month']]);

        $report = $this->reports->sales($from, $to, $request->query('group_by', 'day'));

        if ($request->query('format') === 'csv') {
            return $this->csv("sales-{$from->toDateString()}-to-{$to->toDateString()}.csv",
                ['Period', 'Orders', 'Order value', 'Discounts', 'Collected'],
                array_map(fn ($r) => [$r['label'], $r['orders_count'], $r['order_value'], $r['discounts'], $r['collected']], $report['rows']),
                ['TOTAL', $report['totals']['orders_count'], $report['totals']['order_value'], $report['totals']['discounts'], $report['totals']['collected']],
            );
        }

        return response()->json(['data' => $report]);
    }

    public function orders(Request $request): JsonResponse|StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $report = $this->reports->orders($from, $to);

        if ($request->query('format') === 'csv') {
            return $this->csv("orders-{$from->toDateString()}-to-{$to->toDateString()}.csv",
                ['Service', 'Pricing', 'Order lines', 'Quantity', 'Revenue'],
                array_map(fn ($r) => [$r['service_name'], $r['pricing_type'], $r['orders_count'], $r['quantity'], $r['revenue']], $report['by_service']),
            );
        }

        return response()->json(['data' => $report]);
    }

    public function payments(Request $request): JsonResponse|StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $report = $this->reports->payments($from, $to);

        if ($request->query('format') === 'csv') {
            return $this->csv("payments-{$from->toDateString()}-to-{$to->toDateString()}.csv",
                ['Date', 'Payment #', 'Order #', 'Customer', 'Method', 'Type', 'Amount', 'Reference', 'Received by'],
                $report['transactions']->map(fn (Payment $p) => [
                    $p->paid_at->format('Y-m-d H:i'),
                    $p->payment_number,
                    $p->order?->order_number,
                    $p->order?->customer?->name,
                    $p->method?->name,
                    $p->type->value,
                    $p->amount,
                    $p->reference_number,
                    $p->receiver?->name,
                ])->all(),
            );
        }

        $report['transactions'] = PaymentResource::collection($report['transactions'])->resolve();

        return response()->json(['data' => $report]);
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function range(Request $request): array
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'format' => ['nullable', 'in:json,csv'],
        ]);

        $from = $request->query('from') ? Carbon::parse($request->query('from'))->startOfDay() : now()->startOfMonth();
        $to = $request->query('to') ? Carbon::parse($request->query('to'))->endOfDay() : now()->endOfDay();

        // Keep reports bounded so a typo can't scan years of data.
        if ($from->diffInDays($to) > 366) {
            $from = $to->copy()->subDays(366)->startOfDay();
        }

        return [$from, $to];
    }

    /**
     * @param  list<string>  $headers
     * @param  list<array<int, mixed>>  $rows
     * @param  array<int, mixed>|null  $footer
     */
    private function csv(string $filename, array $headers, array $rows, ?array $footer = null): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows, $footer) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel shows ₱ correctly.
            fputcsv($out, $headers, escape: '');

            foreach ($rows as $row) {
                fputcsv($out, array_map([$this, 'sanitizeCell'], $row), escape: '');
            }

            if ($footer) {
                fputcsv($out, $footer, escape: '');
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Prevent CSV formula injection when opened in Excel. */
    private function sanitizeCell(mixed $value): mixed
    {
        if (is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@'], true) && ! is_numeric($value)) {
            return "'".$value;
        }

        return $value;
    }
}
