<?php

namespace Database\Seeders;

use App\Enums\PricingType;
use App\Enums\Role;
use App\Models\LaundryService;
use App\Models\PaymentMethod;
use App\Models\ServiceAddon;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds the data every installation needs: accounts, services, add-ons,
 * payment methods and settings. Safe to run repeatedly.
 *
 * In the local environment it also loads DemoSeeder (sample customers and
 * two weeks of orders) so the dashboard and reports have real data.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedUsers();
        $this->seedServices();
        $this->seedAddons();
        $this->seedPaymentMethods();

        Setting::putMany([
            'shop_name' => 'Fresh Fold Laundry',
            'shop_address' => '123 Rizal Avenue, Barangay San Isidro, Quezon City',
            'shop_phone' => '0917 123 4567',
            'shop_email' => 'hello@freshfold.test',
        ]);

        if (app()->environment('local')) {
            $this->call(DemoSeeder::class);
        }
    }

    private function seedUsers(): void
    {
        $users = [
            ['username' => 'owner', 'name' => 'Maria Santos', 'role' => Role::Owner, 'password' => 'password'],
            ['username' => 'operator', 'name' => 'Juan Dela Cruz', 'role' => Role::Operator, 'password' => 'password'],
            ['username' => 'staff', 'name' => 'Ana Reyes', 'role' => Role::Staff, 'password' => 'password'],
        ];

        foreach ($users as $user) {
            User::query()->firstOrCreate(['username' => $user['username']], $user + ['is_active' => true]);
        }
    }

    private function seedServices(): void
    {
        $services = [
            ['name' => 'Wash, Dry & Fold', 'description' => 'Full service: washed, dried and neatly folded', 'pricing_type' => PricingType::PerKg, 'price' => '35.00', 'minimum_quantity' => '3.00', 'turnaround_hours' => 24],
            ['name' => 'Wash & Dry', 'description' => 'Washed and dried, not folded', 'pricing_type' => PricingType::PerKg, 'price' => '25.00', 'minimum_quantity' => '3.00', 'turnaround_hours' => 24],
            ['name' => 'Dry Only', 'description' => 'Drying for already washed items', 'pricing_type' => PricingType::PerKg, 'price' => '20.00', 'minimum_quantity' => null, 'turnaround_hours' => 12],
            ['name' => 'Ironing', 'description' => 'Pressed and hung', 'pricing_type' => PricingType::PerPiece, 'price' => '15.00', 'minimum_quantity' => null, 'turnaround_hours' => 24],
            ['name' => 'Dry Cleaning', 'description' => 'Barong, gowns, suits and delicate fabrics', 'pricing_type' => PricingType::PerPiece, 'price' => '180.00', 'minimum_quantity' => null, 'turnaround_hours' => 72],
            ['name' => 'Comforter / Blanket', 'description' => 'Special laundry for bulky items', 'pricing_type' => PricingType::Fixed, 'price' => '250.00', 'minimum_quantity' => null, 'turnaround_hours' => 48],
        ];

        foreach ($services as $index => $service) {
            LaundryService::query()->firstOrCreate(['name' => $service['name']], $service + ['sort_order' => $index + 1, 'is_active' => true]);
        }
    }

    private function seedAddons(): void
    {
        $addons = [
            ['name' => 'Fabric Conditioner', 'price' => '15.00'],
            ['name' => 'Premium Detergent', 'price' => '20.00'],
            ['name' => 'Express Processing', 'price' => '80.00', 'description' => 'Same-day release'],
            ['name' => 'Special Handling', 'price' => '50.00', 'description' => 'Delicates and hand-wash items'],
            ['name' => 'Stain Treatment', 'price' => '30.00'],
        ];

        foreach ($addons as $index => $addon) {
            ServiceAddon::query()->firstOrCreate(['name' => $addon['name']], $addon + ['sort_order' => $index + 1, 'is_active' => true]);
        }
    }

    private function seedPaymentMethods(): void
    {
        $methods = [
            ['code' => 'cash', 'name' => 'Cash', 'is_cash' => true, 'requires_reference' => false],
            ['code' => 'gcash', 'name' => 'GCash', 'is_cash' => false, 'requires_reference' => true],
            ['code' => 'maya', 'name' => 'Maya', 'is_cash' => false, 'requires_reference' => true],
            ['code' => 'bank_transfer', 'name' => 'Bank Transfer', 'is_cash' => false, 'requires_reference' => true],
        ];

        foreach ($methods as $index => $method) {
            PaymentMethod::query()->firstOrCreate(['code' => $method['code']], $method + ['sort_order' => $index + 1, 'is_active' => true]);
        }
    }
}
