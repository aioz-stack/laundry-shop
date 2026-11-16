<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\ServiceAddonRequest;
use App\Http\Resources\ServiceAddonResource;
use App\Models\ServiceAddon;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ServiceAddonController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $includeInactive = $request->boolean('include_inactive') && $request->user()->hasPermission(Permission::ServicesManage);

        return ServiceAddonResource::collection(
            ServiceAddon::query()
                ->when(! $includeInactive, fn ($q) => $q->where('is_active', true))
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
        );
    }

    public function store(ServiceAddonRequest $request): JsonResponse
    {
        $addon = ServiceAddon::create($request->validated() + ['is_active' => true, 'sort_order' => 0]);

        ActivityLogger::log('addon.created', "Added add-on {$addon->name} at ₱{$addon->price}", $addon);

        return (new ServiceAddonResource($addon))->response()->setStatusCode(201);
    }

    public function update(ServiceAddonRequest $request, ServiceAddon $addon): ServiceAddonResource
    {
        $addon->update($request->validated());

        ActivityLogger::log('addon.updated', "Updated add-on {$addon->name}", $addon);

        return new ServiceAddonResource($addon);
    }

    public function destroy(ServiceAddon $addon): JsonResponse
    {
        $addon->update(['is_active' => false]);
        $addon->delete();

        ActivityLogger::log('addon.deleted', "Removed add-on {$addon->name}", $addon);

        return response()->json(['message' => 'Add-on removed.']);
    }
}
