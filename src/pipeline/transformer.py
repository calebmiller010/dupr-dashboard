"""
Transforms raw DUPR API JSON into ProcessedMatch models.
Includes chain-sorting to resolve true play order within sessions.
"""

import logging
from collections import defaultdict

from .models import (
    EventFormat,
    GameScore,
    MatchPhase,
    MatchSource,
    MatchType,
    MatchupContext,
    Participant,
    ProcessedMatch,
    RatingImpact,
    RatingSnapshot,
    ScoreBreakdown,
)

logger = logging.getLogger("transformer")

CHAIN_TOLERANCE = 0.0005


class MatchTransformer:
    def __init__(self, target_player_id: int, thresholds: dict | None = None):
        self.target_id = target_player_id
        self.impact_thresholds = thresholds.get("impact") if thresholds else None
        self.context_thresholds = thresholds.get("context") if thresholds else None

    def transform_all(self, raw_matches: list[dict]) -> list[ProcessedMatch]:
        """
        Transform raw DUPR matches and return them in true chronological order.

        Raw matches come in DUPR API order (newest-first). We:
        1. Reverse to get oldest-first
        2. Transform each match
        3. Group by date
        4. Chain-sort each session by linking post → pre rating values
        5. Flatten back to a single chronological list
        """
        # Reverse: API order is newest-first, we want oldest-first
        reversed_raw = list(reversed(raw_matches))

        results = []
        skipped = 0
        for raw in reversed_raw:
            try:
                if raw.get("status") == "DELETED":
                    skipped += 1
                    continue
                match = self._transform_one(raw)
                if match is not None:
                    results.append(match)
            except Exception as e:
                match_id = raw.get("matchId", "unknown")
                logger.warning(f"Failed to transform match {match_id}: {e}")
        if skipped:
            logger.info(f"Skipped {skipped} deleted matches.")

        # Group by date
        by_date: dict[str, list[ProcessedMatch]] = defaultdict(list)
        for m in results:
            by_date[m.event_date].append(m)

        # Chain-sort each session, threading prev_session_end across dates
        sorted_results: list[ProcessedMatch] = []
        prev_end: float | None = None

        for date_key in sorted(by_date.keys()):
            session = self._chain_sort_session(by_date[date_key], prev_end)
            sorted_results.extend(session)

            # Track session end for next session's chain start
            if session:
                last_target = session[-1].target
                if last_target and last_target.rating.doubles_pre is not None:
                    prev_end = last_target.rating.doubles_pre + (
                        last_target.rating.doubles_delta or 0
                    )

        return sorted_results

    def _chain_sort_session(
        self,
        matches: list[ProcessedMatch],
        prev_session_end: float | None,
    ) -> list[ProcessedMatch]:
        """
        Sort matches within a session by chaining post → pre rating values.

        DUPR's API order within a session is scrambled, but the pre/post
        rating values form a linked list. Match A's (pre + delta) == Match B's
        pre means A was played before B. We find the head and traverse.

        For pre-July 2025 data, some chains break due to DUPR's old algorithm
        recalculating ratings mid-session. In those cases we traverse as far
        as possible and append remaining matches in their original order.
        """
        if len(matches) <= 1:
            return matches

        # Build nodes with full-precision post values
        nodes: list[dict] = []
        for m in matches:
            t = m.target
            if not t or t.rating.doubles_pre is None:
                nodes.append({"match": m, "pre": None, "post": None})
                continue
            pre = t.rating.doubles_pre
            delta = t.rating.doubles_delta or 0
            nodes.append({"match": m, "pre": pre, "post": pre + delta})

        rated = [n for n in nodes if n["pre"] is not None]
        unrated = [n for n in nodes if n["pre"] is None]

        if len(rated) <= 1:
            return [n["match"] for n in nodes]

        def find_next(post_val: float, remaining: list[dict]) -> dict | None:
            best, best_diff = None, CHAIN_TOLERANCE
            for node in remaining:
                diff = abs(node["pre"] - post_val)
                if diff < best_diff:
                    best, best_diff = node, diff
            return best

        remaining = list(rated)
        head = None

        # Strategy 1: link to previous session's end rating
        if prev_session_end is not None:
            head = find_next(prev_session_end, remaining)

        # Strategy 2: find the orphan — match whose pre isn't any other match's post
        if head is None:
            all_posts = [n["post"] for n in rated]
            for node in rated:
                if all(abs(node["pre"] - p) >= CHAIN_TOLERANCE for p in all_posts):
                    head = node
                    break

        # Strategy 3: lowest pre value
        if head is None:
            head = min(rated, key=lambda n: n["pre"])

        # Traverse the chain
        sorted_nodes = [head]
        remaining.remove(head)
        current = head

        while remaining:
            nxt = find_next(current["post"], remaining)
            if nxt is None:
                # Chain broke — append remaining in their original order
                sorted_nodes.extend(remaining)
                break
            remaining.remove(nxt)
            sorted_nodes.append(nxt)
            current = nxt

        return [n["match"] for n in sorted_nodes] + [n["match"] for n in unrated]

    def _transform_one(self, raw: dict) -> ProcessedMatch | None:
        match_id = raw.get("matchId")
        if not match_id:
            return None

        teams = raw.get("teams", [])
        if len(teams) < 2:
            return None

        my_team, opp_team = self._find_teams(teams)
        if my_team is None or opp_team is None:
            return None

        is_p1 = my_team.get("player1", {}).get("id") == self.target_id
        my_impact = my_team.get("preMatchRatingAndImpact", {})
        suffix = "Player1" if is_p1 else "Player2"

        target_doubles_pre = my_impact.get(f"preMatchDoubleRating{suffix}")
        target_doubles_delta = my_impact.get(f"matchDoubleRatingImpact{suffix}", 0)
        target_singles_pre = my_impact.get(f"preMatchSingleRating{suffix}")
        target_singles_delta = my_impact.get(f"matchSingleRatingImpact{suffix}", 0)

        won = bool(my_team.get("winner"))

        games: list[GameScore] = []
        for i, key in enumerate(["game1", "game2", "game3", "game4", "game5"]):
            my_score = my_team.get(key, -1)
            opp_score = opp_team.get(key, -1)
            if my_score == -1 and opp_score == -1:
                continue
            if my_score == -1:
                my_score = 0
            if opp_score == -1:
                opp_score = 0
            games.append(GameScore(game_num=i + 1, my=my_score, opp=opp_score))

        score_fmt = raw.get("scoreFormat", {})
        score = ScoreBreakdown(
            games=games,
            won=won,
            winning_score=score_fmt.get("winningScore", 11),
            format_games=score_fmt.get("games", 1),
        )

        rating_gap = self._compute_rating_gap(my_team, opp_team)
        event_name = raw.get("league") or raw.get("eventName") or "Unknown Event"

        event_format = self._safe_enum(
            EventFormat, raw.get("eventFormat"), EventFormat.DOUBLES
        )
        match_source = self._safe_enum(
            MatchSource, raw.get("matchSource"), MatchSource.CLUB
        )
        match_type = self._safe_enum(
            MatchType, raw.get("matchType"), MatchType.SIDE_ONLY
        )

        narrative = RatingImpact.classify(
            won=won, delta=target_doubles_delta or 0, thresholds=self.impact_thresholds
        )
        matchup_context = MatchupContext.classify(
            rating_gap=rating_gap, thresholds=self.context_thresholds
        )

        participants = []
        for team in teams:
            team_serial = team.get("serial", 0)
            for player_key in ("player1", "player2"):
                p = self._extract_participant(team, player_key, team_serial)
                if p is not None:
                    participants.append(p)

        return ProcessedMatch(
            match_id=str(match_id),
            display_id=raw.get("displayIdentity"),
            event_date=raw.get("eventDate", ""),
            created=raw.get("created"),
            modified=raw.get("modified"),
            event_name=event_name,
            club_name=raw.get("clubName", "Unknown"),
            club_id=raw.get("clubId"),
            venue=raw.get("venue", ""),
            location=raw.get("location", ""),
            tournament=raw.get("tournament", ""),
            event_format=event_format,
            match_source=match_source,
            match_type=match_type,
            phase=MatchPhase.detect(event_name),
            score=score,
            narrative=narrative,
            matchup_context=matchup_context,
            target_delta=round(target_doubles_delta or 0, 6),
            rating_gap=round(rating_gap, 4),
            participants=participants,
            confirmed=raw.get("confirmed", True),
            is_initialization=raw.get("initialization", False),
            elo_calculated=raw.get("eloCalculated", True),
        )

    def _find_teams(self, teams: list[dict]) -> tuple[dict | None, dict | None]:
        my_team = opp_team = None
        for team in teams:
            ids = [team.get("player1", {}).get("id"), team.get("player2", {}).get("id")]
            if self.target_id in ids:
                my_team = team
            else:
                opp_team = team
        return my_team, opp_team

    def _compute_rating_gap(self, my_team: dict, opp_team: dict) -> float:
        my_total = self._team_total_rating(my_team)
        opp_total = self._team_total_rating(opp_team)
        if my_total is not None and opp_total is not None:
            return my_total - opp_total
        return 0.0

    def _team_total_rating(self, team: dict) -> float | None:
        impact = team.get("preMatchRatingAndImpact", {})
        ratings = []
        for suffix in ("Player1", "Player2"):
            r = impact.get(f"preMatchDoubleRating{suffix}")
            if r is not None:
                ratings.append(r)
        return sum(ratings) if ratings else None

    def _extract_participant(
        self, team: dict, player_key: str, team_serial: int
    ) -> Participant | None:
        player = team.get(player_key)
        if not player:
            return None
        player_id = player.get("id")
        if not player_id:
            return None

        impact = team.get("preMatchRatingAndImpact", {})
        suffix = "Player1" if player_key == "player1" else "Player2"
        post = player.get("postMatchRating", {})

        return Participant(
            id=player_id,
            name=player.get("fullName", "Unknown"),
            dupr_id=player.get("duprId", ""),
            team=team_serial,
            rating=RatingSnapshot(
                doubles_pre=self._r(impact.get(f"preMatchDoubleRating{suffix}")),
                doubles_delta=self._r(
                    impact.get(f"matchDoubleRatingImpact{suffix}"), 0
                ),
                singles_pre=self._r(impact.get(f"preMatchSingleRating{suffix}")),
                singles_delta=self._r(
                    impact.get(f"matchSingleRatingImpact{suffix}"), 0
                ),
                doubles_post=post.get("doubles"),
                singles_post=post.get("singles"),
            ),
            is_target=(player_id == self.target_id),
            image_url=player.get("imageUrl"),
        )

    @staticmethod
    def _r(val, default=None):
        return round(val, 6) if val is not None else default

    @staticmethod
    def _safe_enum(enum_cls, value, default):
        if value is None:
            return default
        try:
            return enum_cls(value)
        except ValueError:
            return default
