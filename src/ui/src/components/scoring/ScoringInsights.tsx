import type { PlayerAnalytics } from "../../types";
import { fmtPct } from "../../utils/format";

export function ScoringInsights({ data }: { data: PlayerAnalytics }) {
  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        Scoring Insights
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Avg Point Diff (Wins)</p>
          <p className="text-win text-xl font-bold">
            +{data.avg_point_diff_wins.toFixed(1)}
          </p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Avg Point Diff (Losses)</p>
          <p className="text-loss text-xl font-bold">
            {data.avg_point_diff_losses.toFixed(1)}
          </p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Blowout Win %</p>
          <p className="text-accent text-xl font-bold">
            {fmtPct(data.blowout_win_pct)}
          </p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3">
          <p className="text-text-muted text-xs">Close Loss %</p>
          <p className="text-text-primary text-xl font-bold">
            {fmtPct(data.close_loss_pct)}
          </p>
        </div>
      </div>
    </div>
  );
}
