import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { SessionGroup } from "../../types";
import { fmtDateShort, fmtDelta, fmtRating } from "../../utils/format";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const s: SessionGroup = payload[0].payload;
  const label =
    s.organizer && s.location
      ? `${s.organizer} - ${s.location}`
      : s.organizer || s.location || s.event_name;
  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 text-sm shadow-xl">
      <p className="text-text-primary font-medium">{fmtDateShort(s.date)}</p>
      <p className="text-text-muted text-xs">{label}</p>
      <p className="text-text-secondary">
        {fmtRating(s.start_rating)} &rarr;{" "}
        <span className="text-accent font-bold">{fmtRating(s.end_rating)}</span>
      </p>
      <p>
        <span className="text-win font-medium">{s.wins}W</span>
        {" - "}
        <span className="text-loss font-medium">{s.losses}L</span>
        <span
          className={`font-mono ml-2 ${s.net_delta >= 0 ? "text-win" : "text-loss"}`}
        >
          {fmtDelta(s.net_delta)}
        </span>
      </p>
    </div>
  );
}

interface SessionWLChartProps {
  sessions: SessionGroup[];
  onSessionClick?: (date: string) => void;
  onSessionHover?: (date: string | null) => void;
  highlightDate?: string | null;
  visibleDateRange?: [string, string] | null;
}

export function SessionWLChart({
  sessions,
  onSessionClick,
  onSessionHover,
  visibleDateRange,
}: SessionWLChartProps) {
  if (sessions.length === 0) return null;

  const visible = visibleDateRange
    ? sessions.filter(
        (s) => s.date >= visibleDateRange[0] && s.date <= visibleDateRange[1],
      )
    : sessions;

  const handleClick = (data: any) => {
    const date = data?.activePayload?.[0]?.payload?.date || data?.activeLabel;
    if (date && onSessionClick) {
      onSessionClick(date);
    }
  };

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h2 className="text-lg font-semibold mb-4">W/L by Session</h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={visible}
          onClick={handleClick}
          onMouseMove={(state: any) => {
            if (state?.activePayload?.[0]?.payload && onSessionHover) {
              onSessionHover(state.activePayload[0].payload.date);
            }
          }}
          onMouseLeave={() => onSessionHover?.(null)}
        >
          <XAxis dataKey="date" tick={false} stroke="#334155" />
          <YAxis
            allowDecimals={false}
            stroke="#64748b"
            fontSize={11}
            width={24}
          />
          <Tooltip
            content={<CustomTooltip />}
            position={{ x: 10, y: 0 }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
          <Bar
            dataKey="wins"
            stackId="wl"
            fill="#22c55e"
            radius={[0, 0, 0, 0]}
            maxBarSize={20}
          />
          <Bar
            dataKey="losses"
            stackId="wl"
            fill="#ef4444"
            radius={[2, 2, 0, 0]}
            maxBarSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
