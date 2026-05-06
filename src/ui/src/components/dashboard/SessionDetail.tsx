import type { SessionGroup, MatchDetail } from "../../types";
import { fmtDate, fmtDelta, fmtRating } from "../../utils/format";
import { MatchCard } from "./MatchCard";

interface SessionDetailProps {
  session: SessionGroup;
  matches: MatchDetail[];
  onClose: () => void;
}

export function SessionDetail({ session, matches, onClose }: SessionDetailProps) {
  const label = session.organizer && session.location
    ? `${session.organizer} - ${session.location}`
    : session.organizer || session.location || session.event_name;
  const positive = session.net_delta >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-text-primary">
              {fmtDate(session.date)}
            </p>
            <p className="text-sm text-text-muted">{label}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span>
                <span className="text-win">{session.wins}W</span>
                {" - "}
                <span className="text-loss">{session.losses}L</span>
              </span>
              <span className={`font-mono font-bold ${positive ? "text-win" : "text-loss"}`}>
                {fmtDelta(session.net_delta)}
              </span>
              <span className="text-text-muted">
                {fmtRating(session.start_rating)} &rarr; {fmtRating(session.end_rating)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-2xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Match list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {matches.length === 0 ? (
            <p className="text-text-muted text-center py-8">No match details available</p>
          ) : (
            matches.map((m) => <MatchCard key={m.match_id} match={m} />)
          )}
        </div>
      </div>
    </div>
  );
}
