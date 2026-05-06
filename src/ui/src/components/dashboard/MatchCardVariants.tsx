import type { MatchDetail, MatchPlayer } from "../../types";
import { fmtRating, fmtDelta } from "../../utils/format";
import { Badge } from "../common/Badge";

// ─── Variant A: Compact Row ─────────────────────────────
// Single horizontal row — result, players, score, delta all inline
export function MatchCardA({ match }: { match: MatchDetail }) {
  const target = match.players.find((p) => p.is_target);
  const partner = match.players.find((p) => p.team === target?.team && !p.is_target);
  const opps = match.players.filter((p) => p.team !== target?.team);

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${match.won ? "border-l-win bg-win/5" : "border-l-loss bg-loss/5"}`}>
      <span className={`text-xs font-bold w-6 ${match.won ? "text-win" : "text-loss"}`}>
        {match.won ? "W" : "L"}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-text-primary">
          <span className="text-accent">{target?.name}</span>
          {partner && <> + {partner.name}</>}
        </span>
        <span className="text-text-muted text-sm mx-2">vs</span>
        <span className="text-sm text-text-secondary">
          {opps.map((o) => o.name).join(" + ")}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold">
          {match.games.map((g) => `${g.team1_score}-${g.team2_score}`).join(", ")}
        </span>
        <span className={`font-mono text-sm font-bold ${match.target_delta >= 0 ? "text-win" : "text-loss"}`}>
          {fmtDelta(match.target_delta)}
        </span>
      </div>
    </div>
  );
}

// ─── Variant B: Two-Row Card ────────────────────────────
// Top: result + teams. Bottom: ratings + score + delta
export function MatchCardB({ match }: { match: MatchDetail }) {
  const target = match.players.find((p) => p.is_target);
  const partner = match.players.find((p) => p.team === target?.team && !p.is_target);
  const opps = match.players.filter((p) => p.team !== target?.team);
  const targetTeam = target?.team ?? 1;

  return (
    <div className={`rounded-lg border-l-4 p-3 bg-bg-card border border-border ${match.won ? "border-l-win" : "border-l-loss"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge text={match.won ? "W" : "L"} variant={match.won ? "win" : "loss"} />
          <span className="text-sm">
            <span className="text-accent font-medium">{target?.name}</span>
            {partner && <span className="text-text-secondary"> + {partner.name}</span>}
            <span className="text-text-muted mx-1.5">vs</span>
            <span className="text-text-secondary">{opps.map((o) => o.name).join(" + ")}</span>
          </span>
        </div>
        <span className={`font-mono text-sm font-bold ${match.target_delta >= 0 ? "text-win" : "text-loss"}`}>
          {fmtDelta(match.target_delta)}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span>{fmtRating(target?.pre_rating)} &rarr; {fmtRating(target?.post_rating)}</span>
        <span className="font-bold text-text-primary text-sm">
          {match.games.map((g) => {
            const my = targetTeam === 1 ? g.team1_score : g.team2_score;
            const opp = targetTeam === 1 ? g.team2_score : g.team1_score;
            return `${my}-${opp}`;
          }).join(", ")}
        </span>
        <span>{match.narrative}</span>
      </div>
    </div>
  );
}

