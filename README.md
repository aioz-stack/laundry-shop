# Laundry Shop POS & Management System

Point of sale and shop management system for a small laundry business in the Philippines. It is **one Laravel 13 application** that contains two parts:

| Part | Where | What it is |
| --- | --- | --- |
| **API** | `routes/api.php`, `app/` | Versioned JSON API at `/api/v1` with Sanctum auth. Every business rule and peso calculation runs here. |
| **Web app** | `resources/js/` | React 19 + TypeScript + Tailwind CSS 4, built by Laravel's Vite. Laravel serves it at `/` and it only talks to the API. |

The project started from the **Baseplate React** template (`gitlab.com/czar.gaba/baseplate-react`), a Laravel + Inertia + React app. Inertia was replaced with an API-first setup so the same API can later serve Capacitor (mobile) or Electron (desktop) apps. From the template, the web app keeps the theme context (same `darkMode` storage key), the click-outside hook, the ApexCharts wrapper, the sidebar/header layout pattern and the Tailwind v4 token approach. The interface itself was fully redesigned. The template's Pest, Pint and Laravel Boost setup is kept; its Boost guidelines now live in `.github/laravel-boost-guidelines.md`.

---

## Requirements

- PHP 8.3+ with `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd` (and `pdo_sqlite` to run the tests)
- Composer 2
- Node.js 20+ and npm
- MySQL 8 or MariaDB 10.6+

## Local setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

Edit `.env` with your database credentials, then create the database (example for XAMPP/MariaDB):

```bash
mysql -uroot -e "CREATE DATABASE laundry_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
```

```bash
php artisan migrate --seed
php artisan storage:link
composer dev
```

`composer dev` runs `php artisan serve`, the queue listener and the Vite dev server together. Open **http://localhost:8000**.

> Open the app on `localhost`, not `127.0.0.1`, unless you add that host to `SANCTUM_STATEFUL_DOMAINS`.

Without hot reload, run `npm run build` once and then just `php artisan serve`.

### Default development accounts

| Role | Username | Password |
| --- | --- | --- |
| Owner / Administrator | `owner` | `password` |
| Desk Operator | `operator` | `password` |
| Laundry Staff | `staff` | `password` |

Change these immediately in any shared or production environment (**Users** page).

### Seed data

- `php artisan migrate --seed` always seeds the core catalogue: the three accounts, six services, five add-ons, Cash/GCash/Maya/Bank Transfer and the shop settings. The seeder is safe to re-run.
- When `APP_ENV=local`, it also runs `DemoSeeder`: 15 customers and two weeks of orders and payments, all created through the real order and payment services.
- Reset everything: `php artisan migrate:fresh --seed`
- Demo data only: `php artisan db:seed --class=DemoSeeder` (it skips itself if orders already exist)

## Environment variables

See `.env.example` for the full list.

| Key | Purpose |
| --- | --- |
| `APP_URL` | Public URL of the app (used for logo URLs) |
| `APP_TIMEZONE` | Defaults to `Asia/Manila` |
| `DB_*` | Database connection |
| `SANCTUM_STATEFUL_DOMAINS` | Hosts that use cookie (session) auth: the `host:port` you open the app on |
| `SESSION_DOMAIN` | Leave `null` unless you know you need it |
| `FRONTEND_URL` | Extra origins allowed to call the API from another domain (future mobile/desktop shells), comma-separated |
| `SANCTUM_TOKEN_EXPIRATION` | Minutes before API tokens expire (blank = never) |
| `TRUSTED_PROXIES` | Proxy IPs for correct HTTPS detection behind Nginx |
| `VITE_API_BASE_URL` | Defaults to `/api/v1` (same origin). Never hard-coded in the source |
| `VITE_AUTH_MODE` | `cookie` (default, session) or `token` (Bearer) |

## Commands

| Command | What it does |
| --- | --- |
| `composer dev` | Laravel server, queue and Vite with hot reload |
| `npm run build` | Typecheck and build the web app into `public/build/` |
| `npm run typecheck` | TypeScript check only |
| `php artisan test` | Pest test suite (47 tests, in-memory SQLite) |
| `vendor/bin/pint` | Format PHP |
| `php artisan route:list --path=api` | List all API routes |

---

## Project layout

