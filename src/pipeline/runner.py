"""
Pipeline orchestrator. Fetch → store → transform → analyze → cache.

Two-phase sync:
  1. sync() — fetches new matches, returns session previews for the import wizard
  2. save_sessions_and_reprocess() — saves user annotations, then recomputes analytics
"""

import logging
import re
from collections import defaultdict
from pathlib import Path
from typing import Optional

from .analytics import AnalyticsEngine
from .dupr_client import DUPRClient
from .models import (
    MatchPreview,
    NewSessionPreview,
    PlayerAnalytics,
    SyncResult,
)
from .store import FileStore
from .transformer import MatchTransformer

logger = logging.getLogger("pipeline")


class Pipeline:
    def __init__(self, data_dir: str | Path, dupr_id: str, read_only: bool = False):
        self.dupr_id = dupr_id
        self.store = FileStore(Path(data_dir), read_only=read_only)
        self._player_id: int | None = None
        self._pending_match_ids: list[str] = []

    @property
    def player_id(self) -> int | None:
        if self._player_id is None:
            self._player_id = self.store.resolve_player_id(self.dupr_id)
        return self._player_id

    def sync(
        self, email: Optional[str] = None, password: Optional[str] = None
    ) -> SyncResult:
        """Phase 1: Fetch new matches from DUPR, return session previews for the wizard."""
        new_raw: list[dict] = []
        if email and password:
            new_raw = self._fetch_raw(email, password)

        if not new_raw:
            # No new matches — still reprocess in case sessions.json changed
            return self._recompute(new_fetched=0)

        # Store the new matches (will be rolled back if user skips)
        new_count = self.store.append_raw_matches(new_raw)
        if new_count == 0:
            return self._recompute(new_fetched=0)

        # Track new match IDs so we can undo on skip
        self._pending_match_ids = [str(m.get("matchId")) for m in new_raw]

        # Build previews for the import wizard
        transformer = MatchTransformer(
            target_player_id=self.player_id,
            thresholds=self.store.load_config().get("thresholds"),
        )
        all_raw = self.store.load_raw_matches()
        all_processed = transformer.transform_all(all_raw)

        # Group by date
        sessions = self._group_by_session(all_processed)
        # Only show previews for sessions that contain newly fetched matches
        new_ids = set(self._pending_match_ids)
        new_sessions = [
            s for s in sessions if any(m.match_id in new_ids for m in s.matches)
        ]

        previews = [self._session_to_preview(s) for s in new_sessions]

        return SyncResult(
            new_matches_fetched=new_count,
            total_matches_processed=len(all_processed),
            current_rating=all_processed[0].post_match_rating if all_processed else 0.0,
            career_high=max(
                (m.post_match_rating for m in all_processed), default=0.0
            ),
            status="preview",
            message=f"Fetched {new_count} new matches. Review and save sessions.",
            new_sessions=previews,
        )

    def cancel_sync(self) -> SyncResult:
        """Roll back pending matches from the last sync."""
        if not self._pending_match_ids:
            return self._recompute(new_fetched=0)
        removed = self.store.remove_matches(self._pending_match_ids)
        self._pending_match_ids = []
        return self._recompute(new_fetched=-removed)

    def save_sessions_and_reprocess(
        self, annotations: dict[str, dict]
    ) -> SyncResult:
        """Phase 2: Save session metadata and recompute analytics."""
        self.store.save_sessions(annotations)
        self._pending_match_ids = []
        return self._recompute(new_fetched=0)

    def overwrite_sessions_and_reprocess(self, data: dict) -> SyncResult:
        """Full overwrite of sessions.json and recompute."""
        self.store.overwrite_sessions(data)
        self._pending_match_ids = []
        return self._recompute(new_fetched=0)

    def reprocess(self) -> SyncResult:
        """Recompute analytics from existing raw data."""
        return self._recompute(new_fetched=0)

    def save_config(self, config: dict) -> SyncResult:
        """Save config and recompute analytics."""
        self.store.save_config(config)
        return self._recompute(new_fetched=0)

    def get_analytics(self) -> Optional[PlayerAnalytics]:
        return self.store.load_analytics()

    def get_config(self) -> dict:
        return self.store.load_config()

    def get_sessions_info(self) -> dict:
        return {
            "sessions": self.store.load_sessions(),
            "suggestions": self.store.get_session_suggestions(),
        }

    def health(self) -> dict:
        stats = self.store.stats()
        stats["dupr_id"] = self.dupr_id
        stats["player_id"] = self.player_id
        return stats

    # ─── Internal ───────────────────────────────────────────

    def _fetch_raw(self, email: str, password: str) -> list[dict]:
        client = DUPRClient()
        token = client.login(email, password)
        player_id = self.player_id
        if player_id is None:
            logger.error("Cannot fetch: player_id not resolved")
            return []
        return client.fetch_all_matches(player_id)

    def _recompute(self, new_fetched: int) -> SyncResult:
        raw = self.store.load_raw_matches()
        config = self.store.load_config()
        transformer = MatchTransformer(target_player_id=self.player_id, thresholds=config.get("thresholds"))
        processed = transformer.transform_all(raw)
        engine = AnalyticsEngine(self.player_id)
        analytics = engine.compute(processed)
        self.store.save_analytics(analytics)
        return SyncResult(
            new_matches_fetched=new_fetched,
            total_matches_processed=len(processed),
            current_rating=analytics.current_doubles,
            career_high=analytics.career_high_doubles,
            status="success",
            message="Analytics recomputed.",
            new_sessions=[],
        )

    def _group_by_session(self, matches):
        """Group processed matches into session objects by date."""
        from .models import Session

        by_date = defaultdict(list)
        for m in matches:
            by_date[m.date].append(m)
        sessions = []
        for date in sorted(by_date.keys(), reverse=True):
            day_matches = by_date[date]
            sessions.append(
                Session(
                    date=date,
                    matches=day_matches,
                    wins=sum(1 for m in day_matches if m.won),
                    losses=sum(1 for m in day_matches if not m.won),
                    start_rating=day_matches[-1].pre_match_rating,
                    end_rating=day_matches[0].post_match_rating,
                    net_delta=sum(m.match_delta for m in day_matches),
                    total_matches=len(day_matches),
                    win_rate=sum(1 for m in day_matches if m.won)
                    / len(day_matches),
                )
            )
        return sessions

    def _session_to_preview(self, session) -> NewSessionPreview:
        """Convert a Session to a NewSessionPreview for the wizard."""
        matches_preview = [
            MatchPreview(
                match_id=m.match_id,
                won=m.won,
                partner=m.partner_name or "",
                opponents=[m.opponent1_name or "", m.opponent2_name or ""],
                score=m.score_display or "",
            )
            for m in session.matches
        ]

        # Suggest organizer/location from existing sessions on same date
        existing = self.store.load_sessions()
        date_str = session.date
        sugg = existing.get(date_str, {})

        # Extract event name from first match
        event_name = session.matches[0].event_name if session.matches else ""

        # Try to extract partner name for tournament sessions
        suggested_partner = ""
        if event_name and any(
            keyword in event_name.lower()
            for keyword in ("tournament", "championship", "open")
        ):
            partners = [m.partner_name for m in session.matches if m.partner_name]
            if partners:
                from collections import Counter

                suggested_partner = Counter(partners).most_common(1)[0][0]

        return NewSessionPreview(
            date=date_str,
            match_count=len(session.matches),
            wins=session.wins,
            losses=session.losses,
            suggested_organizer=sugg.get("organizer", ""),
            suggested_location=sugg.get("location", ""),
            suggested_partner=suggested_partner,
            event_name=event_name,
            matches=matches_preview,
        )
