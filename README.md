# AI Calling Lead Generation

Minimal development foundation based on the project proposal:

- `backend/` — Laravel 11 business API and system of record
- `frontend/` — React dashboard built with Vite
- `ai-service/` — FastAPI service for the future real-time voice gateway
- PostgreSQL — local primary database (already installed)

Telephony, OpenAI Realtime, Redis, queues, authentication, and business modules are intentionally not configured yet.

## Installed tools

- PHP 8.3 and Composer 2.8
- Node.js 24 and npm 11
- Python 3.13
- PostgreSQL 18 client tools

## First-time setup

### Laravel backend

Edit `backend/.env` and set your local PostgreSQL credentials:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ai_calling
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

Create the `ai_calling` database in PostgreSQL, then run:

```powershell
cd D:\ai-calling\backend
php artisan migrate
php artisan serve
```

### React frontend

```powershell
cd D:\ai-calling\frontend
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

Using `npm.cmd` avoids the local PowerShell execution-policy restriction on `npm.ps1`.

### FastAPI service

```powershell
cd D:\ai-calling\ai-service
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
- PostgreSQL: `5432`

## MVP order

1. Configure PostgreSQL and build lead CRUD in Laravel.
2. Add the basic React lead-management screen.
3. Prove one test call and store its lifecycle events.
4. Add real-time voice and narrowly scoped actions such as callback and do-not-call.

## Laptop voice prototype

The Calls screen can now open a realtime AI voice session through the laptop's
microphone and speakers. The permanent OpenAI key stays in the Python service.

1. Put `OPENAI_API_KEY=...` in `ai-service/env` (this file is Git-ignored).
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

Start Laravel on port 8000 as well to save call records. Its current `backend/.env`
uses SQLite. Run the migration once, then keep Laravel running:

```powershell
cd D:\ai-voice-agent\backend
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

The **Call Recordings** sidebar page lists saved calls and shows each call's
transcript and notes. It stores data in `leads`, `calls`, and `call_messages`.
It does not capture audio files. To use the existing PostgreSQL tables, change
`backend/.env` to the PostgreSQL connection and credentials, then restart Laravel.

For deployment, serve the browser application over HTTPS. If FastAPI uses a
different public origin, set `VITE_AI_SERVICE_URL` when building React and add
the React origin to `FRONTEND_ORIGINS` in the AI service environment.

