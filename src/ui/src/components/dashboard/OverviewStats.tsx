import { ResponsiveContainer, AreaChart, Area, Tooltip, YAxis } from "recharts";
import type { PlayerAnalytics, MatchDetail } from "../../types";
import {
  fmtRating,
  fmtDelta,
  fmtDate,
  fmtDateShort,
  fmtPct,
} from "../../utils/format";

const PLACE_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

function computePoints(matches: MatchDetail[]) {
  let ptsFor = 0;
  let ptsAgainst = 0;
  for (const m of matches) {
    const targetTeam = m.players.find((p) => p.is_target)?.team;
    for (const g of m.games) {
      if (targetTeam === 1) {
        ptsFor += g.team1_score;
        ptsAgainst += g.team2_score;
      } else {
        ptsFor += g.team2_score;
        ptsAgainst += g.team1_score;
      }
    }
  }
  const total = ptsFor + ptsAgainst;
  const pct = total > 0 ? ptsFor / total : 0;
  return { ptsFor, ptsAgainst, pct };
}

function TrendArrow({ up }: { up: boolean }) {
  return (
    <span className={`text-xs ${up ? "text-win" : "text-loss"}`}>
      {up ? "\u25B2" : "\u25BC"}
    </span>
  );
}

function TrendComparison({
  label,
  current,
  previous,
  format = "number",
}: {
  label: string;
  current: number;
  previous: number;
  format?: "number" | "delta" | "pct" | "wl";
}) {
  const diff = current - previous;
  const improved = diff > 0;
  const fmt = (v: number) => {
    if (format === "delta") return fmtDelta(v);
    if (format === "pct") return fmtPct(v);
    return `${v}`;
  };
  return (
    <div className="bg-bg-primary rounded-lg p-3">
      <p className="text-text-muted text-xs">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold text-text-primary">
          {fmt(current)}
        </span>
        {diff !== 0 && (
          <span
            className={`text-xs font-mono ${improved ? "text-win" : "text-loss"}`}
          >
            <TrendArrow up={improved} />{" "}
            {format === "delta"
              ? fmtDelta(diff)
              : format === "pct"
                ? `${Math.abs(Math.round(current * 100) - Math.round(previous * 100))}%`
                : Math.abs(diff)}
          </span>
        )}
      </div>
      <p className="text-text-muted text-xs mt-0.5">prev: {fmt(previous)}</p>
    </div>
  );
}

// function PlacementList({
//   sessions,
//   label,
// }: {
//   sessions: SessionGroup[];
//   label: string;
// }) {
//   const placements = sessions.map((s) => s.place);
//   return (
//     <div className="bg-bg-primary rounded-lg p-3">
//       <p className="text-text-muted text-xs">{label}</p>
//       <div className="flex items-center gap-1.5 mt-1">
//         {placements.map((p, i) => {
//           const placeLabel = p != null ? (PLACE_LABELS[p] ?? `${p}th`) : "N/A";
//           return (
//             <span
//               key={i}
//               className={`text-xs font-bold px-1.5 py-0.5 rounded ${
//                 p === 1
//                   ? "bg-win/20 text-win"
//                   : p === 2
//                     ? "bg-blue-500/20 text-blue-400"
//                     : p === 3
//                       ? "bg-yellow-500/20 text-yellow-400"
//                       : "bg-bg-card text-text-muted"
//               }`}
//             >
//               {placeLabel}
//             </span>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

