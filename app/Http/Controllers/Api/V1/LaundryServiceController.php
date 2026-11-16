<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\LaundryServiceRequest;
use App\Http\Resources\LaundryServiceResource;
use App\Models\LaundryService;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LaundryServiceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        // Inactive services are only listed for people who manage pricing.
        $includeInactive = $request->boolean('include_inactive') && $request->user()->hasPermission(Permission::ServicesManage);

        $services = LaundryService::query()
            ->when(! $includeInactive, fn ($q) => $q->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return LaundryServiceResource::collection($services);
    }

    public function show(LaundryService $service): LaundryServiceResource
    {
        return new LaundryServiceResource($service);
    }

    public function store(LaundryServiceRequest $request): JsonResponse
    {
        $service = LaundryService::create($request->validated() + ['is_active' => true, 'sort_order' => 0]);

        ActivityLogger::log('service.created', "Added service {$service->name} at ₱{$service->price}", $service);

        return (new LaundryServiceResource($service))->response()->setStatusCode(201);
    }

    public function update(LaundryServiceRequest $request, LaundryService $service): LaundryServiceResource
    {
        $before = $service->only(['price', 'pricing_type', 'is_active']);
        $service->update($request->validated());

        ActivityLogger::log('service.updated', "Updated service {$service->name}", $service, [
            'before' => $before,
            'after' => $service->only(['price', 'pricing_type', 'is_active']),
        ]);

        return new LaundryServiceResource($service);
    }

    /**
     * Soft delete: historical orders keep their snapshot of name and price.
     */
    public function destroy(LaundryService $service): JsonResponse
    {
        $service->update(['is_active' => false]);
        $service->delete();

        ActivityLogger::log('service.deleted', "Removed service {$service->name}", $service);

        return response()->json(['message' => 'Service removed.']);
    }
}
