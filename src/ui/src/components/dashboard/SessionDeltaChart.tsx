import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import type { SessionGroup } from "../../types";
import { fmtDelta, fmtDateShort } from "../../utils/format";

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
        <span className="text-win">{s.wins}W</span>
        {" - "}
        <span className="text-loss">{s.losses}L</span>
      </p>
      <p
        className={`font-mono font-bold ${s.net_delta >= 0 ? "text-win" : "text-loss"}`}
      >
        {fmtDelta(s.net_delta)}
      </p>
    </div>
  );
}

interface SessionDeltaChartProps {
  sessions: SessionGroup[];
  onSessionClick?: (date: string) => void;
  onSessionHover?: (date: string | null) => void;
  highlightDate?: string | null;
  visibleDateRange?: [string, string] | null;
}

export function SessionDeltaChart({
  sessions,
  onSessionClick,
  onSessionHover,
  highlightDate,
  visibleDateRange,
}: SessionDeltaChartProps) {
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

  const maxAbs = Math.max(...visible.map((s) => Math.abs(s.net_delta)), 0.02);
  const domain = [
    -Math.ceil(maxAbs * 100) / 100,
    Math.ceil(maxAbs * 100) / 100,
  ];

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h2 className="text-lg font-semibold mb-4">DUPR +/-</h2>
      <ResponsiveContainer width="100%" height={200}>
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
            domain={domain}
            tickFormatter={(v: number) => fmtDelta(v)}
            stroke="#64748b"
            fontSize={11}
            width={52}
          />
          <Tooltip
            content={<CustomTooltip />}
            position={{ x: 60, y: 90 }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
          <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
          <Bar dataKey="net_delta" radius={[2, 2, 2, 2]} maxBarSize={20}>
            {visible.map((s) => (
              <Cell
                key={s.date}
                fill={s.net_delta >= 0 ? "#22c55e" : "#ef4444"}
                fillOpacity={highlightDate === s.date ? 1 : 0.7}
                stroke={highlightDate === s.date ? "#06b6d4" : "none"}
                strokeWidth={highlightDate === s.date ? 2 : 0}
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
