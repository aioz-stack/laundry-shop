<?php

use App\Enums\Permission as P;
use App\Http\Controllers\Api\V1\ActivityLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\LaundryServiceController;
use App\Http\Controllers\Api\V1\MetaController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PaymentMethodController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ServiceAddonController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Every permission listed with `can:` is defined as a Gate in
| AppServiceProvider from App\Enums\Role::permissions().
*/

Route::prefix('v1')->name('v1.')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:login')->name('auth.login');

    Route::middleware(['auth:sanctum', 'active', 'throttle:api'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        Route::get('meta', MetaController::class)->name('meta');
        Route::get('settings', [SettingController::class, 'show'])->name('settings.show');
        Route::get('dashboard', DashboardController::class)->middleware('can:'.P::DashboardView)->name('dashboard');

        // Customers
        Route::middleware('can:'.P::CustomersView)->group(function () {
            Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
            Route::get('customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
        });
        Route::middleware('can:'.P::CustomersManage)->group(function () {
            Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
            Route::put('customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
        });
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->middleware('can:'.P::CustomersDelete)->name('customers.destroy');

        // Services, add-ons, payment methods (read for everyone, write for owner)
        Route::get('services', [LaundryServiceController::class, 'index'])->middleware('can:'.P::ServicesView)->name('services.index');
        Route::get('services/{service}', [LaundryServiceController::class, 'show'])->middleware('can:'.P::ServicesView)->name('services.show');
        Route::get('service-addons', [ServiceAddonController::class, 'index'])->middleware('can:'.P::ServicesView)->name('addons.index');
        Route::get('payment-methods', [PaymentMethodController::class, 'index'])->name('payment-methods.index');

        Route::middleware('can:'.P::ServicesManage)->group(function () {
            Route::post('services', [LaundryServiceController::class, 'store'])->name('services.store');
            Route::put('services/{service}', [LaundryServiceController::class, 'update'])->name('services.update');
            Route::delete('services/{service}', [LaundryServiceController::class, 'destroy'])->name('services.destroy');
            Route::post('service-addons', [ServiceAddonController::class, 'store'])->name('addons.store');
            Route::put('service-addons/{addon}', [ServiceAddonController::class, 'update'])->name('addons.update');
            Route::delete('service-addons/{addon}', [ServiceAddonController::class, 'destroy'])->name('addons.destroy');
        });

        // Orders
        Route::middleware('can:'.P::OrdersView)->group(function () {
            Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
            Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
            Route::get('orders/{order}/history', [OrderController::class, 'history'])->name('orders.history');
        });
        Route::middleware('can:'.P::OrdersCreate)->group(function () {
            Route::post('orders/quote', [OrderController::class, 'quote'])->name('orders.quote');
            Route::post('orders', [OrderController::class, 'store'])->middleware('throttle:transactions')->name('orders.store');
        });
        Route::put('orders/{order}', [OrderController::class, 'update'])->middleware('can:'.P::OrdersUpdate)->name('orders.update');
        Route::post('orders/{order}/status', [OrderController::class, 'updateStatus'])->middleware('can:'.P::OrdersStatus)->name('orders.status');
        Route::get('orders/{order}/receipt', [OrderController::class, 'receipt'])->middleware('can:'.P::PaymentsView)->name('orders.receipt');

        // Payments
        Route::middleware('can:'.P::PaymentsView)->group(function () {
            Route::get('payments', [PaymentController::class, 'index'])->name('payments.index');
            Route::get('orders/{order}/payments', [PaymentController::class, 'forOrder'])->name('orders.payments.index');
        });
        Route::post('orders/{order}/payments', [PaymentController::class, 'store'])->middleware(['can:'.P::PaymentsCreate, 'throttle:transactions'])->name('orders.payments.store');
        Route::post('orders/{order}/refunds', [PaymentController::class, 'refund'])->middleware(['can:'.P::PaymentsRefund, 'throttle:transactions'])->name('orders.refunds.store');

        // Reports
        Route::middleware('can:'.P::ReportsView)->prefix('reports')->name('reports.')->group(function () {
            Route::get('sales', [ReportController::class, 'sales'])->name('sales');
            Route::get('orders', [ReportController::class, 'orders'])->name('orders');
            Route::get('payments', [ReportController::class, 'payments'])->name('payments');
        });

        // Administration
        Route::middleware('can:'.P::SettingsManage)->group(function () {
            Route::put('settings', [SettingController::class, 'update'])->name('settings.update');
            Route::post('settings/logo', [SettingController::class, 'uploadLogo'])->name('settings.logo');
            Route::delete('settings/logo', [SettingController::class, 'removeLogo'])->name('settings.logo.remove');
            Route::post('payment-methods', [PaymentMethodController::class, 'store'])->name('payment-methods.store');
            Route::put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update'])->name('payment-methods.update');
            Route::delete('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy'])->name('payment-methods.destroy');
        });

        Route::apiResource('users', UserController::class)->middleware('can:'.P::UsersManage);
        Route::get('activity-logs', [ActivityLogController::class, 'index'])->middleware('can:'.P::ActivityLogsView)->name('activity-logs.index');
    });
});
