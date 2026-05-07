"""
Computes the full PlayerAnalytics payload from processed matches.
Single pass through the match list. No database queries.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta

from .models import (
    ClutchStats,
    ContextSplit,
    HistoryPoint,
    MatchDetail,
    MatchDetailGame,
    MatchPhase,
    MatchPlayer,
    OpponentStats,
    PartnerStats,
    PlayerAnalytics,
    ProcessedMatch,
    SessionGroup,
    StreakInfo,
)

logger = logging.getLogger("analytics")


class AnalyticsEngine:
    def __init__(self, target_player_id: int):
        self.target_id = target_player_id

    def compute(
        self,
        matches: list[ProcessedMatch],
        session_metadata: dict[str, dict] | None = None,
        thresholds: dict | None = None,
    ) -> PlayerAnalytics:
        thresholds = thresholds or {}
        if not matches:
            return PlayerAnalytics(
                player_id=self.target_id,
                thresholds=thresholds,
            )
        session_metadata = session_metadata or {}

        history: list[HistoryPoint] = []
        partner_map: dict[int, PartnerStats] = {}
        opponent_map: dict[int, OpponentStats] = {}
        narrative_counts: dict[str, int] = defaultdict(int)
        context_counts: dict[str, int] = defaultdict(int)

        source_splits: dict[str, ContextSplit] = {}
        format_splits: dict[str, ContextSplit] = {}
        phase_splits: dict[str, ContextSplit] = {}
        dow_splits: dict[str, ContextSplit] = {}
        gap_splits: dict[str, ContextSplit] = {}
        score_fmt_splits: dict[str, ContextSplit] = {}

        point_diffs_wins: list[int] = []
        point_diffs_losses: list[int] = []
        blowout_wins = 0
        close_losses = 0
        total_wins = 0
        total_losses = 0

        clutch = ClutchStats()
        session_map: dict[str, list[ProcessedMatch]] = defaultdict(list)
        all_match_details: list[MatchDetail] = []

        results_window: list[bool] = []
        delta_window: list[float] = []
        rolling_wr: list[float] = []
        rolling_delta: list[float] = []

        # Track previous match's post rating for cross-session adjustment detection.
        # After chain-sorting, within-session links are resolved, so any gap
        # at a session boundary is a real DUPR recalculation.
        prev_post: float | None = None
        prev_date: str | None = None

        for match in matches:
            target = match.target
            if not target:
                continue

            won = match.score.won
            if won:
                total_wins += 1
            else:
                total_losses += 1

            narrative_counts[match.narrative.value] += 1
            context_counts[match.matchup_context.value] += 1

            pre = target.rating.doubles_pre
            delta = target.rating.doubles_delta or 0
            post_precise = (pre + delta) if pre is not None else None
            post_display = target.rating.doubles_post  # 3dp from API

            # Detect real cross-session adjustments
            sync_gap = False
            adjustment = 0.0
            if (
                prev_post is not None
                and pre is not None
                and prev_date != match.event_date
            ):
                diff = pre - prev_post
                if abs(diff) > 0.001:
                    sync_gap = True
                    adjustment = round(diff, 4)

            display_val = (
                round(post_display, 3)
                if post_display is not None
                else (round(post_precise, 3) if post_precise is not None else 0.0)
            )
            precise_val = (
                round(post_precise, 6) if post_precise is not None else display_val
            )

            history.append(
                HistoryPoint(
                    date=match.event_date,
                    rating=precise_val,
                    display_rating=display_val,
                    match_id=match.match_id,
                    result="Win" if won else "Loss",
                    narrative=match.narrative,
                    matchup_context=match.matchup_context,
                    match_source=match.match_source,
                    event_format=match.event_format,
                    point_diff=match.score.point_differential,
                    rating_gap=match.rating_gap,
                    match_delta=round(match.target_delta, 4),
                    sync_gap=sync_gap,
                    adjustment_amount=adjustment,
                )
            )

            if post_precise is not None:
                prev_post = post_precise
            elif pre is not None:
                prev_post = pre
            prev_date = match.event_date

            session_map[match.event_date].append(match)

            # Build match detail for session drilldown
            all_match_details.append(self._build_match_detail(match))

            partner = match.partner
            if partner:
                if partner.id not in partner_map:
                    partner_map[partner.id] = PartnerStats(
                        id=partner.id, name=partner.name
                    )
                ps = partner_map[partner.id]
                ps.matches += 1
                ps.total_delta += match.target_delta
                ps.last_played = match.event_date
                if won:
                    ps.wins += 1

            for opp in match.opponents:
                if opp.id not in opponent_map:
                    opponent_map[opp.id] = OpponentStats(id=opp.id, name=opp.name)
                os_ = opponent_map[opp.id]
                os_.matches += 1
                os_.total_delta += match.target_delta
                os_.last_played = match.event_date
                if opp.rating.doubles_pre:
                    os_.avg_rating = (
                        os_.avg_rating * (os_.matches - 1) + opp.rating.doubles_pre
                    ) / os_.matches
                if won:
                    os_.wins_against += 1
                else:
                    os_.losses_to += 1

            self._accum(
                source_splits, match.match_source.value, won, match.target_delta
            )
            self._accum(
                format_splits, match.event_format.value, won, match.target_delta
            )
            self._accum(phase_splits, match.phase.value, won, match.target_delta)
            self._accum(
                score_fmt_splits,
                f"Best of {match.score.format_games} to {match.score.winning_score}",
                won,
                match.target_delta,
            )

            try:
                dt = datetime.strptime(match.event_date, "%Y-%m-%d")
                self._accum(dow_splits, dt.strftime("%A"), won, match.target_delta)
            except ValueError:
                pass

            gap = match.rating_gap
            if gap < -0.15:
                bucket = "Playing Up (0.15+)"
            elif gap < -0.05:
                bucket = "Slight Underdog"
            elif gap <= 0.05:
                bucket = "Even Match"
            elif gap <= 0.15:
                bucket = "Slight Favorite"
            else:
                bucket = "Playing Down (0.15+)"
            self._accum(gap_splits, bucket, won, match.target_delta)

            pd = match.score.point_differential
            if won:
                point_diffs_wins.append(pd)
                blowout_wins += match.score.blowout_wins
            else:
                point_diffs_losses.append(pd)
                if abs(pd) <= 4:
                    close_losses += 1

            if match.score.was_comeback:
                clutch.comeback_wins += 1
            if match.score.was_choke:
                clutch.choke_losses += 1
            for game in match.score.games:
                if game.was_close:
                    if game.won:
                        clutch.close_game_wins += 1
                    else:
                        clutch.close_game_losses += 1
            if match.phase in (
                MatchPhase.BRACKET,
                MatchPhase.SEMIFINAL,
                MatchPhase.FINAL,
                MatchPhase.THIRD_PLACE,
            ):
                clutch.total_bracket += 1
                if won:
                    clutch.bracket_wins += 1
                else:
                    clutch.bracket_losses += 1

            results_window.append(won)
            delta_window.append(match.target_delta)
            window_size = min(10, len(results_window))
            rolling_wr.append(
                round(sum(results_window[-window_size:]) / window_size, 2)
            )
            rolling_delta.append(
                round(sum(delta_window[-window_size:]) / window_size, 4)
            )

        current_streak, longest_win, longest_loss = self._compute_streaks(matches)

        sessions = self._build_sessions(session_map, session_metadata)

        # With chain-sorting, the last history point IS the last match played.
        # Use display_rating (postMatchRating) for current — it's what DUPR shows.
        current_d = history[-1].display_rating if history else 0.0
        career_high_h = (
            max(history, key=lambda h: h.display_rating) if history else None
        )
        career_high_d = career_high_h.display_rating if career_high_h else 0.0
        career_high_date = career_high_h.date if career_high_h else ""

        rating_30d = None
        if history:
            try:
                cutoff = datetime.now() - timedelta(days=30)
                last_match_date = datetime.strptime(history[-1].date, "%Y-%m-%d")
                # Only show a 30-day comparison if they've actually played
                # within the last 30 days. Otherwise the metric compares
                # two different values from the same old match.
                if last_match_date >= cutoff:
                    for h in reversed(history):
                        if datetime.strptime(h.date, "%Y-%m-%d") <= cutoff:
                            rating_30d = h.rating
                            break
            except ValueError:
                pass

        # People stats for multiple time windows
        from .models import PeopleStats

        sorted_dates = sorted(session_map.keys())
        people: dict[str, PeopleStats] = {}

        # Define time filters: (label, date_set)
        time_filters: list[tuple[str, set[str]]] = []

        # Session-based filters
        for n in (5, 10):
            if len(sorted_dates) >= n:
                label = f"Last {n} Sessions"
                time_filters.append((label, set(sorted_dates[-n:])))

        # Date-based: past year
        if history:
            try:
                latest = datetime.strptime(history[-1].date, "%Y-%m-%d")
                year_cutoff = (latest - timedelta(days=365)).strftime("%Y-%m-%d")
                year_dates = {d for d in sorted_dates if d >= year_cutoff}
                if year_dates and len(year_dates) < len(sorted_dates):
                    time_filters.append(("Past Year", year_dates))
            except ValueError:
                pass

        # All time (always last)
        time_filters.append(("All Time", set(sorted_dates)))

        for label, date_set in time_filters:
            filtered = [m for m in matches if m.event_date in date_set]
            p_map, o_map = self._build_people_maps(filtered)
            min_p = 1 if label != "All Time" else max(2, len(matches) // 50)
            top, worst, kryp, feast_list = self._rank_people(p_map, o_map, min_p)
            people[label] = PeopleStats(
                top_partners=top,
                worst_partners=worst,
                kryptonite_opponents=kryp,
                feast_opponents=feast_list,
            )

        # Placement distribution and finals record
        placement_dist: dict[str, int] = defaultdict(int)
        finals_wins = 0
        finals_losses = 0
        for s in sessions:
            if s.place == 1:
                placement_dist["1st"] += 1
                finals_wins += 1
            elif s.place == 2:
                placement_dist["2nd"] += 1
                finals_losses += 1
            elif s.place == 3:
                placement_dist["3rd"] += 1
            else:
                placement_dist["Other"] = placement_dist.get("Other", 0) + 1
        finals_record = (
            f"{finals_wins}-{finals_losses}"
            if (finals_wins + finals_losses) > 0
            else ""
        )

        total = len(matches)

        # Extract player name from the most recent match
        player_name = ""
        for match in matches:
            target = match.target
            if target and target.name:
                player_name = target.name
                break

        return PlayerAnalytics(
            player_id=self.target_id,
            player_name=player_name,
            current_doubles=round(current_d, 3),
            career_high_doubles=round(career_high_d, 3),
            career_high_date=career_high_date,
            rating_30d_ago=rating_30d,
            total_matches=total,
            total_wins=total_wins,
            overall_win_rate=round(total_wins / total, 3) if total > 0 else 0,
            narratives=dict(narrative_counts),
            matchup_contexts=dict(context_counts),
            thresholds=thresholds,
            history=history,
            sessions=sessions,
            by_source=list(source_splits.values()),
            by_format=list(format_splits.values()),
            by_phase=list(phase_splits.values()),
            by_day_of_week=self._order_dow(dow_splits),
            by_rating_gap=list(gap_splits.values()),
            by_score_format=list(score_fmt_splits.values()),
            avg_point_diff_wins=round(sum(point_diffs_wins) / len(point_diffs_wins), 1)
            if point_diffs_wins
            else 0,
            avg_point_diff_losses=round(
                sum(point_diffs_losses) / len(point_diffs_losses), 1
            )
            if point_diffs_losses
            else 0,
            blowout_win_pct=round(blowout_wins / total_wins, 2)
            if total_wins > 0
            else 0,
            close_loss_pct=round(close_losses / total_losses, 2)
            if total_losses > 0
            else 0,
            clutch=clutch,
            current_streak=current_streak,
            longest_win_streak=longest_win,
            longest_loss_streak=longest_loss,
            placement_distribution=dict(placement_dist),
            finals_record=finals_record,
            people=people,
            rolling_win_rate_10=rolling_wr,
            rolling_delta_10=rolling_delta,
            match_details=all_match_details,
        )

    @staticmethod
    def _build_match_detail(match: ProcessedMatch) -> MatchDetail:
        players = []
        for p in match.participants:
            players.append(
                MatchPlayer(
                    name=p.name,
                    team=p.team,
                    is_target=p.is_target,
                    pre_rating=round(p.rating.doubles_pre, 3)
                    if p.rating.doubles_pre is not None
                    else None,
                    post_rating=round(p.rating.doubles_after, 3)
                    if p.rating.doubles_after is not None
                    else None,
                    delta=round(p.rating.doubles_delta, 3)
                    if p.rating.doubles_delta
                    else 0.0,
                )
            )

        # Build game scores with team1/team2 perspective (serial 1 vs serial 2)
        # Find which serial is the target's team
        target = match.target
        target_serial = target.team if target else 1
        games = []
        for g in match.score.games:
            if target_serial == 1:
                games.append(
                    MatchDetailGame(
                        game_num=g.game_num, team1_score=g.my, team2_score=g.opp
                    )
                )
            else:
                games.append(
                    MatchDetailGame(
                        game_num=g.game_num, team1_score=g.opp, team2_score=g.my
                    )
                )

        return MatchDetail(
            match_id=match.match_id,
            date=match.event_date,
            event_name=match.event_name,
            phase=match.phase.value,
            won=match.score.won,
            narrative=match.narrative.value,
            matchup_context=match.matchup_context.value,
            target_delta=round(match.target_delta, 4),
            rating_gap=round(match.rating_gap, 4),
            players=players,
            games=games,
            point_differential=match.score.point_differential,
        )

    @staticmethod
    def _build_people_maps(
        matches: list[ProcessedMatch],
    ) -> tuple[dict[int, PartnerStats], dict[int, OpponentStats]]:
        partner_map: dict[int, PartnerStats] = {}
        opponent_map: dict[int, OpponentStats] = {}

        for match in matches:
            target = match.target
            if not target:
                continue
            won = match.score.won

            partner = match.partner
            if partner:
                if partner.id not in partner_map:
                    partner_map[partner.id] = PartnerStats(
                        id=partner.id, name=partner.name
                    )
                ps = partner_map[partner.id]
                ps.matches += 1
                ps.total_delta += match.target_delta
                ps.last_played = match.event_date
                if won:
                    ps.wins += 1

            for opp in match.opponents:
                if opp.id not in opponent_map:
                    opponent_map[opp.id] = OpponentStats(id=opp.id, name=opp.name)
                os_ = opponent_map[opp.id]
                os_.matches += 1
                os_.total_delta += match.target_delta
                os_.last_played = match.event_date
                if opp.rating.doubles_pre:
                    os_.avg_rating = (
                        os_.avg_rating * (os_.matches - 1) + opp.rating.doubles_pre
                    ) / os_.matches
                if won:
                    os_.wins_against += 1
                else:
                    os_.losses_to += 1

        return partner_map, opponent_map

    @staticmethod
    def _rank_people(
        partner_map: dict[int, PartnerStats],
        opponent_map: dict[int, OpponentStats],
        min_matches: int,
    ) -> tuple[
        list[PartnerStats], list[PartnerStats], list[OpponentStats], list[OpponentStats]
    ]:
        # Sort by total_delta (total impact) — weights volume naturally.
        # Return all qualifying entries; frontend handles display limits.
        top_partners = sorted(
            [
                p
                for p in partner_map.values()
                if p.matches >= min_matches and p.total_delta >= 0
            ],
            key=lambda p: p.total_delta,
            reverse=True,
        )
        worst_partners = sorted(
            [
                p
                for p in partner_map.values()
                if p.matches >= min_matches and p.avg_delta < 0
            ],
            key=lambda p: p.total_delta,
        )
        kryptonite = sorted(
            [o for o in opponent_map.values() if o.is_kryptonite],
            key=lambda o: o.total_delta,
        )
        feast = sorted(
            [o for o in opponent_map.values() if o.is_feast],
            key=lambda o: o.total_delta,
            reverse=True,
        )
        return top_partners, worst_partners, kryptonite, feast

    @staticmethod
    def _accum(splits: dict[str, ContextSplit], key: str, won: bool, delta: float):
        if key not in splits:
            splits[key] = ContextSplit(label=key)
        s = splits[key]
        s.matches += 1
        s.total_delta += delta
        if won:
            s.wins += 1

    @staticmethod
    def _order_dow(dow_splits: dict[str, ContextSplit]) -> list[ContextSplit]:
        order = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        return [dow_splits[d] for d in order if d in dow_splits]

    @staticmethod
    def _compute_streaks(matches: list[ProcessedMatch]):
        if not matches:
            return None, None, None
        streaks = []
        cur_type = None
        cur_count = 0
        cur_start = ""
        for m in matches:
            result = "win" if m.score.won else "loss"
            if result == cur_type:
                cur_count += 1
            else:
                if cur_type and cur_count > 0:
                    streaks.append(
                        StreakInfo(
                            type=cur_type,
                            count=cur_count,
                            start_date=cur_start,
                            end_date=m.event_date,
                        )
                    )
                cur_type = result
                cur_count = 1
                cur_start = m.event_date

        current = (
            StreakInfo(
                type=cur_type,
                count=cur_count,
                start_date=cur_start,
                end_date=matches[-1].event_date,
            )
            if cur_type
            else None
        )

        all_streaks = streaks + ([current] if current else [])
        win_streaks = [s for s in all_streaks if s.type == "win"]
        loss_streaks = [s for s in all_streaks if s.type == "loss"]
        longest_win = max(win_streaks, key=lambda s: s.count) if win_streaks else None
        longest_loss = (
            max(loss_streaks, key=lambda s: s.count) if loss_streaks else None
        )

        return current, longest_win, longest_loss

    @staticmethod
    def _build_sessions(
        session_map: dict[str, list[ProcessedMatch]],
        session_metadata: dict[str, dict],
    ) -> list[SessionGroup]:
        sessions = []
        prev_end: float | None = None

        for date_str, date_matches in sorted(session_map.items()):
            wins = sum(1 for m in date_matches if m.score.won)

            # Collect pre/post ratings in chain-sorted order
            pre_list: list[float] = []
            ratings: list[float] = []
            for m in date_matches:
                t = m.target
                if t:
                    if t.rating.doubles_pre is not None:
                        pre_list.append(t.rating.doubles_pre)
                        ratings.append(t.rating.doubles_pre)
                    if t.rating.doubles_after is not None:
                        ratings.append(t.rating.doubles_after)

            # start = first chain-sorted match's pre, end = last match's post
            chain_start = ratings[0] if ratings else 0.0
            end = ratings[-1] if ratings else 0.0

            # Detect cross-session DUPR adjustment.
            # The chain-sort picks the best head, but for broken chains (pre-July
            # 2025) it may pick a match that falsely links to prev_end while the
            # real first match has a much lower pre. Detect this by finding orphan
            # pre values — pre values that no other match's post links to within
            # the session. If an orphan pre is lower than chain_start, it's the
            # real start from a broken chain.
            # First session = calibration, start = end
            start = end if prev_end is None else chain_start
            if len(pre_list) > 1 and prev_end is not None:
                TOLERANCE = 0.0005
                all_posts = []
                for m in date_matches:
                    t = m.target
                    if t and t.rating.doubles_pre is not None:
                        all_posts.append(
                            t.rating.doubles_pre + (t.rating.doubles_delta or 0)
                        )
                orphan_pres = [
                    p
                    for p in pre_list
                    if all(abs(p - post) >= TOLERANCE for post in all_posts)
                    and abs(p - chain_start) >= TOLERANCE
                ]
                if orphan_pres:
                    min_orphan = min(orphan_pres)
                    if min_orphan < chain_start:
                        start = min_orphan

            adjustment = 0.0
            if prev_end is not None and pre_list:
                diff = round(start - prev_end, 4)
                if abs(diff) > 0.001:
                    adjustment = diff

            meta = session_metadata.get(date_str, {})
            sessions.append(
                SessionGroup(
                    date=date_str,
                    matches=[m.match_id for m in date_matches],
                    wins=wins,
                    losses=len(date_matches) - wins,
                    start_rating=start,
                    end_rating=end,
                    source=date_matches[0].match_source,
                    event_name=date_matches[0].event_name,
                    organizer=meta.get("organizer", ""),
                    location=meta.get("location", ""),
                    format=meta.get("format", ""),
                    tournament_partner=meta.get("tournament_partner", ""),
                    place=meta.get("place"),
                    notes=meta.get("notes", ""),
                    adjustment=adjustment,
                )
            )
            prev_end = end

        return sessions
