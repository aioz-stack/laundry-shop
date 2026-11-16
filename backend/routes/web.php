<?php

use Illuminate\Support\Facades\Route;

/*
| This application is API-only. The React dashboard lives in /frontend and
| talks to /api/v1. The root simply identifies the service.
*/

Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'api' => url('/api/v1'),
    'status' => 'ok',
]));
