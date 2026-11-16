<?php

test('the web app shell is served for app routes', function (string $path) {
    $this->withoutVite();

    $this->get($path)->assertOk()->assertSee('<div id="root"></div>', false);
})->with(['/', '/pos', '/orders/12', '/print/receipt/3']);

test('unknown API paths return JSON 404 instead of the web app', function () {
    $this->getJson('/api/v1/nope')->assertNotFound()->assertJson(['message' => 'Endpoint not found.']);
    $this->get('/api/v1/nope')->assertNotFound()->assertDontSee('id="root"', false);
});
