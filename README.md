# Laundry Shop POS & Management System

Point of sale and shop management system for a small laundry business in the Philippines.

| Folder | What it is |
| --- | --- |
| `backend/` | Laravel 13 API (`/api/v1`). Sanctum auth, MySQL/MariaDB. Every business rule and peso calculation runs here. |
| `frontend/` | React 19 + TypeScript + Tailwind CSS 4 single-page app (Vite). It only talks to the API, so the build is plain static files. |
| `docs/` | API reference and aaPanel deployment guide. |

The frontend began from the **Baseplate React** template (`gitlab.com/czar.gaba/baseplate-react`). That template is actually a Laravel + Inertia app, and Inertia pages are rendered through Blade. To keep the API usable by future Capacitor and Electron apps, the project was split in two:

- **backend/** is the template's Laravel 13 app with Inertia, Blade views and the CRUD demo removed. It keeps the template's Pest, Pint and Boost setup.
- **frontend/** is a standalone SPA that carries over the template's useful parts: the theme context and `darkMode` storage key, the click-outside hook, the ApexCharts wrapper, the sidebar/header layout pattern and the Tailwind v4 token approach. Everything was then redesigned.

---

## Requirements

- PHP 8.3+ with `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd` (and `pdo_sqlite` to run the tests)
- Composer 2
- Node.js 20+ and npm
- MySQL 8 or MariaDB 10.6+

## Local setup

### 1. Backend

```bash
cd backend
composer install
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
php artisan serve --host=localhost --port=8000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**.

> Use `localhost` for both servers, not `127.0.0.1`. Sanctum cookie auth depends on matching hosts.

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

**backend/.env** (see `.env.example` for the full list)

| Key | Purpose |
| --- | --- |
| `APP_URL` | Public URL of the API (used for logo URLs) |
| `APP_TIMEZONE` | Defaults to `Asia/Manila` |
| `DB_*` | Database connection |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated |
| `SANCTUM_STATEFUL_DOMAINS` | Hosts that use cookie (SPA) auth. Must include the frontend `host:port` |
| `SESSION_DOMAIN` | `null` locally; `.yourdomain.com` when the API and app are on subdomains |
| `SANCTUM_TOKEN_EXPIRATION` | Minutes before API tokens expire (blank = never) |
| `TRUSTED_PROXIES` | Proxy IPs for correct HTTPS detection behind Nginx |

**frontend/.env**

| Key | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | e.g. `http://localhost:8000/api/v1`. Never hard-coded in the source |
| `VITE_AUTH_MODE` | `cookie` (browser SPA) or `token` (Capacitor / Electron / a different domain) |

## Commands

| Where | Command | What it does |
| --- | --- | --- |
| backend | `php artisan serve` | API dev server |
| backend | `php artisan test` | Run the Pest test suite (42 tests, in-memory SQLite) |
| backend | `vendor/bin/pint` | Format PHP |
| backend | `php artisan route:list --path=api` | List all API routes |
| frontend | `npm run dev` | Vite dev server with hot reload |
| frontend | `npm run typecheck` | TypeScript check |
| frontend | `npm run build` | Production build into `frontend/dist/` |

---

## How it works

### Roles and permissions

Permissions are defined once in `backend/app/Enums/Role.php` and `Permission.php`. Each permission is registered as a Laravel Gate and enforced on every route with `can:` middleware. The API sends the user's permissions to the frontend, but only so it can hide menu items. **The server never trusts the UI.**

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
- The POS sends **only service IDs and quantities**. `PricingCalculator` recalculates subtotal, discount, tax and total from current prices. The live totals on the POS come from `POST /orders/quote`, so the screen always shows exactly what will be saved.
- Order items and add-ons store a **snapshot** of the name and price. Changing a price never alters past orders.
- Services can have a minimum billable quantity (for example, 3 kg).

### Payments

- One order can have many payments (cash, GCash, Maya, bank transfer or any method you add).
- The amount paid, balance and payment status are **recomputed from the payment ledger** while the order row is locked. They are never simply incremented.
- Cash overpayment is recorded as tendered amount plus change. Only the balance counts as collected.
- Non-cash payments can't exceed the balance and can require a reference number.
- **Duplicate protection:** an idempotency key (one per POS draft or payment dialog), a `client_reference` on orders, and a 15-second identical-payment guard.
- Reports count **money collected** (payments minus refunds), not order value. A ₱500 order with ₱200 paid adds ₱200 to collections.

### Order lifecycle

`Received → Washing → Drying → Folding → Ready for Pickup → Released`, or `Cancelled`.

- Steps can be skipped forward. Only the owner can move an order backward, and must give remarks.
- Release is allowed only from *Ready for Pickup*, and, by default, only when the balance is zero (configurable).
- Every change is written to `order_status_histories` (from, to, user, time, remarks). Important actions also go to `activity_logs`.
- Order numbers look like `LND-20261116-0001`. The counter is per day, uses a row lock, and the prefix and number of digits are configurable.

### Receipts

`GET /orders/{id}/receipt` returns printer-agnostic receipt data. The SPA renders it as a 58 mm or 80 mm thermal layout and prints it from the browser. A future ESC/POS driver can use the same payload.

### Ready for mobile and desktop clients

- The API is versioned (`/api/v1`) and doesn't depend on the dashboard.
- Login with `device_name` returns a Sanctum personal access token, and logout revokes it.
- The SPA uses `HashRouter` and a relative `base`, so the build runs from any static host or `file://`. That covers Electron and Capacitor shells, which can set `VITE_AUTH_MODE=token`.

## Frontend structure

```
frontend/src/
  lib/            api client, auth context, types, formatting, hooks, toasts, theme
  components/ui/  Button, Field/Input/Select/Toggle, Card/PageHeader/StatCard/Breadcrumbs,
                  Badge/StatusBadge, Modal/ConfirmDialog, DataTable/Pagination/SearchInput,
                  EmptyState/Loading/Alert, Chart
  components/layout/  AppLayout, PosLayout, Sidebar, UserMenu, Brand
  components/pos | orders | customers/  feature components (CustomerPicker, PaymentModal, OrderProgress…)
  pages/          screens (POS, Orders, Tracking, Customers, Payments, admin/*)
```

Keyboard shortcuts: **F2** opens a new POS order from anywhere, **/** focuses customer search on the POS, **Ctrl+Enter** completes the order, and **Ctrl+K** opens the global order search.

## Documentation

- [API reference](docs/API.md)
- [Production deployment on aaPanel](docs/DEPLOYMENT.md)