```
app/
  Enums/                  Role, Permission, OrderStatus, PaymentStatus, PricingType
  Http/Controllers/Api/V1 API controllers
  Http/Requests/          Form Request validation
  Http/Resources/         API Resources (response shapes)
  Models/                 Eloquent models
  Services/               OrderService, PaymentService, PricingCalculator, ReportService, SequenceGenerator, ActivityLogger
  Support/Money.php       exact centavo arithmetic
database/                 migrations, factories, seeders (DatabaseSeeder, DemoSeeder)
routes/api.php            /api/v1 endpoints
routes/web.php            serves the web app shell for every non-API path
resources/views/app.blade.php   HTML shell that mounts the React app
resources/css/app.css     design tokens (Tailwind v4)
resources/js/
  lib/                    API client, auth context, types, formatting, hooks, toasts, theme
  components/ui/          Button, Field/Input/Select/Toggle, Card/PageHeader/StatCard/Breadcrumbs,
                          Badge/StatusBadge, Modal/ConfirmDialog, DataTable/Pagination/SearchInput,
                          EmptyState/Loading/Alert, Chart
  components/layout/      AppLayout, PosLayout, Sidebar, UserMenu, Brand
  components/pos|orders|customers/   CustomerPicker, PaymentModal, StatusModal, OrderProgress…
  pages/                  POS, Dashboard, Orders, Tracking, Customers, Payments, admin/*
tests/                    Pest feature and unit tests
docs/                     API reference, deployment guide
```

## How it works

### Roles and permissions

Permissions are defined once in `app/Enums/Role.php` and `Permission.php`. Each permission is registered as a Laravel Gate and enforced on every API route with `can:` middleware. The web app only uses the permission list to hide menu items. **The server never trusts the UI.**

| | Owner | Desk Operator | Laundry Staff |
| --- | :-: | :-: | :-: |
| POS, customers, payments, receipts | ✓ | ✓ | |
| Update processing status (washing to ready) | ✓ | ✓ | ✓ |
| Release laundry | ✓ | ✓ | |
| Discounts | unlimited | up to the configured % | |
| Cancel orders, refunds, move status backward | ✓ | | |
| Services & pricing, reports, users, settings, logs | ✓ | | |

### Money and pricing

- Every peso is stored as `DECIMAL(12,2)` and calculated in **integer centavos** (`app/Support/Money.php`). No floating point is ever used.
- The POS sends **only service IDs and quantities**. `PricingCalculator` recalculates subtotal, discount, tax and total from current prices. The live totals on the POS come from `POST /api/v1/orders/quote`, so the screen always shows exactly what will be saved.
- Order items and add-ons store a **snapshot** of the name and price. Changing a price never alters past orders.
- Services can have a minimum billable quantity (for example, 3 kg).

### Payments

- One order can have many payments (cash, GCash, Maya, bank transfer or any method you add).
- The amount paid, balance and payment status are **recomputed from the payment ledger** while the order row is locked.
- Cash overpayment is recorded as tendered amount plus change. Only the balance counts as collected.
- Non-cash payments can't exceed the balance and can require a reference number.
- **Duplicate protection:** an idempotency key (one per POS draft or payment dialog), a `client_reference` on orders, and a 15-second identical-payment guard.
- Reports count **money collected** (payments minus refunds), not order value. A ₱500 order with ₱200 paid adds ₱200 to collections.

### Order lifecycle

`Received → Washing → Drying → Folding → Ready for Pickup → Released`, or `Cancelled`.

- Steps can be skipped forward. Only the owner can move an order backward, and must give remarks.
- Release is allowed only from *Ready for Pickup*, and, by default, only when the balance is zero (configurable).
- Every change is written to `order_status_histories`. Important actions also go to `activity_logs`.
- Order numbers look like `LND-20261116-0001`. The counter is per day, uses a row lock, and the prefix and number of digits are configurable.

### Receipts

`GET /api/v1/orders/{id}/receipt` returns printer-agnostic receipt data. The web app renders it at `/print/receipt/{id}` as a 58 mm or 80 mm thermal layout and prints it from the browser. A future ESC/POS driver can use the same payload.

### Ready for mobile and desktop clients

The API is versioned and doesn't depend on the web app. Login with `device_name` returns a Sanctum personal access token, and logout revokes it. Add the shell's origin to `FRONTEND_URL` for CORS.

Keyboard shortcuts: **F2** opens a new POS order from anywhere, **/** focuses customer search on the POS, **Ctrl+Enter** completes the order, and **Ctrl+K** opens the global order search.

## Documentation

- [API reference](docs/API.md)
- [Production deployment on aaPanel](docs/DEPLOYMENT.md)
