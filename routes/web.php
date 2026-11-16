<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web app
|--------------------------------------------------------------------------
| The React web app (resources/js) is served from one shell view for every
| non-API path; it handles its own routing and talks only to /api/v1, so
| the same API can later serve mobile or desktop clients.
*/

Route::view('/{path?}', 'app')
    ->where('path', '(?!api(/|$)|sanctum/|storage/|up$).*')
    ->name('web.app');
