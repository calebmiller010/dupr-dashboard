import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import type { PlayerAnalytics, SessionGroup } from "../../types";

const PLACE_COLORS: Record<string, string> = {
  "1st": "#FFD700",
  "2nd": "#C0C0C0",
  "3rd": "#CD7F32",
  Other: "#475569",
};

const PLACE_ORDER = ["1st", "2nd", "3rd", "Other"];

function computePlacement(sessions: SessionGroup[]) {
  const dist: Record<string, number> = {};
  let finalsWins = 0;
  let finalsLosses = 0;
  for (const s of sessions) {
    if (s.place === 1) {
      dist["1st"] = (dist["1st"] ?? 0) + 1;
      finalsWins++;
    } else if (s.place === 2) {
      dist["2nd"] = (dist["2nd"] ?? 0) + 1;
      finalsLosses++;
    } else if (s.place === 3) {
      dist["3rd"] = (dist["3rd"] ?? 0) + 1;
    } else {
      dist["Other"] = (dist["Other"] ?? 0) + 1;
    }
  }
  const finalsRecord =
    finalsWins + finalsLosses > 0 ? `${finalsWins}-${finalsLosses}` : "";
  return { dist, finalsRecord };
}

interface PlacementChartProps {
  data?: PlayerAnalytics;
  sessions?: SessionGroup[];
  visibleDateRange?: [string, string] | null;
}

export function PlacementChart({
  data,
  sessions,
  visibleDateRange,
}: PlacementChartProps) {
  const filteredSessions = useMemo(() => {
    if (!sessions) return null;
    if (!visibleDateRange) return sessions;
    return sessions.filter(
      (s) => s.date >= visibleDateRange[0] && s.date <= visibleDateRange[1],
    );
  }, [sessions, visibleDateRange]);

  const { dist, finalsRecord } = filteredSessions
    ? computePlacement(filteredSessions)
    : {
        dist: data?.placement_distribution ?? {},
        finalsRecord: data?.finals_record ?? "",
      };

  if (Object.keys(dist).length === 0) return null;

  const chartData = PLACE_ORDER.filter((k) => dist[k] != null).map((k) => ({
    place: k,
    count: dist[k] ?? 0,
  }));

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
          Placement Distribution
        </h3>
        {finalsRecord && (
          <span className="text-xs text-text-muted">
            Finals record:{" "}
            <span className="text-text-primary font-medium">
              {finalsRecord}
            </span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barSize={40}>
          <XAxis dataKey="place" stroke="#64748b" fontSize={12} />
          <YAxis
            allowDecimals={false}
            stroke="#64748b"
            fontSize={12}
            width={24}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-bg-card border border-border rounded-lg p-2 text-sm shadow-xl">
                  <p className="text-text-primary font-medium">{d.place}</p>
                  <p className="text-accent">
                    {d.count} / {total} sessions (
                    {Math.round((d.count / total) * 100)}%)
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((d) => (
              <Cell key={d.place} fill={PLACE_COLORS[d.place] ?? "#64748b"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
