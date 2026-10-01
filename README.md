# AI Calling Lead Generation

Minimal development foundation based on the project proposal:

- `backend/` — Laravel 11 business API and system of record
- `frontend/` — React dashboard built with Vite
- `ai-service/` — FastAPI service for the future real-time voice gateway
- MySQL 8+ — primary database

Telephony, Redis, queues, and other business modules are still future work.

## Admin login

Laravel migrations create `admin_users` and `admin_tokens`. The seed command creates a development admin account:

```powershell
cd D:\ai-voice-agent\backend
php artisan migrate
php artisan db:seed
```

Sign in at the React app with `admin@example.com` / `Admin@12345`. Change this sample password before using the app outside local development. The password and session tokens are stored as hashes. Signing out revokes the current token; tokens expire after seven days. The call records API requires an admin token.

The **Add business** and **All businesses** links in the left sidebar store and list business name, contact name, primary and alternative phone numbers, email, and call topics. Run `php artisan migrate` after updating to add these fields to `leads`. Outbound calls to those numbers need a phone provider; no outbound provider is configured yet, so the dashboard does not claim to place a phone call. The existing Calls screen remains a browser microphone test.

## Installed tools

- PHP 8.3 and Composer 2.8
- Node.js 24 and npm 11
- Python 3.13
- MySQL 8+ server and client tools (install separately if needed)

## First-time setup

Copy the repository's `.env.example` to `.env`. This root file is the single
place for environment-specific application URLs:

```env
APP_PUBLIC_URL=http://localhost:5173
AI_SERVICE_URL=http://127.0.0.1:8001
RECORDS_SERVICE_URL=http://127.0.0.1:8000
```

`APP_PUBLIC_URL` is the browser origin. Vite reads the two service URLs for its
development proxy. Browser API requests and WebSocket connections use paths on
the current origin, so the React build does not contain a domain name.

### Laravel backend

Create a MySQL database and application user, then edit `backend/.env` with those credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ai_calling
DB_USERNAME=ai_calling
DB_PASSWORD=your_password
```

Import `database/ai_calling_dump.sql` through phpMyAdmin. It creates only the
`leads`, `calls`, and `call_messages` tables. Then start Laravel:

```powershell
cd D:\ai-voice-agent\backend
php artisan serve
```

### React frontend

```powershell
cd D:\ai-voice-agent\frontend
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

Using `npm.cmd` avoids the local PowerShell execution-policy restriction on `npm.ps1`.

### FastAPI service

```powershell
cd D:\ai-voice-agent\ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Health check: `http://127.0.0.1:8001/health`

### WebSocket realtime gateway

With FastAPI running on port 8001, connect to:

```text
ws://localhost:5173/api/realtime/ws?assistant=keyline
```

`keyline` is the default assistant, so the URL also works without the query
parameter. Use `assistant=subrata` or `assistant=deblina` for the existing voices.
The socket relays OpenAI Realtime JSON
events in both directions. Set `OPENAI_API_KEY` in `ai-service/.env` before
connecting. Audio clients must send Realtime audio events (base64 encoded audio);
this endpoint does not carry raw microphone bytes. The existing browser Calls
screen continues to use WebRTC.

For a deployed service, set `APP_PUBLIC_URL=https://YOUR_DOMAIN` in the root
`.env`. The WebSocket URL then becomes
`wss://YOUR_DOMAIN/api/realtime/ws?assistant=keyline`. Configure the production
web server to route `/api/realtime/` to FastAPI with WebSocket upgrades and
`/api/call-records`, `/api/admin`, and `/api/leads` to Laravel. Vite's proxy only
applies while running the development server.
Set `REALTIME_WS_TOKEN` to a long random secret in deployment. Clients can pass
it in an `Authorization: Bearer` header, or as `?token=...` when custom headers
are unavailable. The AI service allows the origin set in `APP_PUBLIC_URL`.

## Suggested local ports

### LiteSpeed / Apache hosting with frontend/dist

Uploading only the React build does not deploy Laravel. The build now includes
`.htaccess` and `api.php` to route the Laravel APIs on the same domain.

1. Upload **all** contents of `frontend/dist`, including the hidden `.htaccess`,
   to the domain's web root (for example `/home/account/public_html`).
2. Upload `backend` outside that web root (for example `/home/account/backend`).
   Run `composer install --no-dev --optimize-autoloader` in that directory, or
   upload its installed `vendor` directory. The host needs PHP 8.2 or later.
   If the backend lives elsewhere, configure the host's `LARAVEL_BACKEND_PATH`
   environment variable to its absolute path. The PHP entry point also supports
   `admin/backend` or `backend` inside the web root; the supplied `.htaccess`
   blocks direct web access to these folders. Prefer the outside-web-root layout.
   `LARAVEL_BACKEND_PATH` must be a hosting/PHP environment variable; putting it
   in Laravel's `.env` does not configure this entry point.
3. Configure `backend/.env` with the production database credentials,
   `APP_URL=https://voice-agent.keylines.in`, `APP_ENV=production`, and
   `APP_DEBUG=false`. Ensure `APP_KEY` is set; run `php artisan key:generate`
   only for a new deployment without a key. Make `storage` and `bootstrap/cache`
   writable by PHP.
4. Run `php artisan optimize:clear` and `php artisan migrate --force` in the
   backend directory. Provision the admin account in the production database;
   the local development account is not automatically copied to hosting.
5. Visit `/api/admin/me`: an unsigned request should return JSON with HTTP 401,
   rather than the hosting server's HTML 404. Then try signing in.

The host must allow `.htaccess` rewrite rules. Python realtime endpoints still
need a separately deployed FastAPI service and proxy as described above.

- React: `5173`
- Laravel: `8000`
- FastAPI: `8001`
- MySQL: `3306`

## MVP order

1. Configure MySQL and build lead CRUD in Laravel.
2. Add the basic React lead-management screen.
3. Prove one test call and store its lifecycle events.
4. Add real-time voice and narrowly scoped actions such as callback and do-not-call.

## Laptop voice prototype

The Calls screen can now open a realtime AI voice session through the laptop's
microphone and speakers. The permanent OpenAI key stays in the Python service.

1. Put `OPENAI_API_KEY=...` in `ai-service/.env` or `ai-service/env` (both files are Git-ignored).
2. Start FastAPI on port 8001:

```powershell
cd D:\ai-voice-agent\ai-service
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

3. Start React on port 5173:

```powershell
cd D:\ai-voice-agent\frontend
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

4. Open `http://localhost:5173`, select **Start AI call**, and allow microphone
   access.

Start Laravel on port 8000 as well to save call records. Keep Laravel running:

```powershell
cd D:\ai-voice-agent\backend
php artisan serve --host=127.0.0.1 --port=8000
```

The **Call Recordings** sidebar page lists saved calls and shows each call's
transcript and notes. It stores data in `leads`, `calls`, and `call_messages`.
It does not capture audio files. Configure `backend/.env` with the MySQL
connection and credentials, then restart Laravel.

For deployment, serve the browser application over HTTPS and forward the API
paths above from the same public domain.

FastAPI also exposes `GET /leads` through MySQL. Set the same `DB_*` values in
`ai-service/.env` when using that endpoint. The call-record
dashboard itself reads and writes through Laravel's database connection.

