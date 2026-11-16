<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Supports both Sanctum modes:
 *  - Browser SPA on a stateful domain: session cookie (no token returned).
 *  - Mobile / desktop / other clients: send `device_name` to receive a
 *    personal access token for the Authorization: Bearer header.
 */
class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('username', $request->string('username'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'username' => 'The username or password is incorrect.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'username' => 'This account has been deactivated. Please contact the owner.',
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = null;

        if ($request->filled('device_name') || ! $request->hasSession()) {
            $token = $user->createToken($request->input('device_name') ?: 'api')->plainTextToken;
        } else {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();
        }

        $request->setUserResolver(fn () => $user);
        ActivityLogger::log('auth.login', "{$user->name} signed in", $user);

        return response()->json(array_filter([
            'data' => new UserResource($user),
            'token' => $token,
            'token_type' => $token ? 'Bearer' : null,
        ]));
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        } else {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
        }

        return response()->json(['message' => 'Signed out.']);
    }
}
