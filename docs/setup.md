# TITAN Setup Guide

## Prerequisites

| Requirement | Minimum Version | Purpose |
|---|---|---|
| Python | 3.12+ | Backend runtime |
| Node.js | 18+ | Frontend build tooling |
| npm | 9+ | Frontend package manager |
| PostgreSQL | 14+ | Primary database |
| Git | 2.x | Version control |

---

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd TITAN
```

### 2. Environment Configuration

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` with your values:

```env
# ── Database (Required) ──
# Format: postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/titan

# ── Security (Required) ──
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-random-secret-key-at-least-32-characters

# ── AI (Required for chat functionality) ──
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# ── Weather (Optional) ──
# Get free key from: https://www.weatherapi.com/
# If not set, Open-Meteo (free, no key) is used automatically
WEATHER_API_KEY=

# ── News (Optional) ──
# Get free key from: https://newsapi.org/
# If not set, DEV.to + Hacker News public APIs are used automatically
NEWS_API_KEY=

# ── Voice (Optional) ──
# Get from: https://livekit.io/ (free cloud tier)
# If not set, browser WebRTC Speech API is used as fallback
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# ── Maps (Optional) ──
# If not set, OpenStreetMap Nominatim geocoding is used (default)
MAPBOX_TOKEN=
```

### 3. PostgreSQL Database Setup

#### Windows

```powershell
# Using psql (included with PostgreSQL installation)
psql -U postgres
```

```sql
CREATE DATABASE titan;
\q
```

#### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb titan
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb titan
```

### 4. Backend Installation

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 5. Run Database Migrations

```bash
cd backend
alembic upgrade head
```

This creates all 9 tables: `users`, `user_settings`, `conversations`, `messages`, `tasks`, `reminders`, `notes`, `memories`, `activity_logs`.

### 6. Frontend Installation

```bash
cd frontend
npm install
```

---

## Starting the Application

### Backend Server

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend Dev Server

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

### Voice Agent (Optional)

```bash
cd voice_agent
pip install -r requirements.txt
python agent.py
```

Requires `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` to be configured.

---

## Running Tests

```bash
cd backend
python -m pytest tests -v
```

### Test Coverage (23 tests)

| Test File | What It Covers |
|---|---|
| `test_auth.py` | Registration, login, duplicate rejection, invalid password, profile update |
| `test_user_isolation.py` | Cross-user data access prevention |
| `test_tasks.py` | CRUD, filtering, completion |
| `test_reminders.py` | CRUD, status management |
| `test_notes.py` | CRUD, search, pinning |
| `test_memories.py` | CRUD, search, upsert |
| `test_activity.py` | Logging, daily summary |
| `test_ai_tools.py` | Tool executor validation |
| `test_integrations.py` | Weather, news, maps, voice endpoints |

---

## LiveKit Voice Setup

1. Create a free account at [livekit.io](https://livekit.io/)
2. Create a new project in the LiveKit Cloud dashboard
3. Copy the WebSocket URL, API Key, and API Secret
4. Add to your `.env`:
   ```
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=APIxxxx
   LIVEKIT_API_SECRET=your-secret-here
   ```
5. Start the voice agent: `cd voice_agent && python agent.py`

Without LiveKit credentials, the browser's native Web Speech API (recognition + synthesis) is used as a fallback.

---

## Troubleshooting

### Database Connection Failed

```
sqlalchemy.exc.OperationalError: could not connect to server
```

- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` format: `postgresql+asyncpg://user:pass@host:port/dbname`
- Ensure the `titan` database exists: `psql -U postgres -c "\l"`

### CORS Errors in Browser

If you see `Access-Control-Allow-Origin` errors:
- Ensure the backend is running on port 8000
- The Vite proxy in `vite.config.js` forwards `/api` requests to the backend

### Missing API Keys

The Settings > System Health panel shows which credentials are configured and which are missing. Services with missing keys automatically fall back to free alternatives.

### Port Conflicts

```bash
# If port 8000 is in use:
uvicorn app.main:app --reload --port 8001

# If port 5173 is in use:
npm run dev -- --port 3000
```

### Alembic Migration Errors

```bash
# Reset and re-run
alembic downgrade base
alembic upgrade head
```

### Frontend Build Errors

```bash
# Clear cache and rebuild
rm -rf node_modules/.vite
npm run build
```

---

## Production Deployment Notes

For production use, consider:

1. **Reverse proxy:** Use Nginx to serve the frontend and proxy API requests
2. **HTTPS:** Configure SSL certificates (Let's Encrypt)
3. **Database:** Use a managed PostgreSQL instance with connection pooling
4. **Environment:** Use proper secret management (not `.env` files)
5. **Workers:** Run Uvicorn with Gunicorn: `gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker`
6. **Frontend:** Build with `npm run build` and serve the `dist/` folder statically
