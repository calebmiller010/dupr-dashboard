# Better DUPR - AI Agent Guide

## Project Overview

Better DUPR is a personal pickleball analytics dashboard that syncs match history from the DUPR (Dynamic Universal Pickleball Rating) API, computes deep analytics, and displays them in a modern single-page application.

The project follows a **file-based architecture with zero database** - all data is stored in JSON files. The server never computes on read - all analytics are precomputed during sync.

### Data Flow Architecture

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

## Technology Stack

### Backend
- **Python 3.11+**
- **FastAPI** - Web framework
- **Pydantic 2.x** - Data validation and models
- **httpx** - HTTP client for DUPR API
- **uvicorn** - ASGI server

### Frontend
- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7.x** - Build tool and dev server
- **Tailwind CSS 4.x** - Styling
- **Recharts** - Data visualization

### Infrastructure
- **Docker** - Containerization (multi-stage build)
- **Docker Compose** - Local deployment

## Project Structure

```
.
├── .env                            # DUPR credentials + player ID (required)
├── requirements.txt                # Python dependencies
├── Dockerfile                      # Multi-stage build (Node + Python)
├── docker-compose.yml              # Local deployment config
├── data/                           # All data files (JSON only)
│   ├── raw/
│   │   └── master_history.json     # Append-only raw DUPR responses
│   ├── computed/
│   │   └── analytics.json          # Precomputed analytics cache
│   ├── backups/                    # Automatic session backups
│   ├── sessions.json               # User-curated session metadata
│   └── config.json                 # App configuration (thresholds)
├── docs/
│   └── DUPR_SCHEMA.md              # DUPR API schema reference
└── src/
    ├── server.py                   # FastAPI app with all endpoints
    ├── pipeline/                   # Data processing pipeline
    │   ├── __init__.py             # Exports Pipeline, PlayerAnalytics
    │   ├── models.py               # All Pydantic models (621 lines)
    │   ├── store.py                # File I/O operations
    │   ├── dupr_client.py          # DUPR API auth + fetch
    │   ├── transformer.py          # Raw JSON -> ProcessedMatch
    │   ├── analytics.py            # ProcessedMatch[] -> PlayerAnalytics
    │   └── runner.py               # Pipeline orchestrator
    └── ui/                         # React + TypeScript frontend
        ├── package.json            # Node dependencies
        ├── vite.config.ts          # Vite config with proxy
        ├── tsconfig.json           # TypeScript project references
        └── src/
            ├── App.tsx             # Main app with tab routing
            ├── types.ts            # TypeScript types matching Python models
            ├── api.ts              # API client functions
            ├── index.css           # Tailwind CSS imports
            ├── main.tsx            # React entry point
            ├── hooks/              # React hooks
            │   ├── useAnalytics.ts # Data fetching hook
            │   └── useHashState.ts # URL hash state management
            ├── components/         # React components organized by feature
            │   ├── layout/         # Shell, TabNav
            │   ├── dashboard/      # Charts, stats, session views
            │   ├── people/         # Partner/opponent leaderboards
            │   ├── splits/         # Context split visualizations
            │   ├── scoring/        # Clutch stats, insights
            │   ├── wizard/         # Import wizard components
            │   └── common/         # Reusable UI components
            └── utils/              # Formatting utilities
```

## Configuration Files

### Environment Variables (`.env`)
```
DUPR_EMAIL=your@email.com
DUPR_PASSWORD=yourpassword
DUPR_ID=YOUR6C       # Your 6-character DUPR ID
```

**Note**: The `.env` file is required for the application to function. It loads automatically on server startup.

### Python Dependencies (`requirements.txt`)
- fastapi>=0.104.0
- uvicorn[standard]>=0.24.0
- pydantic>=2.5.0
- httpx>=0.25.0

### Frontend Dependencies (`src/ui/package.json`)
Key dependencies:
- react ^19.2.0
- recharts ^3.7.0
- tailwindcss ^4.1.18
- @tailwindcss/vite ^4.1.18
- typescript ~5.9.3
- vite ^7.3.1

## Build and Run Commands

