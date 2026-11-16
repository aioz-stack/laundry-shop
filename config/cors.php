<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS)
|--------------------------------------------------------------------------
|
| The SPA (and future Capacitor / Electron shells) call this API from a
| different origin. Allowed origins come from FRONTEND_URL, which may hold a
| comma-separated list (e.g. "https://pos.example.com,capacitor://localhost").
|
*/

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('FRONTEND_URL', 'http://localhost:5173'))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    // Required for Sanctum cookie (SPA) authentication.
    'supports_credentials' => true,

];
