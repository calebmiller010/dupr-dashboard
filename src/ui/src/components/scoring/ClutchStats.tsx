import type { ClutchStats as ClutchStatsType } from "../../types";
import { fmtPct } from "../../utils/format";

function Ring({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - value * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="#334155"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-text-primary">
            {fmtPct(value)}
          </span>
        </div>
      </div>
      <span className="text-xs text-text-muted text-center">{label}</span>
    </div>
  );
}

export function ClutchStatsCard({ clutch }: { clutch: ClutchStatsType }) {
  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
        Clutch & Pressure
      </h3>
      <div className="flex justify-around flex-wrap gap-4">
        <Ring
          value={clutch.close_game_win_rate}
          label="Close Games"
          color="#06b6d4"
        />
        {clutch.total_bracket > 0 && (
          <Ring
            value={clutch.bracket_win_rate}
            label="Bracket Play"
            color="#a855f7"
          />
        )}
      </div>
    </div>
  );
}
