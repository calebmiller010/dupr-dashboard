import type { OpponentStats } from "../../types";
import { fmtDelta, fmtRating, fmtDateShort } from "../../utils/format";
import { EmptyState } from "../common/EmptyState";

export function OpponentList({
  title,
  opponents,
  variant,
  onViewMatches,
}: {
  title: string;
  opponents: OpponentStats[];
  variant: "kryptonite" | "feast";
  onViewMatches?: (name: string) => void;
}) {
  if (opponents.length === 0)
    return <EmptyState message={`No ${variant} opponents yet`} />;

  const isKryptonite = variant === "kryptonite";

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="space-y-1">
        {opponents.map((o, i) => (
          <div
            key={o.id}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              onViewMatches
                ? "cursor-pointer hover:bg-bg-card-hover"
                : "hover:bg-bg-card-hover"
            }`}
            onClick={() => onViewMatches?.(o.name)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-text-muted text-xs w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {o.name}
                </p>
                <p className="text-xs text-text-muted">
                  {o.wins_against}W-{o.losses_to}L &middot; avg{" "}
                  {fmtRating(o.avg_rating)} &middot; last{" "}
                  {fmtDateShort(o.last_played)}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`font-mono text-xs ${
                  isKryptonite ? "text-loss" : "text-win"
                }`}
              >
                {fmtDelta(o.total_delta)}
              </span>
              <span className="font-mono text-xs text-text-muted ml-2">
                (avg. {fmtDelta(o.avg_delta_per_match)}/m)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
