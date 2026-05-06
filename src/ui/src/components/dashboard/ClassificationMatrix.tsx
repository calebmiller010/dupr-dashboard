import { useMemo } from "react";
import type { MatchDetail } from "../../types";
import { fmtDelta } from "../../utils/format";

const IMPACT_ORDER = [
  "Dominance",
  "Standard Win",
  "Rough Win",
  "The Grinder",
  "Soft Loss",
  "Underperformance",
];

const CONTEXT_ORDER = [
  "Big Underdog",
  "Slight Underdog",
  "Even Match",
  "Slight Favorite",
  "Big Favorite",
];

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

interface CellData {
  wins: number;
  losses: number;
  totalDelta: number;
  count: number;
}

export function ClassificationMatrix({
  matches,
  onCellClick,
}: {
  matches: MatchDetail[];
  onCellClick?: (impact: string | null, context: string | null) => void;
}) {
  const matrix = useMemo(() => {
    const data: Record<string, Record<string, CellData>> = {};
    // Init
    for (const ctx of CONTEXT_ORDER) {
      data[ctx] = {};
      for (const imp of IMPACT_ORDER) {
        data[ctx][imp] = { wins: 0, losses: 0, totalDelta: 0, count: 0 };
      }
    }
    // Populate
    for (const m of matches) {
      const imp = m.narrative;
      const ctx = m.matchup_context;
      if (data[ctx]?.[imp]) {
        const cell = data[ctx][imp];
        cell.count++;
        cell.totalDelta += m.target_delta;
        if (m.won) cell.wins++;
        else cell.losses++;
      }
    }
    return data;
  }, [matches]);

  // Context totals (rows)
  const contextTotals = useMemo(() => {
    const totals: Record<string, CellData> = {};
    for (const ctx of CONTEXT_ORDER) {
      totals[ctx] = { wins: 0, losses: 0, totalDelta: 0, count: 0 };
      for (const imp of IMPACT_ORDER) {
        const cell = matrix[ctx][imp];
        totals[ctx].wins += cell.wins;
        totals[ctx].losses += cell.losses;
        totals[ctx].totalDelta += cell.totalDelta;
        totals[ctx].count += cell.count;
      }
    }
    return totals;
  }, [matrix]);

  // Impact totals (columns)
  const impactTotals = useMemo(() => {
    const totals: Record<string, CellData> = {};
    for (const imp of IMPACT_ORDER) {
      totals[imp] = { wins: 0, losses: 0, totalDelta: 0, count: 0 };
      for (const ctx of CONTEXT_ORDER) {
        const cell = matrix[ctx][imp];
        totals[imp].wins += cell.wins;
        totals[imp].losses += cell.losses;
        totals[imp].totalDelta += cell.totalDelta;
        totals[imp].count += cell.count;
      }
    }
    return totals;
  }, [matrix]);

  function CellContent({ cell }: { cell: CellData }) {
    if (cell.count === 0) return <span className="text-text-muted/30">—</span>;
    return (
      <div className="leading-tight">
        <div className="text-xs">
          <span className="text-win">{cell.wins}W</span>
          <span className="text-text-muted">-</span>
          <span className="text-loss">{cell.losses}L</span>
        </div>
        <div
          className={`text-xs font-mono ${cell.totalDelta >= 0 ? "text-win" : "text-loss"}`}
        >
          {fmtDelta(cell.totalDelta)}
        </div>
      </div>
    );
  }

  function TotalCellContent({ cell }: { cell: CellData }) {
    if (cell.count === 0) return <span className="text-text-muted/30">—</span>;
    const avg = cell.totalDelta / cell.count;
    return (
      <div className="leading-tight">
        <div className="text-xs">
          <span className="text-win">{cell.wins}W</span>
          <span className="text-text-muted">-</span>
          <span className="text-loss">{cell.losses}L</span>
        </div>
        <div
          className={`text-xs font-mono ${cell.totalDelta >= 0 ? "text-win" : "text-loss"}`}
        >
          {fmtDelta(cell.totalDelta)}
        </div>
        <div className={`text-[10px] font-mono text-text-muted`}>
          avg {fmtDelta(avg)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
        Performance Matrix
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Rating Impact vs Matchup Context — W-L record and total DUPR change per
        combination
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="px-2 py-3 text-xs text-text-muted" />
              {IMPACT_ORDER.map((imp) => (
                <th key={imp} className="px-2 py-3">
                  <span
                    className="text-xs font-bold"
                    style={{ color: IMPACT_COLORS[imp] }}
                  >
                    {imp}
                  </span>
                  <div className="text-xs text-text-muted mt-0.5">
                    {impactTotals[imp].count}
                  </div>
                </th>
              ))}
              <th className="px-2 py-3 text-xs text-text-muted font-bold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {CONTEXT_ORDER.map((ctx) => (
              <tr key={ctx} className="border-t border-border/50">
                <td className="px-2 py-3 text-left">
                  <span
                    className="text-xs font-bold"
                    style={{ color: CONTEXT_COLORS[ctx] }}
                  >
                    {ctx}
                  </span>
                  <div className="text-xs text-text-muted">
                    {contextTotals[ctx].count}
                  </div>
                </td>
                {IMPACT_ORDER.map((imp) => (
                  <td
                    key={imp}
                    className={`px-2 py-3 hover:bg-bg-card-hover transition-colors rounded ${onCellClick && matrix[ctx][imp].count > 0 ? "cursor-pointer" : ""}`}
                    onClick={() =>
                      onCellClick &&
                      matrix[ctx][imp].count > 0 &&
                      onCellClick(imp, ctx)
                    }
                  >
                    <CellContent cell={matrix[ctx][imp]} />
                  </td>
                ))}
                <td
                  className={`px-2 py-3 border-l border-border ${onCellClick && contextTotals[ctx].count > 0 ? "cursor-pointer hover:bg-bg-card-hover" : ""}`}
                  onClick={() =>
                    onCellClick &&
                    contextTotals[ctx].count > 0 &&
                    onCellClick(null, ctx)
                  }
                >
                  <TotalCellContent cell={contextTotals[ctx]} />
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="border-t border-border">
              <td className="px-2 py-3 text-left text-xs text-text-muted font-bold">
                Total
              </td>
              {IMPACT_ORDER.map((imp) => (
                <td
                  key={imp}
                  className={`px-2 py-3 border-t border-border ${onCellClick && impactTotals[imp].count > 0 ? "cursor-pointer hover:bg-bg-card-hover" : ""}`}
                  onClick={() =>
                    onCellClick &&
                    impactTotals[imp].count > 0 &&
                    onCellClick(imp, null)
                  }
                >
                  <TotalCellContent cell={impactTotals[imp]} />
                </td>
              ))}
              <td className="px-2 py-3 border-t border-l border-border">
                <TotalCellContent
                  cell={{
                    wins: matches.filter((m) => m.won).length,
                    losses: matches.filter((m) => !m.won).length,
                    totalDelta: matches.reduce((s, m) => s + m.target_delta, 0),
                    count: matches.length,
                  }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
