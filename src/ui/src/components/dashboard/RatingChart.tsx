import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
  ReferenceLine,
} from "recharts";
import type { SessionGroup } from "../../types";
import { fmtRating, fmtDelta, fmtDateShort } from "../../utils/format";

interface ChartPoint {
  key: string; // unique key for x-axis (date or date-adj or year-YYYY)
  date: string;
  rating: number;
  type: "session" | "adjustment" | "year-divider";
  session?: SessionGroup;
  adjustment?: number;
  year?: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const pt: ChartPoint = payload[0].payload;

  if (pt.type === "year-divider") {
    return (
      <div className="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm shadow-xl">
        <p className="text-text-primary font-bold">{pt.year}</p>
      </div>
    );
  }

  if (pt.type === "adjustment") {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-3 text-sm shadow-xl">
        <p className="text-yellow-400 font-bold">
          DUPR Adjustment: {fmtDelta(pt.adjustment ?? 0)}
        </p>
        <p className="text-text-muted text-xs">
          Rating recalculated between sessions
        </p>
      </div>
    );
  }

  const s = pt.session!;
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
      <p className="text-text-secondary">
        <span className="text-win">{s.wins}W</span>
        {" - "}
        <span className="text-loss">{s.losses}L</span>
        <span
          className={`font-mono ml-2 ${s.net_delta >= 0 ? "text-win" : "text-loss"}`}
        >
          {fmtDelta(s.net_delta)}
        </span>
      </p>
    </div>
  );
}

function computeDomain(points: ChartPoint[], startIdx: number, endIdx: number) {
  const visible = points.slice(startIdx, endIdx + 1);
  const ratings = visible.map((p) => p.rating).filter(Boolean);
  if (ratings.length === 0) return [3.0, 4.0];
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const padding = Math.max(0.02, (max - min) * 0.1);
  return [
    Math.floor((min - padding) * 20) / 20,
    Math.ceil((max + padding) * 20) / 20,
  ];
}

interface RatingChartProps {
  sessions: SessionGroup[];
  onSessionClick?: (date: string) => void;
  highlightDate?: string | null;
  brushRange?: [number, number];
  onBrushChange?: (range: [number, number]) => void;
  onVisibleDatesChange?: (startDate: string, endDate: string) => void;
  onSessionHover?: (date: string | null) => void;
}