export function RecentTrend({ data }: { data: PlayerAnalytics }) {
  const sessions = data.sessions;
  if (sessions.length < 2) return null;

  const last5 = sessions.slice(-5);
  const prev5 = sessions.slice(-10, -5);

  const last5Dates = new Set(last5.map((s) => s.date));
  const prev5Dates = new Set(prev5.map((s) => s.date));
  const last5Matches = data.match_details.filter((m) => last5Dates.has(m.date));
  const prev5Matches = data.match_details.filter((m) => prev5Dates.has(m.date));

  const last5Wins = last5.reduce((s, x) => s + x.wins, 0);
  const last5Losses = last5.reduce((s, x) => s + x.losses, 0);
  const last5Delta = last5.reduce((s, x) => s + x.net_delta, 0);

  const prev5Wins = prev5.reduce((s, x) => s + x.wins, 0);
  const prev5Losses = prev5.reduce((s, x) => s + x.losses, 0);
  const prev5Delta = prev5.reduce((s, x) => s + x.net_delta, 0);

  const last5WinRate =
    last5Wins + last5Losses > 0 ? last5Wins / (last5Wins + last5Losses) : 0;
  const prev5WinRate =
    prev5Wins + prev5Losses > 0 ? prev5Wins / (prev5Wins + prev5Losses) : 0;

  const last5Pts = computePoints(last5Matches);
  const prev5Pts = computePoints(prev5Matches);

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        Last 5 Sessions vs Previous 5
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TrendComparison
          label="Win Rate"
          current={last5WinRate}
          previous={prev5WinRate}
          format="pct"
        />
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Record</p>
          <p className="text-xl font-bold text-text-primary">
            <span className="text-win">{last5Wins}W</span>
            {" - "}
            <span className="text-loss">{last5Losses}L</span>
          </p>
          <p className="text-text-muted text-xs mt-0.5">
            prev: <span className="text-win">{prev5Wins}W</span> -{" "}
            <span className="text-loss">{prev5Losses}L</span>
          </p>
        </div>
        <TrendComparison
          label="DUPR Change"
          current={last5Delta}
          previous={prev5Delta}
          format="delta"
        />
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Points For/Against</p>
          <p className="text-xl font-bold text-text-primary">
            <span className="text-win">{last5Pts.ptsFor}</span>
            {" - "}
            <span className="text-loss">{last5Pts.ptsAgainst}</span>
          </p>
          <p className="text-text-muted text-xs mt-0.5">
            {fmtPct(last5Pts.pct)} &middot; prev: {fmtPct(prev5Pts.pct)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AllTimeStats({ data }: { data: PlayerAnalytics }) {
  const sessions = data.sessions;
  const totalSessions = sessions.length;
  const totalDuprGained =
    data.current_doubles - (sessions[0]?.end_rating ?? data.current_doubles);
  const avgDeltaPerSession =
    totalSessions > 0
      ? sessions.reduce((s, x) => s + x.net_delta, 0) / totalSessions
      : 0;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        All-Time Stats
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* 1. Sessions */}
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Sessions</p>
          <p className="text-xl font-bold text-text-primary">{totalSessions}</p>
          <p className="text-text-muted text-xs">
            {data.total_matches} matches
          </p>
        </div>
        {/* 2. Record */}
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Record</p>
          <p className="text-xl font-bold text-text-primary">
            <span className="text-win">{data.total_wins}W</span>
            {" - "}
            <span className="text-loss">
              {data.total_matches - data.total_wins}L
            </span>
          </p>
          <p className="text-text-muted text-xs">
            {fmtPct(data.overall_win_rate)} win rate
          </p>
        </div>
        {/* 3. Points For / Against */}
        {(() => {
          const pts = computePoints(data.match_details);
          return (
            <div className="bg-bg-primary rounded-lg p-3">
              <p className="text-text-muted text-xs">Points For / Against</p>
              <p className="text-xl font-bold text-text-primary">
                <span className="text-win">{pts.ptsFor}</span>
                {" - "}
                <span className="text-loss">{pts.ptsAgainst}</span>
              </p>
              <p className="text-text-muted text-xs">
                {fmtPct(pts.pct)} scoring
              </p>
            </div>
          );
        })()}
        {/* 4. Career High */}
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Career High</p>
          <p className="text-xl font-bold text-accent">
            {fmtRating(data.career_high_doubles)}
          </p>
          {data.career_high_date && (
            <p className="text-text-muted text-xs">
              {fmtDateShort(data.career_high_date)}
            </p>
          )}
        </div>
        {/* 5. Total DUPR Gained */}
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Total DUPR Gained</p>
          <p
            className={`text-xl font-bold font-mono ${totalDuprGained >= 0 ? "text-win" : "text-loss"}`}
          >
            {fmtDelta(totalDuprGained)}
          </p>
          <p className="text-text-muted text-xs">
            {fmtRating(sessions[0]?.end_rating ?? 0)} &rarr;{" "}
            {fmtRating(data.current_doubles)}
          </p>
        </div>
        {/* 6. Avg DUPR/Session */}
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Avg DUPR/Session</p>
          <p
            className={`text-xl font-bold font-mono ${avgDeltaPerSession >= 0 ? "text-win" : "text-loss"}`}
          >
            {fmtDelta(avgDeltaPerSession)}
          </p>
        </div>
        {/* 7. Best Win Streak */}
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Best Win Streak</p>
          <p className="text-xl font-bold text-win">
            {data.longest_win_streak ? data.longest_win_streak.count : 0}
          </p>
          {data.longest_win_streak && (
            <p className="text-text-muted text-xs">
              {fmtDateShort(data.longest_win_streak.start_date)} to
              <br />
              {fmtDateShort(data.longest_win_streak.end_date)}
            </p>
          )}
        </div>
        {/* 8. Finals Record */}
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Finals Record</p>
          <p className="text-xl font-bold text-text-primary">
            {data.finals_record || "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function RecentSessions({ data }: { data: PlayerAnalytics }) {
  const recent = [...data.sessions].reverse().slice(0, 5);

  // Sparkline based on DUPR end_rating for the last 5 sessions
  const sparkData = [...data.sessions].slice(-5).map((s) => ({
    date: s.date,
    rating: s.end_rating,
  }));

  if (recent.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Recent Sessions
        </h3>
        {sparkData.length >= 3 && (
          <div className="w-32 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Area
                  type="monotone"
                  dataKey="rating"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  fill="url(#sparkGrad)"
                  dot={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-bg-card border border-border rounded px-2 py-1 text-xs shadow">
                        {fmtRating(d.rating)}
                      </div>
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {recent.map((s) => {
          const positive = s.net_delta >= 0;
          const label =
            s.organizer && s.location
              ? `${s.organizer} - ${s.location}`
              : s.organizer || s.location || s.event_name;
          const placeLabel =
            s.place != null ? (PLACE_LABELS[s.place] ?? `${s.place}th`) : null;
          return (
            <div
              key={s.date}
              className={`flex items-center justify-between p-2 rounded-lg border-l-4 ${
                positive ? "border-l-win bg-win/5" : "border-l-loss bg-loss/5"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {fmtDate(s.date)}
                </p>
                <p className="text-xs text-text-muted truncate">{label}</p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                {placeLabel && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      s.place === 1
                        ? "bg-[#FFD700]/20 text-[#FFD700]"
                        : s.place === 2
                          ? "bg-[#C0C0C0]/20 text-[#C0C0C0]"
                          : "bg-[#CD7F32]/20 text-[#CD7F32]"
                    }`}
                  >
                    {placeLabel}
                  </span>
                )}
                <div>
                  <p className="text-sm">
                    <span className="text-win">{s.wins}W</span>
                    {" - "}
                    <span className="text-loss">{s.losses}L</span>
                  </p>
                  <p
                    className={`text-xs font-mono ${positive ? "text-win" : "text-loss"}`}
                  >
                    {fmtDelta(s.net_delta)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
