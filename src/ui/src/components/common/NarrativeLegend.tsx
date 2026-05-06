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
      desc: "Won and gained significant rating",
      criteria: `Won with delta > ${fmtT(t.dominance)}`,
    },
    {
      name: "Standard Win",
      color: "#94a3b8",
      desc: "Normal win, moderate rating impact",
      criteria: `Won with delta >= ${fmtT(t.empty_win)} and <= ${fmtT(t.dominance)}`,
    },
    {
      name: "Rough Win",
      color: "#eab308",
      desc: "Won but lost rating",
      criteria: `Won with delta < ${fmtT(t.empty_win)}`,
    },
    {
      name: "The Grinder",
      color: "#3b82f6",
      desc: "Lost but gained rating",
      criteria: `Lost with delta > ${fmtT(t.grinder)}`,
    },
    {
      name: "Soft Loss",
      color: "#6b7280",
      desc: "Normal loss, moderate rating impact",
      criteria: `Lost with delta >= ${fmtT(t.underperformance)} and <= ${fmtT(t.grinder)}`,
    },
    {
      name: "Underperformance",
      color: "#ef4444",
      desc: "Lost with big rating drop",
      criteria: `Lost with delta < ${fmtT(t.underperformance)}`,
    },
  ];
}

function buildContexts(t: Thresholds["context"]) {
  return [
    {
      name: "Big Underdog",
      color: "#a855f7",
      desc: "Significantly outmatched",
      criteria: `Rating gap < ${fmtT(t.big_underdog)}`,
    },
    {
      name: "Slight Underdog",
      color: "#818cf8",
      desc: "Slightly lower-rated",
      criteria: `Gap >= ${fmtT(t.big_underdog)} and < ${fmtT(t.slight_underdog)}`,
    },
    {
      name: "Even Match",
      color: "#94a3b8",
      desc: "Similar rating levels",
      criteria: `Gap >= ${fmtT(t.slight_underdog)} and <= ${fmtT(t.slight_favorite)}`,
    },
    {
      name: "Slight Favorite",
      color: "#fb923c",
      desc: "Slightly higher-rated",
      criteria: `Gap > ${fmtT(t.slight_favorite)} and <= ${fmtT(t.big_favorite)}`,
    },
    {
      name: "Big Favorite",
      color: "#f97316",
      desc: "Significantly favored",
      criteria: `Rating gap > ${fmtT(t.big_favorite)}`,
    },
  ];
}

const DEFAULT_THRESHOLDS: Thresholds = {
  impact: {
    dominance: 0.01,
    empty_win: -0.005,
    grinder: 0.005,
    underperformance: -0.01,
  },
  context: {
    big_underdog: -0.15,
    slight_underdog: -0.05,
    slight_favorite: 0.05,
    big_favorite: 0.15,
  },
};

interface NarrativeLegendProps {
  compact?: boolean;
  counts?: Record<string, number>;
  contextCounts?: Record<string, number>;
  thresholds?: Thresholds;
}

function LegendSection({
  title,
  subtitle,
  items,
  compact,
}: {
  title: string;
  subtitle: string;
  items: { name: string; color: string; desc: string; criteria: string }[];
  counts?: Record<string, number>;
  compact?: boolean;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
        {title}
      </h4>
      {!compact && <p className="text-xs text-text-muted mb-2">{subtitle}</p>}
      <div className={compact ? "grid grid-cols-2 gap-1.5" : "space-y-2"}>
        {items.map((n) => {
          return (
            <div key={n.name} className="flex items-start gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                style={{ backgroundColor: n.color }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: n.color }}
                  >
                    {n.name}
                  </span>
                </div>
                {!compact && (
                  <>
                    <p className="text-xs text-text-muted">{n.desc}</p>
                    <p className="text-xs text-text-muted/60 italic">
                      {n.criteria}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NarrativeLegend({
  compact,
  counts,
  contextCounts,
  thresholds,
}: NarrativeLegendProps) {
  const t = thresholds ?? DEFAULT_THRESHOLDS;
  const impacts = buildImpacts(t.impact);
  const contexts = buildContexts(t.context);

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border space-y-4">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
        Match Classifications
      </h3>
      <LegendSection
        title="Rating Impact"
        subtitle="Based on how your DUPR rating changed"
        items={impacts}
        counts={counts}
        compact={compact}
      />
      <LegendSection
        title="Matchup Context"
        subtitle="Based on the rating gap between teams"
        items={contexts}
        counts={contextCounts}
        compact={compact}
      />
    </div>
  );
}
