# Production Deployment — aaPanel (Ubuntu)

The API and web app are one Laravel application, so you deploy a **single site**. This deployment doesn't use Docker. It assumes aaPanel with Nginx (Apache notes at the end), PHP 8.3+, MySQL/MariaDB and an SSL certificate from aaPanel's Let's Encrypt integration. The examples use `pos.example.com`; use your own domain.

## 1. Server prerequisites (aaPanel)

1. **App Store** → install Nginx, MySQL (or MariaDB), and PHP 8.3+.
2. PHP → *Install extensions*: `fileinfo`, `opcache`, `intl` (`pdo_mysql`, `mbstring`, `openssl` and `gd` are usually already enabled).
3. PHP → *Disabled functions*: remove `proc_open`, `putenv` and `symlink` from the list. Composer and `artisan storage:link` need them.
4. Install Composer if it isn't already installed: `curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer`
5. Install Node.js 20+ (**App Store → Node.js version manager**) to build the web app. Alternatively, run `npm run build` on your PC and upload `public/build/`.

## 2. Database

aaPanel → **Databases → Add database**: name `laundry_pos`, charset `utf8mb4`. Note the user and password.

## 3. Site

1. **Website → Add site** `pos.example.com` (PHP 8.3). Upload or `git clone` the project to, for example, `/www/wwwroot/laundry-shop`.
2. Site settings:
   - **Site directory** → *Running directory*: `/public`
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
   cd /www/wwwroot/laundry-shop
   composer install --no-dev --optimize-autoloader
   cp .env.example .env
   php artisan key:generate
   ```
   Edit `.env`:
   ```ini
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://pos.example.com
   DB_DATABASE=laundry_pos
   DB_USERNAME=...
   DB_PASSWORD=...
   SANCTUM_STATEFUL_DOMAINS=pos.example.com
   FRONTEND_URL=https://pos.example.com
   SESSION_SECURE_COOKIE=true
   TRUSTED_PROXIES=127.0.0.1
   LOG_LEVEL=warning
   VITE_API_BASE_URL=/api/v1
   VITE_AUTH_MODE=cookie
   ```
4. Build the web app, then migrate and seed the core data. In production, `DemoSeeder` doesn't run.
   ```bash
   npm ci && npm run build
   php artisan migrate --force
   php artisan db:seed --force
   php artisan storage:link
   php artisan optimize
   ```
5. **Change the default passwords right away.** Sign in as `owner` and go to **Users**.

### Storage permissions

The PHP-FPM user on aaPanel is `www`:

```bash
cd /www/wwwroot/laundry-shop
chown -R www:www storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

Uploaded logos are saved in `storage/app/public/branding` and served through the `public/storage` symlink.

### Queue and scheduler

Neither is required. Set `QUEUE_CONNECTION=sync`; nothing is scheduled. If you add queued jobs later, create an aaPanel **Supervisor** process for `php artisan queue:work --tries=3` and a cron job that runs `php artisan schedule:run` every minute.

## 4. Updating

```bash
cd /www/wwwroot/laundry-shop && git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force && php artisan optimize
```

## Future mobile / desktop clients

They call `https://pos.example.com/api/v1` with token auth (`device_name` at login). Add their origins, such as `capacitor://localhost`, to `FRONTEND_URL` (comma-separated) and run `php artisan config:cache`.

## Apache

Set the document root to `public/`. The `.htaccess` file that ships with Laravel handles rewrites, including the web app's routes (`mod_rewrite` must be enabled).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| 401 right after a successful login | `SANCTUM_STATEFUL_DOMAINS` must list the host you open exactly (`pos.example.com`). |
| 419 CSRF token mismatch | Clear cookies. Check that `SESSION_SECURE_COOKIE=true` is only set when the site is on HTTPS. |
| Blank page, or "Vite manifest not found" | Run `npm run build`, and check that `public/build/manifest.json` exists. Delete `public/hot` if it was uploaded. |
| Logo is uploaded but doesn't show | Run `php artisan storage:link`, and check that `APP_URL` is the public HTTPS URL. |
| 500 errors | Check `storage/logs/laravel.log` and the storage permissions. |
