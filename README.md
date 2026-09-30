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

