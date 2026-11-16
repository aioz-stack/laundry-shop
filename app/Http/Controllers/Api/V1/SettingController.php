<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSettingsRequest;
use App\Models\Setting;
use App\Services\ActivityLogger;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->payload()]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $values = $request->validated();

        foreach (['tax_rate', 'operator_max_discount_percent'] as $decimalKey) {
            if (array_key_exists($decimalKey, $values)) {
                $values[$decimalKey] = Money::normalize((string) $values[$decimalKey]);
            }
        }

        Setting::putMany($values);

        ActivityLogger::log('settings.updated', 'Updated system settings', null, ['keys' => array_keys($values)]);

        return response()->json(['data' => $this->payload(), 'message' => 'Settings saved.']);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            // SVG is excluded on purpose: it can carry scripts.
            'logo' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024', 'dimensions:max_width=2000,max_height=2000'],
        ]);

        $old = Setting::get('shop_logo');
        $path = $request->file('logo')->store('branding', 'public');

        Setting::putMany(['shop_logo' => $path]);

        if ($old && $old !== $path) {
            Storage::disk('public')->delete($old);
        }

        ActivityLogger::log('settings.logo_updated', 'Updated shop logo');

        return response()->json(['data' => $this->payload(), 'message' => 'Logo updated.']);
    }

    public function removeLogo(): JsonResponse
    {
        $old = Setting::get('shop_logo');

        if ($old) {
            Storage::disk('public')->delete($old);
        }

        Setting::putMany(['shop_logo' => null]);

        return response()->json(['data' => $this->payload(), 'message' => 'Logo removed.']);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $settings = Setting::allValues();
        $settings['shop_logo_url'] = $settings['shop_logo'] ? Storage::disk('public')->url($settings['shop_logo']) : null;
        unset($settings['shop_logo']);

        return $settings;
    }
}
