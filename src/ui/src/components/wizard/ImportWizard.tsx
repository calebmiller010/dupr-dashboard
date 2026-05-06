import { useState, useEffect } from "react";
import type { NewSessionPreview, SessionsInfo } from "../../types";
import { fetchSessions, saveSessions } from "../../api";
import { SessionCard } from "./SessionCard";

interface SessionAnnotation {
  organizer: string;
  location: string;
  format: string;
  tournament_partner: string;
  place: number | null;
  notes: string;
}

interface ImportWizardProps {
  sessions: NewSessionPreview[];
  onComplete: () => void;
  onSkip: () => void;
  adminSecret?: string;
}

export function ImportWizard({
  sessions,
  onComplete,
  onSkip,
  adminSecret,
}: ImportWizardProps) {
  const [annotations, setAnnotations] = useState<
    Record<string, SessionAnnotation>
  >({});
  const [suggestions, setSuggestions] = useState<{
    organizers: string[];
    locations: string[];
  }>({ organizers: [], locations: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init: Record<string, SessionAnnotation> = {};
    for (const s of sessions) {
      init[s.date] = {
        organizer: s.suggested_organizer,
        location: s.suggested_location,
        format: "",
        tournament_partner: s.suggested_partner,
        place: null,
        notes: "",
      };
    }
    setAnnotations(init);

    fetchSessions().then((info: SessionsInfo) => {
      setSuggestions(info.suggestions);
    });
  }, [sessions]);

  const allOrganizers = [
    ...new Set([
      ...suggestions.organizers,
      ...Object.values(annotations)
        .map((a) => a.organizer)
        .filter(Boolean),
    ]),
  ].sort();
  const allLocations = [
    ...new Set([
      ...suggestions.locations,
      ...Object.values(annotations)
        .map((a) => a.location)
        .filter(Boolean),
    ]),
  ].sort();
  const allFormats = [
    ...new Set(
      Object.values(annotations)
        .map((a) => a.format)
        .filter(Boolean),
    ),
    "Mixed",
    "Fixed",
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSessions(annotations, adminSecret);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-primary border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col m-4">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Review New Sessions
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {sessions.length} new session{sessions.length !== 1 ? "s" : ""}{" "}
            found. Set the details for each.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sessions.map((s) => (
            <SessionCard
              key={s.date}
              session={s}
              annotation={
                annotations[s.date] ?? {
                  organizer: "",
                  location: "",
                  format: "",
                  tournament_partner: "",
                  place: null,
                  notes: "",
                }
              }
              onChange={(a) =>
                setAnnotations((prev) => ({ ...prev, [s.date]: a }))
              }
              organizerSuggestions={allOrganizers}
              locationSuggestions={allLocations}
              formatSuggestions={allFormats}
            />
          ))}
        </div>

        <div className="p-5 border-t border-border flex justify-end gap-3">
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm text-text-muted hover:text-loss transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Process"}
          </button>
        </div>
      </div>
    </div>
  );
}
