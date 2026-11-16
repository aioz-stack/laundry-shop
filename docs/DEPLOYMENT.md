# Production Deployment — aaPanel (Ubuntu)

This deployment doesn't use Docker. It assumes aaPanel with Nginx (Apache notes at the end), PHP 8.3+, MySQL/MariaDB and an SSL certificate from aaPanel's Let's Encrypt integration.

## Recommended layout

Use two subdomains of your own domain:

| Site | Example | Serves |
| --- | --- | --- |
| API | `api.example.com` | `backend/public` (Laravel) |
| App | `pos.example.com` | `frontend/dist` (static files) |

Both sites share the parent domain, so Sanctum cookie auth works across them.

---

## 1. Server prerequisites (aaPanel)

1. **App Store** → install Nginx, MySQL (or MariaDB), and PHP 8.3+.
2. PHP → *Install extensions*: `fileinfo`, `opcache`, `intl` (`pdo_mysql`, `mbstring`, `openssl` and `gd` are usually already enabled).
3. PHP → *Disabled functions*: remove `proc_open`, `putenv` and `symlink` from the list. Composer and `artisan storage:link` need them.
4. Install Composer if it isn't already installed: `curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer`
5. Install Node.js 20+ (**App Store → Node.js version manager**) to build the frontend, or build it on your PC and upload `dist/`.

## 2. Database

aaPanel → **Databases → Add database**: name `laundry_pos`, charset `utf8mb4`. Note the user and password.

## 3. Backend (API site)

1. **Website → Add site** `api.example.com` (PHP 8.3). Upload or `git clone` the project to, for example, `/www/wwwroot/laundry-shop`.
2. Site settings:
   - **Site directory** → *Running directory*: `/backend/public`
   - Turn off *Anti-XSS (open_basedir)*, or add the project root to it.
   - **SSL** → issue a Let's Encrypt certificate → *Force HTTPS*
   - **URL rewrite** → choose `laravel5`, or paste:
     ```nginx
     location / {
         try_files $uri $uri/ /index.php?$query_string;
     }
     ```
3. Install and configure:
   ```bash
   cd /www/wwwroot/laundry-shop/backend
   composer install --no-dev --optimize-autoloader
   cp .env.example .env
   php artisan key:generate
   ```
   Edit `.env`:
   ```ini
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://api.example.com
   DB_DATABASE=laundry_pos
   DB_USERNAME=...
   DB_PASSWORD=...
   FRONTEND_URL=https://pos.example.com
   SANCTUM_STATEFUL_DOMAINS=pos.example.com
   SESSION_DOMAIN=.example.com
   SESSION_SECURE_COOKIE=true
   SESSION_SAME_SITE=lax
   TRUSTED_PROXIES=127.0.0.1
   LOG_LEVEL=warning
   ```
4. Migrate and seed the core data. In production, `DemoSeeder` doesn't run.
   ```bash
   php artisan migrate --force
   php artisan db:seed --force
   php artisan storage:link
   php artisan config:cache && php artisan route:cache && php artisan event:cache
   ```
5. **Change the default passwords right away.** Sign in as `owner` and go to **Users**.

### Storage permissions

The PHP-FPM user on aaPanel is `www`:

```bash
cd /www/wwwroot/laundry-shop/backend
chown -R www:www storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

Uploaded logos are saved in `storage/app/public/branding` and served through the `public/storage` symlink.

### Queue and scheduler

Neither is required. `QUEUE_CONNECTION=sync` and nothing is scheduled. If you add queued jobs later, create an aaPanel **Supervisor** process for `php artisan queue:work --tries=3` and a cron job that runs `php artisan schedule:run` every minute.

## 4. Frontend (App site)

1. Build it on the server or on your PC:
   ```bash
   cd frontend
   npm ci
   echo 'VITE_API_BASE_URL=https://api.example.com/api/v1' > .env
   echo 'VITE_AUTH_MODE=cookie' >> .env
   npm run build
   ```
2. **Website → Add site** `pos.example.com` as a *static* site (no PHP). Point the site directory at `frontend/dist`, or upload the contents of `dist/` there.
3. **SSL** → Let's Encrypt → *Force HTTPS*.
4. No rewrite rules are needed. The app uses hash URLs (`/#/orders`).

## 5. Updating

```bash
cd /www/wwwroot/laundry-shop && git pull
cd backend && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan optimize
cd ../frontend && npm ci && npm run build
```

## Single-domain alternative

To serve everything from `pos.example.com`, put the built `dist/` files in `backend/public/app/`, set `VITE_API_BASE_URL=/api/v1`, and use `SANCTUM_STATEFUL_DOMAINS=pos.example.com`, `FRONTEND_URL=https://pos.example.com` and `SESSION_DOMAIN=null`. Then visit `https://pos.example.com/app/`.

## Apache

Set the document root to `backend/public`. The `.htaccess` file that ships with Laravel handles rewrites (`mod_rewrite` must be enabled). The static frontend needs no rewrites.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| 401 right after a successful login | `SANCTUM_STATEFUL_DOMAINS` must list the app host exactly. `SESSION_DOMAIN` must be the shared parent (`.example.com`). Both sites must use HTTPS. |
| CORS error in the browser console | `FRONTEND_URL` must exactly match the app origin (scheme and host). Then run `php artisan config:cache`. |
| 419 CSRF token mismatch | Clear cookies. Check that `SESSION_SECURE_COOKIE=true` is only set when the sites are on HTTPS. |
| Logo is uploaded but doesn't show | Run `php artisan storage:link`, and check that `APP_URL` is the public HTTPS API URL. |
| 500 errors | Check `backend/storage/logs/laravel.log` and the storage permissions. |
