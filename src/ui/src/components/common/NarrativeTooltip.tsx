import { useState, useRef, useEffect } from "react";

interface Thresholds {
  impact: {
    dominance: number;
    empty_win: number;
    grinder: number;
    underperformance: number;
  };
  context: {
    big_underdog: number;
    slight_underdog: number;
    slight_favorite: number;
    big_favorite: number;
  };
}

function fmtT(v: number): string {
  return v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3);
}

function buildImpacts(t: Thresholds["impact"]) {
  return [
    {
      name: "Dominance",
      color: "#22c55e",
      desc: `Won with DUPR delta > ${fmtT(t.dominance)}`,
    },
    {
      name: "Standard Win",
      color: "#94a3b8",
      desc: `Won with delta between ${fmtT(t.empty_win)} and ${fmtT(t.dominance)}`,
    },
    {
      name: "Rough Win",
      color: "#eab308",
      desc: `Won but lost rating (delta < ${fmtT(t.empty_win)})`,
    },
    {
      name: "The Grinder",
      color: "#3b82f6",
      desc: `Lost but gained rating (delta > ${fmtT(t.grinder)})`,
    },
    {
      name: "Soft Loss",
      color: "#6b7280",
      desc: `Lost with delta between ${fmtT(t.underperformance)} and ${fmtT(t.grinder)}`,
    },
    {
      name: "Underperformance",
      color: "#ef4444",
      desc: `Lost with big rating drop (delta < ${fmtT(t.underperformance)})`,
    },
  ];
}

function buildContexts(t: Thresholds["context"]) {
  return [
    {
      name: "Big Underdog",
      color: "#a855f7",
      desc: `Gap < ${fmtT(t.big_underdog)}`,
    },
    {
      name: "Slight Underdog",
      color: "#818cf8",
      desc: `Gap >= ${fmtT(t.big_underdog)} and < ${fmtT(t.slight_underdog)}`,
    },
    {
      name: "Even Match",
      color: "#94a3b8",
      desc: `Gap >= ${fmtT(t.slight_underdog)} and <= ${fmtT(t.slight_favorite)}`,
    },
    {
      name: "Slight Favorite",
      color: "#fb923c",
      desc: `Gap > ${fmtT(t.slight_favorite)} and <= ${fmtT(t.big_favorite)}`,
    },
    {
      name: "Big Favorite",
      color: "#f97316",
      desc: `Rating gap > ${fmtT(t.big_favorite)}`,
    },
  ];
}

export function NarrativeTooltip({
  thresholds,
}: {
  counts?: Record<string, number>;
  contextCounts?: Record<string, number>;
  thresholds?: Thresholds;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const t =
    thresholds && thresholds.impact && thresholds.context
      ? thresholds
      : {
          impact: {
            dominance: 0.01,
            empty_win: -0.005,
            grinder: 0.005,
            underperformance: -0.01,
          },
          context: {
            big_underdog: -0.3,
            slight_underdog: -0.1,
            slight_favorite: 0.1,
            big_favorite: 0.3,
          },
        };
  const impacts = buildImpacts(t.impact);
  const contexts = buildContexts(t.context);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Match Classifications
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-30 w-[480px] bg-bg-card border border-border rounded-xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Rating Impact
          </h3>
          <p className="text-xs text-text-muted mb-2">
            Based on how your DUPR rating changed
          </p>
          <div className="space-y-2 mb-5">
            {impacts.map((n) => (
              <div key={n.name} className="flex items-start gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: n.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color: n.color }}
                    >
                      {n.name}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Matchup Context
          </h3>
          <p className="text-xs text-text-muted mb-2">
            Based on the rating gap between teams
          </p>
          <div className="space-y-2">
            {contexts.map((n) => (
              <div key={n.name} className="flex items-start gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: n.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color: n.color }}
                    >
                      {n.name}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
