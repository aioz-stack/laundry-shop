<?php

use App\Models\User;

beforeEach(fn () => seedCatalogue());

test('a user can log in and receive a token for API clients', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'operator',
        'password' => 'password',
        'device_name' => 'pest',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.username', 'operator')
        ->assertJsonPath('data.role', 'operator')
        ->assertJsonPath('token_type', 'Bearer')
        ->assertJsonMissingPath('data.password');

    $token = $response->json('token');

    $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.username', 'operator');
});

test('wrong credentials are rejected', function () {
    $this->postJson('/api/v1/auth/login', ['username' => 'operator', 'password' => 'nope', 'device_name' => 'x'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('username');
});

test('deactivated users cannot log in', function () {
    User::factory()->inactive()->create(['username' => 'gone', 'password' => 'password']);

    $this->postJson('/api/v1/auth/login', ['username' => 'gone', 'password' => 'password', 'device_name' => 'x'])
        ->assertStatus(422);
});

test('logout revokes the personal access token', function () {
    $token = $this->postJson('/api/v1/auth/login', ['username' => 'owner', 'password' => 'password', 'device_name' => 'x'])->json('token');

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

    expect(User::query()->where('username', 'owner')->first()->tokens()->count())->toBe(0);
});

test('guests get a JSON 401 from protected endpoints', function () {
    $this->getJson('/api/v1/orders')->assertUnauthorized()->assertJsonStructure(['message']);
});

test('login is rate limited', function () {
    foreach (range(1, 5) as $i) {
        $this->postJson('/api/v1/auth/login', ['username' => 'owner', 'password' => 'bad'])->assertStatus(422);
    }

    $this->postJson('/api/v1/auth/login', ['username' => 'owner', 'password' => 'bad'])->assertStatus(429);
});
