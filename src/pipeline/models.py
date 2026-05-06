"""
All Pydantic models for the pipeline.
Single file. No circular imports. Models only — no business logic.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, computed_field

# ─── Enums ───────────────────────────────────────────────


class RatingImpact(str, Enum):
    """What happened to your rating (delta-based). Exactly one per match."""

    DOMINANCE = "Dominance"
    STANDARD_WIN = "Standard Win"
    ROUGH_WIN = "Rough Win"
    THE_GRINDER = "The Grinder"
    SOFT_LOSS = "Soft Loss"
    UNDERPERFORMANCE = "Underperformance"

    @classmethod
    def classify(
        cls, won: bool, delta: float, thresholds: dict | None = None
    ) -> "RatingImpact":
        t = thresholds or {
            "dominance": 0.010,
            "empty_win": -0.005,
            "grinder": 0.005,
            "underperformance": -0.010,
        }
        if won:
            if delta > t["dominance"]:
                return cls.DOMINANCE
            elif delta < t["empty_win"]:
                return cls.ROUGH_WIN
            else:
                return cls.STANDARD_WIN
        else:
            if delta > t["grinder"]:
                return cls.THE_GRINDER
            elif delta < t["underperformance"]:
                return cls.UNDERPERFORMANCE
            else:
                return cls.SOFT_LOSS


class MatchupContext(str, Enum):
    """Who you played against (gap-based). Exactly one per match."""

    BIG_UNDERDOG = "Big Underdog"
    SLIGHT_UNDERDOG = "Slight Underdog"
    EVEN_MATCH = "Even Match"
    SLIGHT_FAVORITE = "Slight Favorite"
    BIG_FAVORITE = "Big Favorite"

    @classmethod
    def classify(
        cls, rating_gap: float, thresholds: dict | None = None
    ) -> "MatchupContext":
        t = thresholds or {
            "big_underdog": -0.30,
            "slight_underdog": -0.10,
            "slight_favorite": 0.10,
            "big_favorite": 0.30,
        }
        if rating_gap < t["big_underdog"]:
            return cls.BIG_UNDERDOG
        elif rating_gap < t["slight_underdog"]:
            return cls.SLIGHT_UNDERDOG
        elif rating_gap <= t["slight_favorite"]:
            return cls.EVEN_MATCH
        elif rating_gap <= t["big_favorite"]:
            return cls.SLIGHT_FAVORITE
        else:
            return cls.BIG_FAVORITE


# Keep Narrative as an alias for backward compatibility during transition
Narrative = RatingImpact


class MatchPhase(str, Enum):
    ROUND_ROBIN = "round_robin"
    BRACKET = "bracket"
    SEMIFINAL = "semifinal"
    FINAL = "final"
    THIRD_PLACE = "third_place"
    UNKNOWN = "unknown"

    @classmethod
    def detect(cls, event_name: str | None) -> MatchPhase:
        if not event_name:
            return cls.UNKNOWN
        lower = event_name.lower()
        if "final" in lower and "semi" not in lower:
            return cls.FINAL
        if "semifinal" in lower or "semi-final" in lower:
            return cls.SEMIFINAL
        if "3rd place" in lower or "third place" in lower:
            return cls.THIRD_PLACE
        if any(kw in lower for kw in ["bracket", "playoff", "elimination"]):
            return cls.BRACKET
        if any(kw in lower for kw in ["round robin", "pool", "group"]):
            return cls.ROUND_ROBIN
        return cls.UNKNOWN


class EventFormat(str, Enum):
    DOUBLES = "DOUBLES"
    SINGLES = "SINGLES"


class MatchSource(str, Enum):
    CLUB = "CLUB"
    TOURNAMENT = "TOURNAMENT"
    REC = "REC"


class MatchType(str, Enum):
    SIDE_ONLY = "SIDE_ONLY"
    RALLY = "RALLY"


# ─── Score Models ────────────────────────────────────────


class GameScore(BaseModel):
    game_num: int
    my: int
    opp: int

    @computed_field
    @property
    def won(self) -> bool:
        return self.my > self.opp

    @computed_field
    @property
    def margin(self) -> int:
        return self.my - self.opp

    @computed_field
    @property
    def was_close(self) -> bool:
        return abs(self.margin) <= 2 and min(self.my, self.opp) >= 9


class ScoreBreakdown(BaseModel):
    games: list[GameScore] = []
    won: bool = False
    winning_score: int = 11
    format_games: int = 1

    @computed_field
    @property
    def games_won(self) -> int:
        return sum(1 for g in self.games if g.won)

    @computed_field
    @property
    def games_lost(self) -> int:
        return sum(1 for g in self.games if not g.won)

    @computed_field
    @property
    def total_points_scored(self) -> int:
        return sum(g.my for g in self.games)

    @computed_field
    @property
    def total_points_allowed(self) -> int:
        return sum(g.opp for g in self.games)

    @computed_field
    @property
    def point_differential(self) -> int:
        return self.total_points_scored - self.total_points_allowed

    @computed_field
    @property
    def close_games(self) -> int:
        return sum(1 for g in self.games if g.was_close)

    @computed_field
    @property
    def blowout_wins(self) -> int:
        return sum(1 for g in self.games if g.won and g.margin >= 5)

    @computed_field
    @property
    def was_comeback(self) -> bool:
        if len(self.games) < 2:
            return False
        return not self.games[0].won and self.won

    @computed_field
    @property
    def was_choke(self) -> bool:
        if len(self.games) < 2:
            return False
        return self.games[0].won and not self.won


# ─── Core Models ─────────────────────────────────────────


class RatingSnapshot(BaseModel):
    doubles_pre: Optional[float] = None
    doubles_delta: float = 0.0
    singles_pre: Optional[float] = None
    singles_delta: float = 0.0
    doubles_post: Optional[float] = None
    singles_post: Optional[float] = None

    @computed_field
    @property
    def doubles_after(self) -> Optional[float]:
        # postMatchRating is DUPR's authoritative recalculated rating — prefer it
        if self.doubles_post is not None:
            return self.doubles_post
        if self.doubles_pre is not None:
            return round(self.doubles_pre + self.doubles_delta, 6)
        return None

    @computed_field
    @property
    def singles_after(self) -> Optional[float]:
        if self.singles_post is not None:
            return self.singles_post
        if self.singles_pre is not None:
            return round(self.singles_pre + self.singles_delta, 6)
        return None


class Participant(BaseModel):
    id: int
    name: str
    dupr_id: str = ""
    team: int
    rating: RatingSnapshot
    is_target: bool = False
    image_url: Optional[str] = None


class ProcessedMatch(BaseModel):
    match_id: str
    display_id: Optional[str] = None

    event_date: str
    created: Optional[str] = None
    modified: Optional[str] = None

    event_name: str = "Unknown Event"
    club_name: str = "Unknown"
    club_id: Optional[int] = None
    venue: str = ""
    location: str = ""
    tournament: str = ""

    event_format: EventFormat = EventFormat.DOUBLES
    match_source: MatchSource = MatchSource.CLUB
    match_type: MatchType = MatchType.SIDE_ONLY
    phase: MatchPhase = MatchPhase.UNKNOWN

    score: ScoreBreakdown

    narrative: RatingImpact = RatingImpact.STANDARD_WIN
    matchup_context: MatchupContext = MatchupContext.EVEN_MATCH
    target_delta: float = 0.0
    rating_gap: float = 0.0

    participants: list[Participant] = []

    confirmed: bool = True
    is_initialization: bool = False
    elo_calculated: bool = True

    @property
    def target(self) -> Optional[Participant]:
        return next((p for p in self.participants if p.is_target), None)

    @property
    def partner(self) -> Optional[Participant]:
        t = self.target
        if not t:
            return None
        return next(
            (p for p in self.participants if p.team == t.team and not p.is_target),
            None,
        )

    @property
    def opponents(self) -> list[Participant]:
        t = self.target
        if not t:
            return []
        return [p for p in self.participants if p.team != t.team]

    @computed_field
    @property
    def is_singles(self) -> bool:
        return self.event_format == EventFormat.SINGLES

    @computed_field
    @property
    def is_tournament(self) -> bool:
        return self.match_source == MatchSource.TOURNAMENT

    @computed_field
    @property
    def played_up(self) -> bool:
        return self.rating_gap < -0.1

    @computed_field
    @property
    def played_down(self) -> bool:
        return self.rating_gap > 0.1


# ─── History / Timeline Models ───────────────────────────


class HistoryPoint(BaseModel):
    date: str
    rating: float  # full precision: pre + delta (for chart line)
    display_rating: float  # 3dp: postMatchRating (what DUPR shows)
    match_id: str
    result: str
    narrative: RatingImpact
    matchup_context: MatchupContext = MatchupContext.EVEN_MATCH
    match_source: MatchSource = MatchSource.CLUB
    event_format: EventFormat = EventFormat.DOUBLES
    point_diff: int = 0
    rating_gap: float = 0.0
    match_delta: float = 0.0
    sync_gap: bool = False  # true = real DUPR adjustment between sessions
    adjustment_amount: float = 0.0  # how much DUPR shifted the baseline


class SessionGroup(BaseModel):
    date: str
    matches: list[str] = []
    wins: int = 0
    losses: int = 0
    start_rating: float = 0.0
    end_rating: float = 0.0
    source: MatchSource = MatchSource.CLUB
    event_name: str = ""
    organizer: str = ""
    location: str = ""
    format: str = ""  # e.g. "Mixed", "Fixed" (tournament format)
    tournament_partner: str = ""  # e.g. "Sarae Evans - won final"
    place: Optional[int] = None  # 1st, 2nd, 3rd, etc. None if N/A
    notes: str = ""
    adjustment: float = 0.0  # DUPR adjustment before this session (0 = none)

    @computed_field
    @property
    def net_delta(self) -> float:
        return round(self.end_rating - self.start_rating, 4)

    @computed_field
    @property
    def total_matches(self) -> int:
        return self.wins + self.losses

    @computed_field
    @property
    def win_rate(self) -> float:
        t = self.total_matches
        return round(self.wins / t, 2) if t > 0 else 0.0


# ─── Aggregated Analytics ────────────────────────────────


class PartnerStats(BaseModel):
    id: int
    name: str
    matches: int = 0
    wins: int = 0
    total_delta: float = 0.0
    last_played: str = ""

    @computed_field
    @property
    def win_rate(self) -> float:
        return round(self.wins / self.matches, 2) if self.matches > 0 else 0.0

    @computed_field
    @property
    def avg_delta(self) -> float:
        return round(self.total_delta / self.matches, 4) if self.matches > 0 else 0.0


class OpponentStats(BaseModel):
    id: int
    name: str
    matches: int = 0
    wins_against: int = 0
    losses_to: int = 0
    total_delta: float = 0.0
    avg_rating: float = 0.0
    last_played: str = ""

    @computed_field
    @property
    def avg_delta_per_match(self) -> float:
        return round(self.total_delta / self.matches, 4) if self.matches > 0 else 0.0

    @computed_field
    @property
    def is_kryptonite(self) -> bool:
        return (
            self.matches >= 2
            and self.losses_to > self.wins_against
            and self.total_delta < 0
        )

    @computed_field
    @property
    def is_feast(self) -> bool:
        return (
            self.matches >= 2
            and self.wins_against > self.losses_to
            and self.total_delta > 0
        )


class ContextSplit(BaseModel):
    label: str
    matches: int = 0
    wins: int = 0
    total_delta: float = 0.0

    @computed_field
    @property
    def win_rate(self) -> float:
        return round(self.wins / self.matches, 2) if self.matches > 0 else 0.0

    @computed_field
    @property
    def avg_delta(self) -> float:
        return round(self.total_delta / self.matches, 4) if self.matches > 0 else 0.0


class StreakInfo(BaseModel):
    type: str
    count: int
    start_date: str
    end_date: str
    rating_change: float = 0.0


class ClutchStats(BaseModel):
    comeback_wins: int = 0
    choke_losses: int = 0
    close_game_wins: int = 0
    close_game_losses: int = 0
    bracket_wins: int = 0
    bracket_losses: int = 0
    total_bracket: int = 0

    @computed_field
    @property
    def comeback_rate(self) -> float:
        total = self.comeback_wins + self.choke_losses
        return round(self.comeback_wins / total, 2) if total > 0 else 0.0

    @computed_field
    @property
    def close_game_win_rate(self) -> float:
        total = self.close_game_wins + self.close_game_losses
        return round(self.close_game_wins / total, 2) if total > 0 else 0.0

    @computed_field
    @property
    def bracket_win_rate(self) -> float:
        return (
            round(self.bracket_wins / self.total_bracket, 2)
            if self.total_bracket > 0
            else 0.0
        )


class PlayerAnalytics(BaseModel):
    player_id: int

    current_doubles: float = 0.0
    current_singles: Optional[float] = None
    career_high_doubles: float = 0.0
    career_high_date: str = ""
    career_high_singles: Optional[float] = None
    rating_30d_ago: Optional[float] = None

    total_matches: int = 0
    total_wins: int = 0
    overall_win_rate: float = 0.0

    narratives: dict[str, int] = {}
    matchup_contexts: dict[str, int] = {}
    thresholds: dict = {}
    player_name: str = ""

    history: list[HistoryPoint] = []
    sessions: list[SessionGroup] = []

    by_source: list[ContextSplit] = []
    by_format: list[ContextSplit] = []
    by_phase: list[ContextSplit] = []
    by_day_of_week: list[ContextSplit] = []
    by_rating_gap: list[ContextSplit] = []
    by_score_format: list[ContextSplit] = []

    avg_point_diff_wins: float = 0.0
    avg_point_diff_losses: float = 0.0
    blowout_win_pct: float = 0.0
    close_loss_pct: float = 0.0

    clutch: ClutchStats = ClutchStats()

    current_streak: StreakInfo | None = None
    longest_win_streak: StreakInfo | None = None
    longest_loss_streak: StreakInfo | None = None

    # Placement distribution (count of 1st, 2nd, 3rd, 4th+, N/A)
    placement_distribution: dict[str, int] = {}
    finals_record: str = ""  # e.g. "8-7" (wins-losses in finals)

    # People stats by time filter
    # Keys: "Last 5 Sessions", "Last 10 Sessions", "Past Year", "All Time"
    people: dict[str, "PeopleStats"] = {}

    rolling_win_rate_10: list[float] = []
    rolling_delta_10: list[float] = []

    # Full match details for session drilldown
    match_details: list["MatchDetail"] = []


class MatchPlayer(BaseModel):
    """Player info for a match detail card."""

    name: str
    team: int
    is_target: bool = False
    pre_rating: Optional[float] = None
    post_rating: Optional[float] = None
    delta: float = 0.0


class MatchDetailGame(BaseModel):
    """Single game score for a match detail card."""

    game_num: int
    team1_score: int
    team2_score: int


class MatchDetail(BaseModel):
    """Full match info for rendering DUPR-style match cards."""

    match_id: str
    date: str
    event_name: str = ""
    phase: str = ""
    won: bool
    narrative: str = ""
    matchup_context: str = ""
    target_delta: float = 0.0
    rating_gap: float = 0.0
    players: list[MatchPlayer] = []
    games: list[MatchDetailGame] = []
    point_differential: int = 0


class PeopleStats(BaseModel):
    top_partners: list[PartnerStats] = []
    worst_partners: list[PartnerStats] = []
    kryptonite_opponents: list[OpponentStats] = []
    feast_opponents: list[OpponentStats] = []


class MatchPreview(BaseModel):
    """Brief match info for the import wizard."""

    match_id: str
    won: bool
    partner: str = ""
    opponents: list[str] = []
    score: str = ""


class NewSessionPreview(BaseModel):
    """Preview of a new session for the import wizard."""

    date: str
    match_count: int
    wins: int
    losses: int
    suggested_organizer: str = ""
    suggested_location: str = ""
    suggested_partner: str = ""
    event_name: str = ""
    matches: list[MatchPreview] = []


class SyncResult(BaseModel):
    new_matches_fetched: int = 0
    total_matches_processed: int = 0
    current_rating: float = 0.0
    career_high: float = 0.0
    status: str = "ok"
    message: str = ""
    new_sessions: list[NewSessionPreview] = []
