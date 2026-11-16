# API Reference — v1

Base URL: `{APP_URL}/api/v1`. Every request and response is JSON. Send `Accept: application/json`.

## Authentication

There are two Sanctum modes, and both use the same endpoints:

| Client | How |
| --- | --- |
| Browser SPA on a stateful domain | `GET /sanctum/csrf-cookie`, then `POST /auth/login` with the `X-XSRF-TOKEN` header and `withCredentials`. A session cookie is issued and no token is returned. |
| Mobile / desktop / scripts | `POST /auth/login` with `device_name`. The response includes `token`. Send `Authorization: Bearer {token}` on later requests. |

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/login` | `{ username, password, device_name? }`. Limited to 5 attempts per minute per username and IP. |
| GET | `/auth/me` | The current user, including `permissions[]` |
| POST | `/auth/logout` | Revokes the current token or ends the session |

## Response conventions

- Single resource: `{ "data": { … } }`
- Paginated list: `{ "data": [ … ], "meta": { current_page, last_page, per_page, total, from, to }, "links": { … } }`. Query with `?page=` and `?per_page=`.
- Validation error (422): `{ "message": "…", "errors": { "field": ["…"] } }`
- Business rule violation: 422, 403 or 409 with `{ "message": "…" }`
- 401 means unauthenticated, 403 means forbidden, 404 means not found, 409 means conflict or duplicate, 429 means rate limited.
- Money values are strings with 2 decimals (`"175.00"`). Timestamps are ISO-8601 in `APP_TIMEZONE`.

## Endpoints

Each row lists the permission it requires (see `app/Enums/Role.php`).

### Meta & dashboard
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/meta` | auth | Order statuses, payment statuses, pricing types, roles |
| GET | `/settings` | auth | Shop profile and rules (logo as `shop_logo_url`) |
| GET | `/dashboard` | dashboard.view | Stats, status overview, 14-day sales chart, recent orders and payments. Money figures are included only for users with `payments.view`. |

### Customers
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/customers` | customers.view | `q` (phone, name or code), `with_balance=1`, `per_page`. Each customer includes `orders_count`, `total_spent`, `outstanding_balance`. |
| POST | `/customers` | customers.manage | `{ name, phone, email?, address?, notes? }` |
| GET | `/customers/{id}` | customers.view | `{ data: customer, orders: [last 50] }` |
| PUT | `/customers/{id}` | customers.manage | |
| DELETE | `/customers/{id}` | customers.delete | Returns 409 if the customer has orders |

### Services, add-ons, payment methods
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/services` | services.view | `include_inactive=1` (owner only) |
| GET | `/services/{id}` | services.view | |
| POST/PUT | `/services[/{id}]` | services.manage | `{ name, pricing_type: per_kg\|per_piece\|fixed, price, minimum_quantity?, turnaround_hours?, is_active, sort_order? }` |
| DELETE | `/services/{id}` | services.manage | Soft delete. Past orders keep their snapshots. |
| GET | `/service-addons` | services.view | |
| POST/PUT/DELETE | `/service-addons[/{id}]` | services.manage | `{ name, price, description?, is_active }` |
| GET | `/payment-methods` | auth | |
| POST/PUT/DELETE | `/payment-methods[/{id}]` | settings.manage | `{ name, code, is_cash, requires_reference, is_active }`. DELETE returns 409 if the method has payments. |

### Orders
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/orders` | orders.view | `q` (order number, name or phone), `status` (one status or a comma-separated list), `active=1`, `payment_status`, `date_from`, `date_to`, `customer_id`, `sort=latest\|oldest\|expected`, `per_page` (max 200) |
| POST | `/orders/quote` | orders.create | Same body as create. Returns server-calculated totals and saves nothing. |
| POST | `/orders` | orders.create | See the request body below. Returns 201, or 200 with `meta.duplicate=true` if `client_reference` was already used. |
| GET | `/orders/{id}` | orders.view | Includes items, add-ons, payments (only with `payments.view`), status history |
| PUT | `/orders/{id}` | orders.update | Only `{ notes?, expected_at? }`. Items and prices are locked once saved. |
| POST | `/orders/{id}/status` | orders.status | `{ status, remarks? }`. Role rules are listed below. |
| GET | `/orders/{id}/history` | orders.view | Status history |
| GET | `/orders/{id}/receipt` | payments.view | Receipt payload (shop, paper width, terms, footer, order) |

Request body for `POST /orders`:

```json
{
  "client_reference": "uuid (optional, prevents duplicates)",
  "customer_id": 12,
  "items": [{ "service_id": 1, "quantity": "5.5", "notes": null }],
  "addons": [{ "addon_id": 1, "quantity": 1 }],
  "discount": { "type": "percent|fixed", "value": "10", "reason": "Senior" },
  "expected_at": "2026-11-18T10:00:00+08:00",
  "notes": "Separate whites",
  "payment": { "payment_method_id": 1, "amount": "200", "reference_number": null }
}
```

Any price, subtotal or total fields sent by the client are ignored.

Status rules:

- Processing statuses only move forward, and steps may be skipped. Only the owner can move backward, and must give remarks.
- `released` is allowed only from `ready_for_pickup`, needs `orders.release`, and needs a zero balance unless that setting is turned off.
- `cancelled` needs `orders.cancel` (owner) and remarks.
- Released and cancelled orders are final.

### Payments
| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/payments` | payments.view | `q`, `payment_method_id`, `type=payment\|refund`, `date_from`, `date_to` |
| GET | `/orders/{id}/payments` | payments.view | |
| POST | `/orders/{id}/payments` | payments.create | `{ payment_method_id, amount, reference_number?, notes?, idempotency_key? }`. Returns `{ data: payment, order, meta.duplicate }`. |
| POST | `/orders/{id}/refunds` | payments.refund | `{ payment_method_id, amount, notes (reason), reference_number? }` |

Payment rules:

- The applied amount is `min(amount, balance)`. For cash, anything above the balance is returned as `change_given`. Non-cash payments above the balance get a 422.
- Paying a fully paid or cancelled order returns 422.
- Repeating the same `idempotency_key` returns the original payment (200, `duplicate: true`).
- The same amount and method on the same order within 15 seconds, without a key, returns 409.

### Reports (owner)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/reports/sales` | `from`, `to`, `group_by=day\|week\|month`. Totals: order_value, collected, outstanding, discounts. |
| GET | `/reports/orders` | Totals: total, completed, cancelled, active, average order value. Also `by_status` and `by_service`. |
| GET | `/reports/payments` | `by_method` (received, refunded, net) and up to 500 transactions |

Add `&format=csv` to download a CSV (UTF-8 with BOM). The date range is capped at 366 days.

### Administration (owner)
| Method | Path | Notes |
| --- | --- | --- |
| PUT | `/settings` | Any subset of the setting keys (see `App\Models\Setting::defaults()`) |
| POST | `/settings/logo` | multipart `logo`: png/jpg/webp, at most 1 MB |
| DELETE | `/settings/logo` | |
| GET/POST/PUT/DELETE | `/users[/{id}]` | `{ name, username, email?, phone?, role, is_active, password }`. You can't delete or deactivate yourself, and at least one active owner must remain. Users with transaction history can only be deactivated. |
| GET | `/activity-logs` | `q`, `action` (prefix such as `order`), `user_id`, `date_from`, `date_to` |

## Rate limits

| Limiter | Limit |
| --- | --- |
| `login` | 5 per minute per username and IP, plus 30 per minute per IP |
| `api` | 240 per minute per user |
| `transactions` (create order, payment, refund) | 40 per minute per user |
