"""
FastAPI server. Reads precomputed analytics. Never computes on request.
"""

import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from pipeline.runner import Pipeline

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger("server")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DIST_DIR = Path(__file__).resolve().parent / "ui" / "dist"

# ─── Environment ──────────────────────────────────────────


def _load_env():
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


_load_env()

DUPR_ID = os.environ.get("DUPR_ID", "")
ADMIN_SECRET = os.environ.get("ADMIN_SECRET", "")
READ_ONLY = os.environ.get("READ_ONLY", "").lower() in ("1", "true", "yes")

app = FastAPI(title="Better DUPR")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

pipeline = Pipeline(data_dir=DATA_DIR, dupr_id=DUPR_ID, read_only=READ_ONLY)


# ─── Admin Helpers ────────────────────────────────────────


def _require_admin(request: Request):
    if not ADMIN_SECRET:
        return
    header = request.headers.get("X-Admin-Secret", "")
    if header != ADMIN_SECRET:
        raise HTTPException(401, "Invalid or missing admin secret.")


def _require_writeable():
    if READ_ONLY:
        raise HTTPException(
            503,
            "Server is in read-only mode. Make changes locally and redeploy.",
        )


# ─── Endpoints ────────────────────────────────────────────


@app.post("/api/sync")
async def sync(request: Request):
    _require_admin(request)
    _require_writeable()
    result = pipeline.sync(
        email=os.environ.get("DUPR_EMAIL"),
        password=os.environ.get("DUPR_PASSWORD"),
    )
    return result.model_dump()


@app.post("/api/reprocess")
async def reprocess(request: Request):
    _require_admin(request)
    _require_writeable()
    result = pipeline.reprocess()
    return result.model_dump()


@app.get("/api/health")
async def health():
    info = pipeline.health()
    info["admin_locked"] = bool(ADMIN_SECRET)
    info["read_only"] = READ_ONLY
    return info


@app.get("/api/analytics")
async def get_analytics():
    analytics = pipeline.get_analytics()
    if not analytics:
        raise HTTPException(404, "No analytics data. POST /api/sync first.")
    return analytics.model_dump()


@app.get("/api/sessions")
async def get_sessions():
    return pipeline.get_sessions_info()


@app.post("/api/sync/cancel")
async def cancel_sync(request: Request):
    _require_admin(request)
    _require_writeable()
    result = pipeline.cancel_sync()
    return result.model_dump()


@app.post("/api/sessions")
async def save_sessions(request: Request, body: dict):
    _require_admin(request)
    _require_writeable()
    annotations = body.get("annotations", {})
    result = pipeline.save_sessions_and_reprocess(annotations)
    return result.model_dump()


@app.get("/api/config")
async def get_config():
    return pipeline.get_config()


@app.put("/api/config")
async def save_config(request: Request, body: dict):
    _require_admin(request)
    _require_writeable()
    result = pipeline.save_config(body)
    return result.model_dump()


@app.put("/api/sessions")
async def overwrite_sessions(request: Request, body: dict):
    _require_admin(request)
    _require_writeable()
    result = pipeline.overwrite_sessions_and_reprocess(body)
    return result.model_dump()


# ─── Static Files (local dev / Docker only) ───────────────

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
