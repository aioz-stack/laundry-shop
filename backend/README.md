# Laundry POS — Backend API

Laravel 13 API for the Laundry Shop POS. See the root [README](../README.md) for setup and [docs/API.md](../docs/API.md) for endpoints.

```bash
composer install && cp .env.example .env && php artisan key:generate
php artisan migrate --seed
php artisan serve --host=localhost --port=8000
php artisan test
```
