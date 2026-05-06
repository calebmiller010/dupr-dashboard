# DUPR Dashboard

Personal pickleball analytics dashboard that syncs match history from the DUPR API, computes deep analytics, and displays them in a modern single-page app.

## Quick Start (Local Dev)

### Prerequisites

- Python 3.11+
- Node.js 20+
- A DUPR account

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your DUPR credentials
```

`.env` requires three values:

```
DUPR_EMAIL=your@email.com
DUPR_PASSWORD=yourpassword
DUPR_ID=YOUR6C       # Your 6-character DUPR ID (visible on your DUPR profile)
```

### 2. Install dependencies

```bash
# Python
pip install -r requirements.txt

# Frontend
cd src/ui
npm install
cd ../..
```

### 3. Seed data (first time)

If you have an existing raw data dump (like `data/raw/master_history_02112026.json`), copy it to the expected path:

```bash
cp data/raw/master_history_02112026.json data/raw/master_history.json
```

Then reprocess it to generate the analytics cache:

```bash
cd src
python -c "
from pipeline import Pipeline
p = Pipeline(data_dir='../data', dupr_id='YOUR6C')
result = p.reprocess()
print(result.message)
"
```

Or, to fetch fresh data from DUPR and process it in one step:

```bash
cd src
python -c "
from pipeline import Pipeline
p = Pipeline(data_dir='../data', dupr_id='YOUR6C')
result = p.sync(email='your@email.com', password='yourpassword')
print(result.message)
"
```

### 4. Run

**Backend** (terminal 1):

```bash
cd src
uvicorn server:app --reload --port 8000
```

**Frontend dev server** (terminal 2):

```bash
cd src/ui
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api/*` requests to the backend.

Alternatively, build the frontend and serve everything from the backend:

```bash
cd src/ui && npm run build && cd ../..
cd src && uvicorn server:app --port 8000
```

Then open http://localhost:8000.

## Deploy with Docker

```bash
docker compose up --build
```

This builds the frontend, bundles it with the backend, and serves everything on port 8000. The `data/` directory is mounted as a volume so your match history persists.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics` | Full analytics payload (precomputed, zero computation) |
| `GET` | `/api/health` | Storage stats, player ID, file sizes |
| `POST` | `/api/sync` | Fetch new matches from DUPR + recompute analytics |
| `POST` | `/api/reprocess` | Recompute analytics from existing raw data |

## Architecture

```
DUPR API
  |
  v  POST /api/sync (fetch + transform + analyze)
data/raw/master_history.json        <- raw API responses, append-only
  |
  v  transform + analyze (~50ms for 1000 matches)
data/computed/analytics.json        <- precomputed, served by GET /api/analytics
  |
  v
React frontend                     <- single GET, all filtering client-side
```

Two data files. No database. The server never computes on read.

## Project Structure

```
.
├── .env                            # DUPR credentials + player ID
├── requirements.txt                # Python deps (FastAPI, Pydantic, httpx)
├── Dockerfile
├── docker-compose.yml
├── data/
│   ├── raw/
│   │   └── master_history.json     # Append-only raw DUPR responses
│   └── computed/
│       └── analytics.json          # Precomputed analytics cache
├── docs/
│   ├── SPEC.md                     # Full implementation specification
│   └── DUPR_SCHEMA.md              # DUPR API schema reference
└── src/
    ├── server.py                   # FastAPI app
    ├── pipeline/
    │   ├── models.py               # All Pydantic models
    │   ├── store.py                # File I/O (2 files)
    │   ├── dupr_client.py          # DUPR API auth + fetch
    │   ├── transformer.py          # Raw JSON -> ProcessedMatch
    │   ├── analytics.py            # ProcessedMatch[] -> PlayerAnalytics
    │   └── runner.py               # Pipeline orchestrator
    └── ui/                         # React + TypeScript + Tailwind + Recharts
        ├── src/
        │   ├── App.tsx
        │   ├── types.ts            # TypeScript types matching Python models
        │   ├── api.ts              # API client
        │   ├── hooks/
        │   ├── components/
        │   └── utils/
        └── vite.config.ts
```
