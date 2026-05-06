import { useEffect, useRef } from "react";
import type { SessionGroup } from "../../types";
import { fmtDate, fmtDelta, fmtRating } from "../../utils/format";

const PLACE_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

interface SessionTimelineProps {
  sessions: SessionGroup[];
  onSessionClick?: (date: string) => void;
  onSessionHover?: (date: string | null) => void;
  showAll?: boolean;
  highlightDate?: string | null;
  selectedDate?: string | null;
}

export function SessionTimeline({
  sessions,
  onSessionClick,
  onSessionHover,
  showAll = false,
  highlightDate,
  selectedDate,
}: SessionTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const recent = showAll
    ? [...sessions].reverse()
    : [...sessions].reverse().slice(0, 20);

  useEffect(() => {
    if (selectedDate && itemsRef.current[selectedDate]) {
      // Use requestAnimationFrame to ensure the DOM is ready and settled
      requestAnimationFrame(() => {
        itemsRef.current[selectedDate]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate && highlightDate && itemsRef.current[highlightDate]) {
      // Use requestAnimationFrame to ensure the DOM is ready and settled
      requestAnimationFrame(() => {
        itemsRef.current[highlightDate]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    }
  }, [highlightDate, selectedDate]);

  if (recent.length === 0) return null;

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-semibold">
          {showAll ? `Sessions (${recent.length})` : "Recent Sessions"}
        </h2>
        {showAll && (
          <p className="text-xs text-text-muted">
            {recent.reduce((sum, s) => sum + s.total_matches, 0)} total matches
          </p>
        )}
      </div>
      <div
        ref={containerRef}
        className="space-y-2 overflow-y-auto flex-1 custom-scrollbar"
      >
        {recent.map((s) => {
          const positive = s.net_delta >= 0;
          const label =
            s.organizer && s.location
              ? `${s.organizer} - ${s.location}`
              : s.organizer || s.location || s.event_name;
          const placeLabel =
            s.place != null ? (PLACE_LABELS[s.place] ?? `${s.place}th`) : null;
          const isHighlighted = highlightDate === s.date;
          const isSelected = selectedDate === s.date;

          return (
            <div
              key={s.date}
              ref={(el) => {
                itemsRef.current[s.date] = el;
              }}
              onClick={() => onSessionClick?.(s.date)}
              onMouseEnter={() => onSessionHover?.(s.date)}
              onMouseLeave={() => onSessionHover?.(null)}
              className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all ${
                positive ? "border-l-win bg-win/5" : "border-l-loss bg-loss/5"
              } ${isSelected ? "ring-2 ring-accent bg-accent/10 shadow-lg scale-[1.02]" : isHighlighted ? "ring-1 ring-accent/50 bg-bg-card-hover" : "hover:bg-bg-card-hover"}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">
                  {fmtDate(s.date)}
                </p>
                {placeLabel && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      s.place === 1
                        ? "bg-[#FFD700]/20 text-[#FFD700]"
                        : s.place === 2
                          ? "bg-[#C0C0C0]/20 text-[#C0C0C0]"
                          : "bg-[#CD7F32]/20 text-[#CD7F32]"
                    }`}
                  >
                    {placeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted truncate">{label}</p>
              {s.tournament_partner && (
                <p className="text-xs text-text-secondary truncate">
                  Partner: {s.tournament_partner}
                </p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-medium">
                  <span className="text-win">{s.wins}W</span>
                  {" - "}
                  <span className="text-loss">{s.losses}L</span>
                </span>
                <span
                  className={`text-xs font-mono ${
                    positive ? "text-win" : "text-loss"
                  }`}
                >
                  {fmtDelta(s.net_delta)}
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono">
                {fmtRating(s.start_rating)} &rarr; {fmtRating(s.end_rating)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
