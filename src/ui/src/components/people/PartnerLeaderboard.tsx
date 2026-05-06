import type { PartnerStats } from "../../types";
import { fmtDelta, fmtDateShort } from "../../utils/format";
import { EmptyState } from "../common/EmptyState";

export function PartnerLeaderboard({
  title,
  partners,
  variant = "best",
  onViewMatches,
}: {
  title: string;
  partners: PartnerStats[];
  variant?: "best" | "worst";
  onViewMatches?: (name: string) => void;
}) {
  if (partners.length === 0)
    return <EmptyState message={`No ${variant} partners to show`} />;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="space-y-1">
        {partners.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              onViewMatches
                ? "cursor-pointer hover:bg-bg-card-hover"
                : "hover:bg-bg-card-hover"
            }`}
            onClick={() => onViewMatches?.(p.name)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-text-muted text-xs w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {p.name}
                </p>
                <p className="text-xs text-text-muted">
                  {p.wins}W-{p.matches - p.wins}L &middot; last{" "}
                  {fmtDateShort(p.last_played)}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={`font-mono text-xs ${
                  p.total_delta >= 0 ? "text-win" : "text-loss"
                }`}
              >
                {fmtDelta(p.total_delta)}
              </span>
              <span className="font-mono text-xs text-text-muted ml-2">
                (avg. {fmtDelta(p.avg_delta)}/m)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
