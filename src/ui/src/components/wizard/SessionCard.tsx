import type { NewSessionPreview } from "../../types";
import { fmtDate } from "../../utils/format";
import { ComboBox } from "./ComboBox";

interface SessionAnnotation {
  organizer: string;
  location: string;
  format: string;
  tournament_partner: string;
  place: number | null;
  notes: string;
}

interface SessionCardProps {
  session: NewSessionPreview;
  annotation: SessionAnnotation;
  onChange: (a: SessionAnnotation) => void;
  organizerSuggestions: string[];
  locationSuggestions: string[];
  formatSuggestions: string[];
}

export function SessionCard({
  session,
  annotation,
  onChange,
  organizerSuggestions,
  locationSuggestions,
  formatSuggestions,
}: SessionCardProps) {
  const update = (partial: Partial<SessionAnnotation>) =>
    onChange({ ...annotation, ...partial });

  return (
    <div className="bg-bg-card rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-text-primary">
            {fmtDate(session.date)}
          </p>
          <p className="text-xs text-text-muted truncate max-w-sm">
            {session.event_name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm">
            <span className="text-win">{session.wins}W</span>
            {" - "}
            <span className="text-loss">{session.losses}L</span>
          </p>
          <p className="text-xs text-text-muted">
            {session.match_count} matches
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-muted block mb-1">
            Organizer
          </label>
          <ComboBox
            id={`org-${session.date}`}
            value={annotation.organizer}
            onChange={(v) => update({ organizer: v })}
            suggestions={organizerSuggestions}
            placeholder="e.g. AOP"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Location</label>
          <ComboBox
            id={`loc-${session.date}`}
            value={annotation.location}
            onChange={(v) => update({ location: v })}
            suggestions={locationSuggestions}
            placeholder="e.g. Genesis Merriam"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Format</label>
          <ComboBox
            id={`fmt-${session.date}`}
            value={annotation.format}
            onChange={(v) => update({ format: v })}
            suggestions={formatSuggestions}
            placeholder="e.g. Mixed"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted block mb-1">Place</label>
          <input
            type="number"
            min={1}
            value={annotation.place ?? ""}
            onChange={(e) =>
              update({
                place: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="e.g. 1"
            className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-text-muted block mb-1">
          Tournament Partner
        </label>
        <input
          type="text"
          value={annotation.tournament_partner}
          onChange={(e) => update({ tournament_partner: e.target.value })}
          placeholder="e.g. Sarae Evans"
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="text-xs text-text-muted block mb-1">Notes</label>
        <input
          type="text"
          value={annotation.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Optional notes"
          className="w-full bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
      </div>

      <div className="space-y-1">
        {session.matches.map((m) => (
          <div
            key={m.match_id}
            className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
              m.won ? "bg-win/10 text-win" : "bg-loss/10 text-loss"
            }`}
          >
            <span>
              {m.won ? "W" : "L"} w/ {m.partner || "\u2014"}
            </span>
            <span className="text-text-secondary">
              vs {m.opponents.join(" & ")} ({m.score})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
