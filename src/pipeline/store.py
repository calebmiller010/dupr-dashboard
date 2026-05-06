"""
File-based storage. Three files. That's the entire data layer.

  data/raw/master_history.json    — append-only log from DUPR API
  data/computed/analytics.json    — precomputed output the server reads
  data/sessions.json              — user-curated session metadata (organizer, location)
"""

import json
import logging
from pathlib import Path
from typing import Optional

from .models import PlayerAnalytics

logger = logging.getLogger("store")


class FileStore:
    def __init__(self, data_dir: Path, read_only: bool = False):
        self.data_dir = data_dir
        self.read_only = read_only
        self.raw_path = data_dir / "raw" / "master_history.json"
        self.analytics_path = data_dir / "computed" / "analytics.json"
        self.sessions_path = data_dir / "sessions.json"
        self.config_path = data_dir / "config.json"
        self.raw_path.parent.mkdir(parents=True, exist_ok=True)
        self.analytics_path.parent.mkdir(parents=True, exist_ok=True)

    def load_raw_matches(self) -> list[dict]:
        if not self.raw_path.exists():
            return []
        with open(self.raw_path) as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return (
                data.get("result", {}).get("hits", [])
                or data.get("hits", [])
                or data.get("matches", [])
                or []
            )
        return []

    def get_existing_ids(self) -> set[str]:
        matches = self.load_raw_matches()
        return {str(m.get("matchId")) for m in matches if isinstance(m, dict)}

    def append_raw_matches(self, new_matches: list[dict]) -> int:
        if not new_matches:
            return 0
        existing = self.load_raw_matches()
        existing_ids = {str(m.get("matchId")) for m in existing}
        truly_new = [
            m for m in new_matches if str(m.get("matchId")) not in existing_ids
        ]
        if not truly_new:
            return 0
        merged = truly_new + existing
        self._write_raw(merged)
        logger.info(f"Appended {len(truly_new)} new matches. Total: {len(merged)}")
        return len(truly_new)

    def remove_matches(self, match_ids: list[str]) -> int:
        """Remove matches by ID. Returns count removed."""
        existing = self.load_raw_matches()
        ids_to_remove = set(match_ids)
        filtered = [m for m in existing if str(m.get("matchId")) not in ids_to_remove]
        removed = len(existing) - len(filtered)
        if removed > 0:
            self._write_raw(filtered)
            logger.info(f"Removed {removed} matches. Total: {len(filtered)}")
        return removed

    def _write_raw(self, matches: list[dict]) -> None:
        if self.read_only:
            logger.warning("Skip raw write: store is read-only.")
            return
        with open(self.raw_path, "w") as f:
            json.dump(matches, f, indent=2)

    def save_analytics(self, analytics: PlayerAnalytics) -> None:
        if self.read_only:
            logger.warning("Skip analytics write: store is read-only.")
            return
        with open(self.analytics_path, "w") as f:
            json.dump(analytics.model_dump(), f)

    def load_analytics(self) -> Optional[PlayerAnalytics]:
        if not self.analytics_path.exists():
            return None
        try:
            with open(self.analytics_path) as f:
                return PlayerAnalytics(**json.load(f))
        except Exception as e:
            logger.error(f"Failed to load analytics: {e}")
            return None

    def resolve_player_id(self, dupr_id: str) -> int | None:
        """Resolve a public DUPR ID (e.g. '0QQOEG') to the numeric player ID from raw data."""
        for match in self.load_raw_matches():
            for team in match.get("teams", []):
                for key in ("player1", "player2"):
                    player = team.get(key)
                    if player and player.get("duprId") == dupr_id:
                        return player["id"]
        return None

    # ─── Session Metadata ─────────────────────────────────

    def load_sessions(self) -> dict[str, dict]:
        """Load session metadata. Returns {date_str: {organizer, location}}."""
        if not self.sessions_path.exists():
            return {}
        try:
            with open(self.sessions_path) as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load sessions: {e}")
            return {}

    def save_sessions(self, annotations: dict[str, dict]) -> None:
        """Merge-save session annotations. Sorted by date descending."""
        self._backup_sessions()
        existing = self.load_sessions()
        existing.update(annotations)
        sorted_sessions = dict(sorted(existing.items(), reverse=True))
        with open(self.sessions_path, "w") as f:
            json.dump(sorted_sessions, f, indent=2)

    def overwrite_sessions(self, data: dict[str, dict]) -> None:
        """Full overwrite of sessions.json with backup."""
        self._backup_sessions()
        sorted_sessions = dict(sorted(data.items(), reverse=True))
        with open(self.sessions_path, "w") as f:
            json.dump(sorted_sessions, f, indent=2)

    def _backup_sessions(self) -> None:
        """Create a timestamped backup of sessions.json if it exists."""
        if self.read_only:
            return
        if not self.sessions_path.exists():
            return
        from datetime import datetime

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = self.data_dir / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"sessions_{timestamp}.json"
        import shutil

        shutil.copy2(self.sessions_path, backup_path)
        logger.info(f"Backed up sessions.json to {backup_path}")

    def get_session_suggestions(self) -> dict[str, list[str]]:
        """Return unique organizer and location values from saved sessions."""
        sessions = self.load_sessions()
        organizers = sorted({s.get("organizer", "") for s in sessions.values()} - {""})
        locations = sorted({s.get("location", "") for s in sessions.values()} - {""})
        return {"organizers": organizers, "locations": locations}

    # ─── App Config ─────────────────────────────────────────

    DEFAULT_CONFIG = {
        "thresholds": {
            "impact": {
                "dominance": 0.010,
                "empty_win": -0.005,
                "grinder": 0.005,
                "underperformance": -0.010,
            },
            "context": {
                "big_underdog": -0.30,
                "slight_underdog": -0.10,
                "slight_favorite": 0.10,
                "big_favorite": 0.30,
            },
        }
    }

    def load_config(self) -> dict:
        if not self.config_path.exists():
            return dict(self.DEFAULT_CONFIG)
        try:
            with open(self.config_path) as f:
                cfg = json.load(f)
            # Merge with defaults so new keys are always present
            merged = dict(self.DEFAULT_CONFIG)
            if "thresholds" in cfg:
                for k in ("impact", "context"):
                    if k in cfg["thresholds"]:
                        merged["thresholds"][k].update(cfg["thresholds"][k])
            return merged
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return dict(self.DEFAULT_CONFIG)

    def save_config(self, config: dict) -> None:
        if self.read_only:
            logger.warning("Skip config write: store is read-only.")
            return
        with open(self.config_path, "w") as f:
            json.dump(config, f, indent=2)

    def stats(self) -> dict:
        raw_exists = self.raw_path.exists()
        analytics_exists = self.analytics_path.exists()
        return {
            "raw_file": str(self.raw_path),
            "raw_exists": raw_exists,
            "raw_size_kb": round(self.raw_path.stat().st_size / 1024, 1)
            if raw_exists
            else 0,
            "raw_match_count": len(self.load_raw_matches()) if raw_exists else 0,
            "analytics_file": str(self.analytics_path),
            "analytics_exists": analytics_exists,
            "analytics_size_kb": round(self.analytics_path.stat().st_size / 1024, 1)
            if analytics_exists
            else 0,
        }
