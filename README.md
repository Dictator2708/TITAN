# ⚡ TITAN — Personal AI Command Center

> A powerful, polished personal AI assistant built for real daily use. Natural language interface with text and voice, backed by 22 controlled AI tools, persistent memory, live external data, and a premium dark-themed dashboard.

---

## Features

| Category | Capabilities |
|---|---|
| **AI Chat** | Multi-step reasoning, OpenAI function calling, natural language tool invocation |
| **Tasks** | Full CRUD, priorities (low/medium/high/critical), due dates, status filters, 1-click complete |
| **Reminders** | Scheduled alerts, background AsyncIO poller (15s), browser notification delivery |
| **Notes** | Create/edit/delete, pinning, tags, full-text search |
| **Memory** | Intentional long-term storage (preferences, facts, goals, projects), category filtering |
| **Weather** | Live multi-day forecasts via WeatherAPI with Open-Meteo zero-key fallback |
| **News** | Tech/AI/Science/Business feeds via NewsAPI with DEV.to + Hacker News fallback |
| **Maps** | Interactive Leaflet map with OpenStreetMap Nominatim geocoding |
| **Voice** | LiveKit real-time streaming + browser WebRTC Speech Recognition/Synthesis fallback |
| **Activity** | Chronological audit trail of all system actions and tool executions |
| **Settings** | Profile, timezone, theme, voice speed, custom AI system instructions |
| **Health** | Live diagnostic panel showing database status and credential configuration |
| **Auth** | JWT + bcrypt, strict per-user data isolation across all entities |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Database | PostgreSQL 14+, SQLAlchemy 2.0 (async), Alembic |
| Frontend | React 18, Vite, Vanilla CSS |
| AI | OpenAI API (GPT-4o), function calling |
| Voice | LiveKit + Python agent, Web Speech API fallback |
| Maps | Leaflet, OpenStreetMap, Nominatim |
| Weather | WeatherAPI / Open-Meteo |
| News | NewsAPI / DEV.to / Hacker News |
| Auth | JWT (PyJWT), bcrypt |

---

## Architecture

```
User (Text / Voice)
     │
     ▼
React Frontend ──────────────────────┐
     │                               │
     ▼                               │
FastAPI Backend                      │
     │                               │
     ▼                               │
AI Orchestrator ─── OpenAI API       │
     │                               │
     ▼                               │
Tool Selection (22 validated tools)  │
     │                               │
     ▼                               │
Backend Validation & Execution       │
     │                               │
     ├──▶ PostgreSQL                  │
     ├──▶ WeatherAPI / Open-Meteo    │
     ├──▶ NewsAPI / DEV.to / HN      │
     ├──▶ Nominatim Geocoding        │
     └──▶ LiveKit Voice Server       │
                                     │
Response ◀───────────────────────────┘
```

**Security model:** The LLM never executes raw SQL, shell commands, or arbitrary code. Every action passes through bounded, validated tool functions scoped to the authenticated user.

---

## Project Structure

```
TITAN/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint + lifespan
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic settings (.env loader)
│   │   │   ├── security.py            # bcrypt + JWT
│   │   │   └── exceptions.py          # HTTP exceptions
│   │   ├── database/
│   │   │   ├── base.py                # Declarative Base
│   │   │   └── session.py             # Async engine + session
│   │   ├── models/                    # SQLAlchemy 2.0 models (9 tables)
│   │   ├── schemas/                   # Pydantic request/response schemas
│   │   ├── services/                  # Business logic (12 service modules)
│   │   ├── ai/
│   │   │   ├── orchestrator.py        # Multi-step reasoning loop
│   │   │   ├── prompts.py             # Dynamic context prompt builder
│   │   │   └── tools/
│   │   │       ├── definitions.py     # 22 OpenAI tool definitions
│   │   │       └── executor.py        # Safe tool dispatcher
│   │   ├── api/
│   │   │   ├── deps.py                # Auth & DB dependencies
│   │   │   ├── router.py              # Route aggregator
│   │   │   └── v1/                    # 14 API route modules
│   │   └── workers/
│   │       └── scheduler.py           # Background reminder poller
│   ├── alembic/                       # Database migrations
│   ├── tests/                         # 23 automated test cases
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router + protected routes
│   │   ├── main.jsx                   # React entry
│   │   ├── styles/                    # Design tokens + global CSS
│   │   ├── services/api.js            # Unified API client (JWT auto-attach)
│   │   ├── context/                   # Auth, Theme, Toast providers
│   │   ├── components/                # Reusable UI (Button, Modal, Layout)
│   │   └── pages/                     # 12 page components
│   ├── package.json
│   └── vite.config.js
├── voice_agent/
│   ├── agent.py                       # LiveKit real-time voice worker
│   └── requirements.txt
├── docs/
│   ├── architecture.md
│   └── setup.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Python** 3.12+
- **Node.js** 18+ and npm
- **PostgreSQL** 14+
- **Git**

---

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd TITAN
```

