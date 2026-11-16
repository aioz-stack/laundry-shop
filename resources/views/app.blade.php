<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b5f73" />
    <title>{{ config('app.name', 'Laundry POS') }}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <script>
      // Apply dark mode before first paint (same approach as the Baseplate template).
      try {
        if (JSON.parse(localStorage.getItem('darkMode') || 'false') === true) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {}
    </script>
    {{-- The React web app is a client of /api/v1; this view only mounts it. --}}
    @viteReactRefresh
    @vite('resources/js/main.tsx')
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
