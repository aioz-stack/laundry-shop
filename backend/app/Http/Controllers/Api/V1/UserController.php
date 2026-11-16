<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['q' => ['nullable', 'string', 'max:100'], 'role' => ['nullable', 'string']]);

        $users = User::query()
            ->when($request->query('q'), fn ($q, $term) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$term}%")
                ->orWhere('username', 'like', "%{$term}%")))
            ->when(Role::tryFrom((string) $request->query('role')), fn ($q, $role) => $q->where('role', $role->value))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20))
            ->withQueryString();

        return UserResource::collection($users);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = User::create($request->validated() + ['is_active' => true]);

        ActivityLogger::log('user.created', "Created {$user->role->label()} account for {$user->name}", $user);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function update(UserRequest $request, User $user): UserResource
    {
        $data = $request->validated();

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $this->guardLastOwner($request->user(), $user, $data);

        $user->update($data);

        if (! $user->is_active || isset($data['password'])) {
            // Deactivation or a password reset signs the user out of API clients.
            $user->tokens()->delete();
        }

        ActivityLogger::log('user.updated', "Updated account of {$user->name}", $user, [
            'fields' => array_keys(array_diff_key($data, ['password' => true])),
            'password_changed' => isset($data['password']),
        ]);

        return new UserResource($user);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->is($request->user())) {
            throw new BusinessRuleException('You cannot delete your own account.');
        }

        $hasHistory = Order::query()->where('created_by', $user->id)->exists()
            || Payment::query()->where('received_by', $user->id)->exists();

        if ($hasHistory) {
            throw new BusinessRuleException('This user has transaction history. Deactivate the account instead.', [], 409);
        }

        $this->guardLastOwner($request->user(), $user, ['is_active' => false]);

        $user->tokens()->delete();
        $user->delete();

        ActivityLogger::log('user.deleted', "Deleted account of {$user->name}");

        return response()->json(['message' => 'User deleted.']);
    }

    /** @param array<string, mixed> $data */
    private function guardLastOwner(User $actor, User $target, array $data): void
    {
        $losingOwner = $target->role === Role::Owner && (
            (isset($data['role']) && $data['role'] !== Role::Owner->value)
            || (array_key_exists('is_active', $data) && ! $data['is_active'])
        );

        if ($losingOwner && User::query()->where('role', Role::Owner->value)->where('is_active', true)->whereKeyNot($target->id)->doesntExist()) {
            throw new BusinessRuleException('At least one active owner account is required.');
        }

        if ($target->is($actor) && array_key_exists('is_active', $data) && ! $data['is_active']) {
            throw new BusinessRuleException('You cannot deactivate your own account.');
        }
    }
}
