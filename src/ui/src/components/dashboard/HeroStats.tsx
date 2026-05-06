import type { PlayerAnalytics } from "../../types";
import { StatCard } from "../common/StatCard";
import { fmtRating, fmtDelta, fmtDateShort } from "../../utils/format";

export function HeroStats({ data }: { data: PlayerAnalytics }) {
  const delta30d =
    data.rating_30d_ago != null
      ? data.current_doubles - data.rating_30d_ago
      : null;

  // Last session result
  const lastSession =
    data.sessions.length > 0 ? data.sessions[data.sessions.length - 1] : null;
  const lastSessionValue = lastSession ? (
    <>
      <span className="text-win">{lastSession.wins}W</span>-
      <span className="text-loss">{lastSession.losses}L</span>{" "}
      {fmtDelta(lastSession.net_delta)}
    </>
  ) : (
    "N/A"
  );
  const lastSessionSub = lastSession
    ? `${lastSession.place ? (["", "1st", "2nd", "3rd"][lastSession.place] ?? `${lastSession.place}th`) : ""} · ${fmtDateShort(lastSession.date)}`
    : undefined;

  // Rating rank vs career high
  const gap = data.career_high_doubles - data.current_doubles;
  const atCareerHigh = gap < 0.001;
  const ratingRankValue = atCareerHigh ? "Career High!" : `-${gap.toFixed(3)}`;
  const ratingRankSub = atCareerHigh
    ? fmtRating(data.current_doubles)
    : `from ${fmtRating(data.career_high_doubles)}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-text-muted text-sm">Current Doubles Rating</p>
        <p className="text-5xl font-bold text-accent">
          {fmtRating(data.current_doubles)}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="30-Day Change"
          value={delta30d != null ? fmtDelta(delta30d) : "N/A"}
          color={
            delta30d != null ? (delta30d >= 0 ? "win" : "loss") : "default"
          }
        />
        <StatCard
          label="Current Streak"
          value={
            data.current_streak
              ? `${data.current_streak.count}${data.current_streak.type === "win" ? "W" : "L"}`
              : "0"
          }
          color={
            data.current_streak?.type === "win"
              ? "win"
              : data.current_streak?.type === "loss"
                ? "loss"
                : "default"
          }
        />
        <StatCard
          label="Last Session"
          value={lastSessionValue}
          sub={lastSessionSub}
          color={
            lastSession
              ? lastSession.net_delta >= 0
                ? "win"
                : "loss"
              : "default"
          }
        />
        <StatCard
          label="vs Career High"
          value={ratingRankValue}
          sub={ratingRankSub}
          color={atCareerHigh ? "accent" : "default"}
        />
      </div>
    </div>
  );
}