export function RatingChart({
  sessions,
  onSessionClick,
  highlightDate,
  brushRange: externalBrushRange,
  onBrushChange: externalBrushChange,
  onVisibleDatesChange,
  onSessionHover,
}: RatingChartProps) {
  if (sessions.length === 0) return null;

  const [showAdjustments, setShowAdjustments] = useState(true);

  // Build chart data with unique keys for x-axis
  const chartData = useMemo(() => {
    const points: ChartPoint[] = [];
    let prevYear = "";
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const year = s.date.slice(0, 4);

      // Insert year divider between years
      if (prevYear && year !== prevYear && i > 0) {
        // Interpolate rating between previous session end and this session start
        const prevEnd = sessions[i - 1].end_rating;
        const curStart = s.start_rating;
        points.push({
          key: `year-${year}`,
          date: s.date,
          rating: (prevEnd + curStart) / 2,
          type: "year-divider",
          year,
        });
      }

      if (s.adjustment !== 0 && showAdjustments && i > 0) {
        const prevSession = sessions[i - 1];
        points.push({
          key: `${s.date}-adj`,
          date: s.date,
          rating: prevSession.end_rating + s.adjustment,
          type: "adjustment",
          adjustment: s.adjustment,
        });
      }
      points.push({
        key: s.date,
        date: s.date,
        rating: s.end_rating,
        type: "session",
        session: s,
      });
      prevYear = year;
    }
    return points;
  }, [sessions, showAdjustments]);

  const [brushIndices, setBrushIndices] = useState<[number, number] | null>(null);

  // Sync internal brush when chartData changes (e.g. filters applied)
  useEffect(() => {
    setBrushIndices(null); // Reset to full range when data changes
  }, [chartData]);

  const activeRange: [number, number] = useMemo(() => {
    if (externalBrushRange) return externalBrushRange;
    if (brushIndices) return brushIndices;
    return [0, chartData.length - 1];
  }, [externalBrushRange, brushIndices, chartData.length]);

  const clampedRange: [number, number] = [
    Math.max(0, Math.min(activeRange[0], chartData.length - 1)),
    Math.max(0, Math.min(activeRange[1], chartData.length - 1)),
  ];

  const [minR, maxR] = computeDomain(
    chartData,
    clampedRange[0],
    clampedRange[1],
  );

  // Use a ref for the debounced emit to avoid recreating it
  const emitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitVisibleDates = useCallback(
    (startIndex: number, endIndex: number) => {
      if (emitTimeoutRef.current) clearTimeout(emitTimeoutRef.current);

      emitTimeoutRef.current = setTimeout(() => {
        if (onVisibleDatesChange && chartData.length > 0) {
          let startDate = "";
          for (
            let i = Math.max(0, Math.min(startIndex, chartData.length - 1));
            i < chartData.length;
            i++
          ) {
            if (chartData[i].type === "session") {
              startDate = chartData[i].date;
              break;
            }
          }
          let endDate = "";
          for (let i = Math.min(endIndex, chartData.length - 1); i >= 0; i--) {
            if (chartData[i].type === "session") {
              endDate = chartData[i].date;
              break;
            }
          }
          if (startDate && endDate) onVisibleDatesChange(startDate, endDate);
        }
      }, 50); // Small debounce to keep drag smooth
    },
    [onVisibleDatesChange, chartData],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emitTimeoutRef.current) clearTimeout(emitTimeoutRef.current);
    };
  }, []);

  const handleBrushChange = useCallback(
    (range: any) => {
      if (range && range.startIndex != null && range.endIndex != null) {
        const r: [number, number] = [range.startIndex, range.endIndex];
        setBrushIndices(r);
        externalBrushChange?.(r);
        emitVisibleDates(range.startIndex, range.endIndex);
      }
    },
    [externalBrushChange, emitVisibleDates],
  );

  // The key ensures the Brush resets when filters are applied (data set changes)
  const brushKey = useMemo(() => {
    const first = chartData[0]?.key ?? "none";
    const last = chartData[chartData.length - 1]?.key ?? "none";
    return `brush-${chartData.length}-${first}-${last}-${showAdjustments}`;
  }, [chartData, showAdjustments]);

  const handleClick = (data: any) => {
    const pt = data?.activePayload?.[0]?.payload as ChartPoint | undefined;

    // Try to get date from payload or label (the unique key)
    let date = "";
    if (pt?.type === "session" && pt.session) {
      date = pt.session.date;
    } else {
      const label = data?.activeLabel as string | undefined;
      if (label) {
        // Remove -adj suffix if present, ignore year dividers
        if (!label.startsWith("year-")) {
          date = label.replace("-adj", "");
        }
      }
    }

    if (date && onSessionClick) {
      onSessionClick(date);
    }
  };

  // Year divider keys from the data
  const yearLines = useMemo(() => {
    return chartData
      .filter((pt) => pt.type === "year-divider")
      .map((pt) => ({ key: pt.key, year: pt.year! }));
  }, [chartData]);

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">DUPR History</h2>
        <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showAdjustments}
            onChange={(e) => setShowAdjustments(e.target.checked)}
            className="rounded border-border"
          />
          Show DUPR adjustments
        </label>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart
          data={chartData}
          onClick={handleClick}
          onMouseMove={(state: any) => {
            const pt = state?.activePayload?.[0]?.payload;
            if (pt?.type === "session" && pt.session && onSessionHover) {
              onSessionHover(pt.session.date);
            }
          }}
          onMouseLeave={() => onSessionHover?.(null)}
        >
          <defs>
            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          {yearLines.map(({ key, year: _year }) => (
            <ReferenceLine
              key={`year-${key}`}
              x={key}
              stroke="#94a3b8"
              strokeDasharray="6 4"
            />
          ))}
          <XAxis
            dataKey="key"
            stroke="#334155"
            tickLine={false}
            interval={0}
            tick={(props: any) => {
              const pt = chartData[props.index];
              if (!pt || pt.type !== "year-divider") return <g />;
              return (
                <text
                  x={props.x}
                  y={props.y + 16}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={12}
                  fontWeight={600}
                >
                  {pt.year}
                </text>
              );
            }}
          />
          <YAxis
            domain={[minR, maxR]}
            tickFormatter={(v: number) => v.toFixed(2)}
            stroke="#64748b"
            fontSize={12}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip />}
            position={{ x: 60, y: 0 }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
          <Area
            type="monotone"
            dataKey="rating"
            stroke="none"
            fill="url(#ratingGradient)"
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (cx == null || cy == null) return null;
              const pt = payload as ChartPoint;

              if (pt.type === "year-divider") return null;

              if (pt.type === "adjustment") {
                return (
                  <g key={props.index}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#eab308"
                      fillOpacity={0.3}
                      stroke="#eab308"
                      strokeWidth={1.5}
                    />
                    <circle cx={cx} cy={cy} r={2.5} fill="#eab308" />
                  </g>
                );
              }

              const s = pt.session!;
              const color = s.net_delta >= 0 ? "#22c55e" : "#ef4444";
              const isHighlighted = highlightDate === s.date;
              return (
                <g key={props.index}>
                  {isHighlighted && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill="#06b6d4"
                      fillOpacity={0.2}
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHighlighted ? 6 : 5}
                    fill={color}
                    stroke={isHighlighted ? "#06b6d4" : color}
                    strokeWidth={isHighlighted ? 2 : 1}
                    style={{ cursor: "pointer" }}
                  />
                </g>
              );
            }}
            activeDot={{
              r: 7,
              stroke: "#06b6d4",
              strokeWidth: 2,
              cursor: "pointer",
            }}
          />
          <Brush
            key={brushKey}
            dataKey="key"
            height={24}
            stroke="#334155"
            fill="#1e293b"
            tickFormatter={(key: string) => {
              if (key.startsWith("year-")) return key.slice(5);
              return fmtDateShort(key.replace("-adj", ""));
            }}
            onChange={handleBrushChange}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