// ─── Variant C: Centered Score ──────────────────────────
// Teams on left/right, score centered, compact
export function MatchCardC({ match }: { match: MatchDetail }) {
  const target = match.players.find((p) => p.is_target);
  const partner = match.players.find((p) => p.team === target?.team && !p.is_target);
  const opps = match.players.filter((p) => p.team !== target?.team);
  const targetTeam = target?.team ?? 1;

  return (
    <div className={`rounded-lg border-l-4 p-3 bg-bg-card border border-border ${match.won ? "border-l-win" : "border-l-loss"}`}>
      <div className="flex items-center">
        {/* My team */}
        <div className="flex-1 text-right pr-4">
          <p className="text-sm font-medium text-accent">{target?.name}</p>
          {partner && <p className="text-xs text-text-secondary">{partner.name}</p>}
          <p className="text-xs text-text-muted font-mono">
            {fmtRating(target?.pre_rating)} &rarr; {fmtRating(target?.post_rating)}
          </p>
        </div>
        {/* Score */}
        <div className="px-4 border-x border-border text-center">
          {match.games.map((g) => {
            const my = targetTeam === 1 ? g.team1_score : g.team2_score;
            const opp = targetTeam === 1 ? g.team2_score : g.team1_score;
            return (
              <div key={g.game_num} className="text-lg font-bold leading-tight">
                <span className={my > opp ? "text-win" : "text-text-muted"}>{my}</span>
                <span className="text-text-muted mx-1">-</span>
                <span className={opp > my ? "text-loss" : "text-text-muted"}>{opp}</span>
              </div>
            );
          })}
          <p className={`text-xs font-mono font-bold mt-1 ${match.target_delta >= 0 ? "text-win" : "text-loss"}`}>
            {fmtDelta(match.target_delta)}
          </p>
        </div>
        {/* Opp team */}
        <div className="flex-1 pl-4">
          {opps.map((o) => (
            <p key={o.name} className="text-sm text-text-secondary">{o.name}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Variant D: Table Row ───────────────────────────────
// Ultra-compact table-like row
function PlayerRating({ p }: { p: MatchPlayer }) {
  return (
    <span className="text-xs font-mono text-text-muted">
      {fmtRating(p.pre_rating)}
      <span className={p.delta >= 0 ? "text-win" : "text-loss"}> {fmtDelta(p.delta)}</span>
    </span>
  );
}

export function MatchCardD({ match }: { match: MatchDetail }) {
  const target = match.players.find((p) => p.is_target);
  const partner = match.players.find((p) => p.team === target?.team && !p.is_target);
  const opps = match.players.filter((p) => p.team !== target?.team);
  const targetTeam = target?.team ?? 1;
  const score = match.games.map((g) => {
    const my = targetTeam === 1 ? g.team1_score : g.team2_score;
    const opp = targetTeam === 1 ? g.team2_score : g.team1_score;
    return `${my}-${opp}`;
  }).join(", ");

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded border-l-4 text-sm ${match.won ? "border-l-win bg-win/5" : "border-l-loss bg-loss/5"}`}>
      <span className={`font-bold w-4 ${match.won ? "text-win" : "text-loss"}`}>
        {match.won ? "W" : "L"}
      </span>
      <div className="w-36 truncate">
        <span className="text-accent">{target?.name}</span>
        {partner && <span className="text-text-muted"> + {partner.name}</span>}
      </div>
      <span className="text-text-muted w-8 text-center">vs</span>
      <div className="w-36 truncate text-text-secondary">
        {opps.map((o) => o.name).join(" + ")}
      </div>
      <span className="font-bold w-12 text-center">{score}</span>
      <span className={`font-mono w-16 text-right ${match.target_delta >= 0 ? "text-win" : "text-loss"}`}>
        {fmtDelta(match.target_delta)}
      </span>
      {target && <PlayerRating p={target} />}
      <span className="text-xs text-text-muted ml-auto">{match.narrative}</span>
    </div>
  );
}

// ─── Variant E: Horizontal Split ────────────────────────
// Left: my team stacked. Center: score. Right: opp team. Bottom: meta
export function MatchCardE({ match }: { match: MatchDetail }) {
  const target = match.players.find((p) => p.is_target);
  const myTeam = match.players.filter((p) => p.team === target?.team);
  const oppTeam = match.players.filter((p) => p.team !== target?.team);
  const targetTeam = target?.team ?? 1;

  return (
    <div className={`rounded-xl border-l-4 p-3 bg-bg-card border border-border ${match.won ? "border-l-win" : "border-l-loss"}`}>
      <div className="flex items-center gap-3">
        {/* My team */}
        <div className="flex-1">
          {myTeam.map((p) => (
            <div key={p.name} className="flex items-center justify-between">
              <span className={`text-sm ${p.is_target ? "text-accent font-medium" : "text-text-primary"}`}>{p.name}</span>
              <span className="text-xs font-mono">
                <span className="text-text-muted">{fmtRating(p.pre_rating)}</span>
                <span className={`ml-1 ${p.delta >= 0 ? "text-win" : "text-loss"}`}>{fmtDelta(p.delta)}</span>
                <span className="ml-1 font-bold">{fmtRating(p.post_rating)}</span>
              </span>
            </div>
          ))}
        </div>
        {/* Score */}
        <div className="text-center px-3">
          {match.games.map((g) => {
            const my = targetTeam === 1 ? g.team1_score : g.team2_score;
            const opp = targetTeam === 1 ? g.team2_score : g.team1_score;
            return (
              <p key={g.game_num} className="text-lg font-bold">
                <span className={my > opp ? "text-win" : "text-text-muted"}>{my}</span>
                <span className="text-text-muted">-</span>
                <span className={opp > my ? "text-loss" : "text-text-muted"}>{opp}</span>
              </p>
            );
          })}
        </div>
        {/* Opp team */}
        <div className="flex-1">
          {oppTeam.map((p) => (
            <div key={p.name} className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{p.name}</span>
              <span className="text-xs font-mono">
                <span className="text-text-muted">{fmtRating(p.pre_rating)}</span>
                <span className={`ml-1 ${p.delta >= 0 ? "text-win" : "text-loss"}`}>{fmtDelta(p.delta)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs">
        <span className="text-text-muted">{match.narrative}</span>
        <span className={`font-mono font-bold ${match.target_delta >= 0 ? "text-win" : "text-loss"}`}>
          {fmtDelta(match.target_delta)}
        </span>
      </div>
    </div>
  );
}

// ─── Preview All Variants ───────────────────────────────
export function MatchCardPreview({ match }: { match: MatchDetail }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase mb-2">A: Compact Row</h3>
        <MatchCardA match={match} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase mb-2">B: Two-Row Card</h3>
        <MatchCardB match={match} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase mb-2">C: Centered Score</h3>
        <MatchCardC match={match} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase mb-2">D: Table Row</h3>
        <MatchCardD match={match} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase mb-2">E: Horizontal Split</h3>
        <MatchCardE match={match} />
      </div>
    </div>
  );
}