### Local Development (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd src
uvicorn server:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd src/ui
npm run dev
```

The Vite dev server runs on port 5173 and proxies `/api/*` requests to the backend on port 8000.

### Production Build

Build the frontend and serve from backend:
```bash
cd src/ui && npm run build && cd ../..
cd src && uvicorn server:app --port 8000
```

Then open http://localhost:8000.

### Docker Deployment

```bash
docker compose up --build
```

This builds the frontend, bundles it with the backend, and serves everything on port 8000. The `data/` directory is mounted as a volume for persistence.

## Data Pipeline

### Key Pipeline Classes

1. **Pipeline** (`runner.py`) - Main orchestrator
   - `sync(email, password)` - Fetch new matches from DUPR
   - `reprocess()` - Recompute analytics from existing data
   - `cancel_sync()` - Rollback pending matches

2. **FileStore** (`store.py`) - All file I/O
   - `master_history.json` - Raw API responses
   - `analytics.json` - Computed analytics
   - `sessions.json` - User annotations
   - `config.json` - App settings

3. **MatchTransformer** (`transformer.py`) - Data transformation
   - Chain-sorts matches by rating values to determine true play order
   - Classifies matches by narrative and matchup context

4. **AnalyticsEngine** (`analytics.py`) - Analytics computation
   - Single pass through matches
   - Computes all aggregates, streaks, people stats

### Two-Phase Sync Process

1. **Phase 1** (`/api/sync`): Fetch matches, return session previews for import wizard
2. **Phase 2** (`/api/sessions` POST): Save annotations, recompute analytics

If user skips import: `POST /api/sync/cancel` removes pending matches.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics` | Full analytics payload (precomputed) |
| `GET` | `/api/health` | Storage stats, player ID, file sizes |
| `POST` | `/api/sync` | Fetch new matches + recompute |
| `POST` | `/api/reprocess` | Recompute from existing raw data |
| `POST` | `/api/sync/cancel` | Cancel pending sync |
| `GET` | `/api/sessions` | Get session metadata + suggestions |
| `POST` | `/api/sessions` | Save session annotations |
| `PUT` | `/api/sessions` | Overwrite sessions (from Config) |
| `GET` | `/api/config` | Get app configuration |
| `PUT` | `/api/config` | Save app configuration |

## Code Style Guidelines

### Python
- Type hints required for function signatures
- Pydantic models for all data structures
- Docstrings for module-level documentation
- Use `pathlib.Path` for file operations
- Logging via `logging.getLogger(__name__)`

### TypeScript/React
- Functional components with hooks
- TypeScript interfaces in `types.ts` mirror Python Pydantic models
- Tailwind CSS for styling (utility classes)
- Component organization by feature (dashboard/, people/, etc.)
- Props interfaces defined inline or in types file

### File Organization Principles
- One model per concept (enums, splits, matches all in `models.py`)
- No circular imports - models don't import business logic
- Pipeline modules are pure functions + classes
- Frontend components co-located by feature area

## Testing Strategy

Currently, the project has **no automated test suite**. Testing is manual:

1. **Backend testing**: Run `python -c "from pipeline import Pipeline; p = Pipeline(...); p.reprocess()"`
2. **Frontend testing**: Manual browser testing via dev server
3. **API testing**: Use `/api/health` to verify data state

To add tests, consider:
- pytest for Python backend
- Vitest or Jest for TypeScript frontend

## Security Considerations

1. **Credentials**: Stored in `.env` file (not in repo)
2. **DUPR_TOKEN**: Can use env var to bypass login for rate limit issues
3. **CORS**: Currently allows all origins (`allow_origins=["*"]`)
4. **No auth**: The app is single-user; no session management
5. **File paths**: Uses Path operations, no user-input paths in file I/O

## Common Development Tasks

### Adding a New Analytics Metric

1. Add field to `PlayerAnalytics` model in `pipeline/models.py`
2. Compute in `AnalyticsEngine.compute()` in `pipeline/analytics.py`
3. Add to TypeScript `PlayerAnalytics` interface in `ui/src/types.ts`
4. Display in appropriate component in `ui/src/components/`

### Adding a New API Endpoint

1. Add handler in `server.py` with appropriate HTTP method
2. Use `pipeline` instance for data access
3. Add corresponding function in `ui/src/api.ts`
4. Call from component using hook or direct call

### Modifying Session Metadata

Session metadata structure (in `sessions.json`):
```json
{
  "2026-02-15": {
    "organizer": "Club Name",
    "location": "Court Location",
    "format": "Mixed",
    "tournament_partner": "Partner Name - result",
    "place": 1,
    "notes": "Custom notes"
  }
}
```

To add fields:
1. Update `SessionGroup` model in `pipeline/models.py`
2. Update `_build_sessions` in `pipeline/analytics.py`
3. Update TypeScript interface in `ui/src/types.ts`
4. Update UI components that display/edit sessions

## Troubleshooting

### No analytics data
- Check `/api/health` - verify raw file exists
- Run `POST /api/reprocess` to recompute
- Check logs for transformer errors

### DUPR sync fails
- Verify credentials in `.env`
- Check DUPR API is accessible
- Consider using `DUPR_TOKEN` env var for hardcoded token

### Frontend build fails
- Ensure Node 20+ is installed
- Delete `node_modules` and run `npm install` again
- Check TypeScript errors with `npm run build`

## Documentation References

- `docs/DUPR_SCHEMA.md` - Complete DUPR API schema with TypeScript interfaces
- Inline docstrings in Python modules
- Component-level comments in complex React components
