import type { MatchDetail, MatchPlayer } from "../../types";
import { fmtRating, fmtDelta, fmtDateShort } from "../../utils/format";

const IMPACT_COLORS: Record<string, string> = {
  Dominance: "#22c55e",
  "Standard Win": "#94a3b8",
  "Rough Win": "#eab308",
  "The Grinder": "#3b82f6",
  "Soft Loss": "#6b7280",
  Underperformance: "#ef4444",
};

const CONTEXT_COLORS: Record<string, string> = {
  "Big Underdog": "#a855f7",
  "Slight Underdog": "#818cf8",
  "Even Match": "#94a3b8",
  "Slight Favorite": "#fb923c",
  "Big Favorite": "#f97316",
};

// Adjust this to change how wide the colored name boxes are (% of card width)
const NAME_BOX_WIDTH = "22%";

function RatingLine({ player }: { player: MatchPlayer }) {
  return (
    <span className="text-sm font-mono whitespace-nowrap">
      <span className="text-text-muted">
        {fmtRating(player.pre_rating)} &rarr; {fmtRating(player.post_rating)}
      </span>
      <span className={`ml-2 ${player.delta >= 0 ? "text-win" : "text-loss"}`}>
        {fmtDelta(player.delta)}
      </span>
    </span>
  );
}

export function MatchCard({
  match,
  showDate,
  sessionLabel,
}: {
  match: MatchDetail;
  sessionLabel?: string;
  showDate?: boolean;
}) {
  const target = match.players.find((p) => p.is_target);
  const targetTeam = target?.team ?? 1;
  const myTeam = match.players.filter((p) => p.team === targetTeam);
  const oppTeam = match.players.filter((p) => p.team !== targetTeam);
  const myTeamWon = match.won;

  return (
    <div
      className={`rounded-xl border-l-4 bg-bg-card border border-border ${myTeamWon ? "border-l-win" : "border-l-loss"}`}
    >
      {showDate && (
        <div className="flex items-center gap-2 px-5 pt-4 text-sm text-text-muted">
          <span className="font-medium text-text-secondary">
            {fmtDateShort(match.date)}
          </span>
          <span>&middot;</span>
          <span className="truncate">{sessionLabel || match.event_name}</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center">
          {/* Left: my team ratings — flush left */}
          <div className="flex-1 space-y-3">
            {myTeam.map((p) => (
              <div key={p.name}>
                <RatingLine player={p} />
              </div>
            ))}
          </div>

          {/* My team: pre rating + name — colored box */}
          <div
            className={`shrink-0 py-3 px-4 rounded-l-lg space-y-3 ${myTeamWon ? "bg-win/5" : "bg-loss/5"}`}
            style={{ width: NAME_BOX_WIDTH }}
          >
            {myTeam.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-2"
              >
                <span
                  className={`text-base font-medium ${p.is_target ? "text-accent" : "text-text-primary"}`}
                >
                  {fmtRating(p.pre_rating)}
                </span>
                <span
                  className={`text-base font-medium ${p.is_target ? "text-accent" : "text-text-primary"}`}
                >
                  {p.name}
                </span>
              </div>
            ))}
          </div>

          {/* Score + my delta */}
          <div className="text-center px-6 shrink-0">
            {match.games.map((g) => {
              const my = targetTeam === 1 ? g.team1_score : g.team2_score;
              const opp = targetTeam === 1 ? g.team2_score : g.team1_score;
              return (
                <div
                  key={g.game_num}
                  className="text-xl font-bold leading-tight"
                >
                  <span className={my > opp ? "text-win" : "text-text-muted"}>
                    {my}
                  </span>
                  <span className="text-text-muted mx-1.5">-</span>
                  <span className={opp > my ? "text-loss" : "text-text-muted"}>
                    {opp}
                  </span>
                </div>
              );
            })}
            <p
              className={`text-base font-mono font-bold mt-1 ${match.target_delta >= 0 ? "text-win" : "text-loss"}`}
            >
              {fmtDelta(match.target_delta)}
            </p>
          </div>

          {/* Opp team: name + pre rating — colored box */}
          <div
            className={`shrink-0 py-3 px-4 rounded-r-lg space-y-3 ${!myTeamWon ? "bg-win/5" : "bg-loss/5"}`}
            style={{ width: NAME_BOX_WIDTH }}
          >
            {oppTeam.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-base font-medium text-text-primary">
                  {p.name}
                </span>
                <span className="text-base font-medium text-text-primary">
                  {fmtRating(p.pre_rating)}
                </span>
              </div>
            ))}
          </div>

          {/* Right: opp team ratings — flush right */}
          <div className="flex-1 space-y-3 text-right">
            {oppTeam.map((p) => (
              <div key={p.name}>
                <RatingLine player={p} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rating Impact + Matchup Context */}
      <div className="px-5 py-2.5 border-t border-border flex items-center gap-3">
        <span
          className="text-sm font-bold"
          style={{ color: IMPACT_COLORS[match.narrative] ?? "#94a3b8" }}
        >
          {match.narrative}
        </span>
        <span className="text-text-muted">&middot;</span>
        <span
          className="text-sm font-bold"
          style={{ color: CONTEXT_COLORS[match.matchup_context] ?? "#94a3b8" }}
        >
          {match.matchup_context}
        </span>
      </div>
    </div>
  );
}
