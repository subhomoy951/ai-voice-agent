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

## Suggested local ports

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

For deployment, serve the browser application over HTTPS. If FastAPI uses a
different public origin, set `VITE_AI_SERVICE_URL` when building React and add
the React origin to `FRONTEND_ORIGINS` in the AI service environment.

FastAPI also exposes `GET /leads` through MySQL. Set the same `DB_*` values in
`ai-service/.env` when using that endpoint. The call-record
dashboard itself reads and writes through Laravel's database connection.