### 2. Backend Setup

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

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Environment Configuration

Copy `.env.example` to `.env` in the project root and configure:

```bash
cp .env.example .env
```

```env
# ── Required ──
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/titan
SECRET_KEY=generate-a-random-secret-key-minimum-32-chars

# ── AI (Required for chat) ──
OPENAI_API_KEY=sk-...

# ── Weather (Optional — Open-Meteo fallback available) ──
WEATHER_API_KEY=your-weatherapi-key

# ── News (Optional — DEV.to / Hacker News fallback available) ──
NEWS_API_KEY=your-newsapi-key

# ── Voice (Optional — browser WebRTC fallback available) ──
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxx
LIVEKIT_API_SECRET=your-secret

# ── Maps (Optional — OSM Nominatim used by default) ──
MAPBOX_TOKEN=pk.your-mapbox-token
```

### 5. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE titan;
\q

# Run migrations
cd backend
alembic upgrade head
```

### 6. Start the Application

```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

### 7. Voice Agent (Optional)

```bash
cd voice_agent
pip install -r requirements.txt
python agent.py
```

---

## Running Tests

```bash
cd backend
python -m pytest tests -v
```

All 23 tests cover: authentication, duplicate registration rejection, invalid password handling, profile updates, strict user isolation, task/reminder/note/memory CRUD, activity logging, AI tool executor, weather/news/maps/voice endpoints, and health check.

---

## External Services

| Service | Where to Get Credentials | Required? | Fallback |
|---|---|---|---|
| **OpenAI** | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Yes (for AI chat) | None |
| **WeatherAPI** | [weatherapi.com](https://www.weatherapi.com/) (free tier) | No | Open-Meteo (zero-key) |
| **NewsAPI** | [newsapi.org](https://newsapi.org/) (free tier) | No | DEV.to + Hacker News |
| **LiveKit** | [livekit.io](https://livekit.io/) (free cloud) | No | Browser WebRTC Speech API |
| **Mapbox** | [mapbox.com](https://www.mapbox.com/) (free tier) | No | OSM Nominatim |

---

## AI Tool System

TITAN uses 22 controlled tools organized into 7 categories:

| Category | Tools | Count |
|---|---|---|
| Tasks | `create_task`, `list_tasks`, `get_task`, `update_task`, `complete_task`, `delete_task` | 6 |
| Reminders | `create_reminder`, `list_reminders`, `get_reminder`, `update_reminder`, `delete_reminder` | 5 |
| Notes | `create_note`, `search_notes`, `get_note`, `update_note`, `delete_note` | 5 |
| Memory | `save_memory`, `search_memory`, `delete_memory` | 3 |
| Activity | `get_activity`, `get_daily_summary` | 2 |
| Information | `get_weather`, `get_news`, `search_location` | 3 |
| Conversations | `get_conversation_history`, `search_conversations` | 2 |

---

## Security

- **Authentication:** JWT tokens with configurable expiration
- **Password Storage:** Direct bcrypt hashing (not passlib)
- **Data Isolation:** Every database query scoped to authenticated `user_id`
- **Tool Execution:** LLM selects tools; backend validates and executes
- **No Raw Access:** LLM cannot execute SQL, shell commands, or arbitrary code
- **CORS:** Configured for frontend origin
- **Secrets:** All credentials via environment variables, never committed

---

## Known Limitations

- Voice requires LiveKit credentials for full server-side streaming; browser WebRTC speech works as fallback
- Weather and News free-tier APIs have rate limits
- PostgreSQL is required (SQLite not supported for production use)
- OpenAI API key is required for AI chat functionality
- The application is designed for local/personal use; production deployment requires additional hardening

---

## License

Personal project. All rights reserved.
