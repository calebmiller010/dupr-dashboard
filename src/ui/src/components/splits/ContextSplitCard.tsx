import type { ContextSplit } from "../../types";
import { fmtPct, fmtDelta } from "../../utils/format";

export function ContextSplitCard({
  title,
  splits,
}: {
  title: string;
  splits: ContextSplit[];
}) {
  if (splits.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {splits.map((s) => (
          <div key={s.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{s.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-text-muted">{s.matches} matches</span>
                <span
                  className={`font-mono text-xs ${
                    s.avg_delta >= 0 ? "text-win" : "text-loss"
                  }`}
                >
                  {fmtDelta(s.avg_delta)}
                </span>
                <span className="font-medium w-10 text-right">
                  {fmtPct(s.win_rate)}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: fmtPct(s.win_rate),
                  backgroundColor:
                    s.win_rate >= 0.6
                      ? "#22c55e"
                      : s.win_rate >= 0.45
                        ? "#eab308"
                        : "#ef4444",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
