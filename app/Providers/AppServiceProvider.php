<?php

namespace App\Providers;

use App\Enums\Permission;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->registerPermissionGates();
        $this->registerRateLimiters();
    }

    /**
     * Every permission becomes a Gate backed by the user's role, so routes
     * can use `can:orders.create` and code can use Gate::allows().
     */
    private function registerPermissionGates(): void
    {
        foreach (Permission::all() as $permission) {
            Gate::define($permission, fn (User $user) => $user->hasPermission($permission));
        }
    }

    private function registerRateLimiters(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $username = strtolower((string) $request->input('username'));

            return [
                Limit::perMinute(5)->by($username.'|'.$request->ip())->response(fn () => response()->json([
                    'message' => 'Too many sign-in attempts. Please wait a minute and try again.',
                ], 429)),
                Limit::perMinute(30)->by($request->ip()),
            ];
        });

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(240)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('transactions', fn (Request $request) => Limit::perMinute(40)->by($request->user()?->id ?: $request->ip()));
    }
}
