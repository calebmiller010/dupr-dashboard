import { useState, useEffect, useMemo } from "react";
import type { MatchDetail } from "../../types";
import {
  fetchSessions,
  overwriteSessions,
  fetchConfig,
  saveConfig,
} from "../../api";

function fmtT(v: number): string {
  return v.toFixed(3);
}

function ThresholdInput({
  label,
  value,
  onChange,
  step = 0.001,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const [display, setDisplay] = useState(fmtT(value));
  useEffect(() => {
    setDisplay(fmtT(value));
  }, [value]);

  return (
    <div className="inline-flex items-center border border-border rounded overflow-hidden">
      <button
        onClick={() => onChange(Math.round((value - step) * 1000) / 1000)}
        className="px-1.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
      >
        &minus;
      </button>
      <input
        type="text"
        value={display}
        onChange={(e) => {
          setDisplay(e.target.value);
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
        onBlur={() => setDisplay(fmtT(value))}
        title={label}
        className="w-16 bg-bg-card font-mono text-sm text-text-primary text-center focus:outline-none border-x border-border py-1"
      />
      <button
        onClick={() => onChange(Math.round((value + step) * 1000) / 1000)}
        className="px-1.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
      >
        +
      </button>
    </div>
  );
}

function computeDistribution(
  matches: MatchDetail[],
  impact: {
    dominance: number;
    empty_win: number;
    grinder: number;
    underperformance: number;
  },
  context: {
    big_underdog: number;
    slight_underdog: number;
    slight_favorite: number;
    big_favorite: number;
  },
) {
  const impactCounts: Record<string, number> = {};
  const contextCounts: Record<string, number> = {};

  for (const m of matches) {
    const won = m.won;
    const delta = m.target_delta;
    const gap = m.rating_gap;

    // Rating Impact
    let imp: string;
    if (won) {
      if (delta > impact.dominance) imp = "Dominance";
      else if (delta < impact.empty_win) imp = "Rough Win";
      else imp = "Standard Win";
    } else {
      if (delta > impact.grinder) imp = "The Grinder";
      else if (delta < impact.underperformance) imp = "Underperformance";
      else imp = "Soft Loss";
    }
    impactCounts[imp] = (impactCounts[imp] ?? 0) + 1;

    // Matchup Context
    let ctx: string;
    if (gap < context.big_underdog) ctx = "Big Underdog";
    else if (gap < context.slight_underdog) ctx = "Slight Underdog";
    else if (gap <= context.slight_favorite) ctx = "Even Match";
    else if (gap <= context.big_favorite) ctx = "Slight Favorite";
    else ctx = "Big Favorite";
    contextCounts[ctx] = (contextCounts[ctx] ?? 0) + 1;
  }

  return { impactCounts, contextCounts };
}

// const IMPACT_ORDER = [
//   "Dominance",
//   "Standard Win",
//   "Rough Win",
//   "The Grinder",
//   "Soft Loss",
//   "Underperformance",
// ];
const IMPACT_COLORS: Record<string, string> = {
  Dominance: "#22c55e",
  "Standard Win": "#94a3b8",
  "Rough Win": "#eab308",
  "The Grinder": "#3b82f6",
  "Soft Loss": "#6b7280",
  Underperformance: "#ef4444",
};
const CONTEXT_ORDER = [
  "Big Underdog",
  "Slight Underdog",
  "Even Match",
  "Slight Favorite",
  "Big Favorite",
];
const CONTEXT_COLORS: Record<string, string> = {
  "Big Underdog": "#a855f7",
  "Slight Underdog": "#818cf8",
  "Even Match": "#94a3b8",
  "Slight Favorite": "#fb923c",
  "Big Favorite": "#f97316",
};

function DistributionBar({
  items,
  colors,
  total,
}: {
  items: [string, number][];
  colors: Record<string, string>;
  total: number;
}) {
  return (
    <div className="space-y-1">
      {items.map(([name, count]) => (
        <div key={name} className="flex items-center gap-2 text-xs">
          <span
            className="w-28 text-right font-medium"
            style={{ color: colors[name] }}
          >
            {name}
          </span>
          <div className="flex-1 h-4 bg-bg-primary rounded overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: `${total > 0 ? (count / total) * 100 : 0}%`,
                backgroundColor: colors[name],
                opacity: 0.7,
              }}
            />
          </div>
          <span className="w-8 text-right text-text-muted">{count}</span>
          <span className="w-10 text-right text-text-muted">
            {total > 0 ? `${Math.round((count / total) * 100)}%` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function validateConfig(config: any): string[] {
  const errors: string[] = [];
  const i = config?.thresholds?.impact;
  const c = config?.thresholds?.context;
  if (!i || !c) return ["Invalid config structure"];
  if (i.empty_win >= i.dominance)
    errors.push("Rough Win must be less than Dominance");
  if (i.underperformance >= i.grinder)
    errors.push("Underperformance must be less than The Grinder");
  if (
    c.big_underdog >= c.slight_underdog ||
    c.slight_underdog >= c.slight_favorite ||
    c.slight_favorite >= c.big_favorite
  )
    errors.push("Context boundaries must be in ascending order");
  return errors;
}

export function ConfigTab({
  matchDetails,
  adminSecret,
  readOnly = false,
}: {
  matchDetails: MatchDetail[];
  adminSecret?: string;
  readOnly?: boolean;
}) {
  const [sessionsRaw, setSessionsRaw] = useState("");
  const [sessionsOriginal, setSessionsOriginal] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsSaving, setSessionsSaving] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsSuccess, setSessionsSuccess] = useState(false);
  const [showSessionsConfirm, setShowSessionsConfirm] = useState(false);

  const [config, setConfig] = useState<any>(null);
  const [configOriginal, setConfigOriginal] = useState<string>("");
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);

  useEffect(() => {
    setSessionsLoading(true);
    fetchSessions()
      .then((info) => {
        const formatted = JSON.stringify(info.sessions, null, 2);
        setSessionsRaw(formatted);
        setSessionsOriginal(formatted);
      })
      .catch((e) => setSessionsError(e.message))
      .finally(() => setSessionsLoading(false));

    setConfigLoading(true);
    fetchConfig()
      .then((cfg) => {
        setConfig(cfg);
        setConfigOriginal(JSON.stringify(cfg));
      })
      .catch((e) => setConfigError(e.message))
      .finally(() => setConfigLoading(false));
  }, []);

  const sessionsChanged = sessionsRaw !== sessionsOriginal;
  const sessionsValidJson = (() => {
    try {
      JSON.parse(sessionsRaw);
      return true;
    } catch {
      return false;
    }
  })();
  const configChanged = config && JSON.stringify(config) !== configOriginal;
  const configValidation = config ? validateConfig(config) : [];
  const configValid = configValidation.length === 0;

  // Live distribution preview
  const distribution = useMemo(() => {
    if (!config || !configValid) return null;
    return computeDistribution(
      matchDetails,
      config.thresholds.impact,
      config.thresholds.context,
    );
  }, [config, configValid, matchDetails]);

  const handleSessionsSave = async () => {
    setShowSessionsConfirm(false);
    setSessionsSaving(true);
    setSessionsError(null);
    setSessionsSuccess(false);
    try {
      await overwriteSessions(JSON.parse(sessionsRaw), adminSecret);
      setSessionsOriginal(sessionsRaw);
      setSessionsSuccess(true);
      setTimeout(() => setSessionsSuccess(false), 3000);
    } catch (e) {
      setSessionsError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSessionsSaving(false);
    }
  };

  const handleConfigSave = async () => {
    setConfigSaving(true);
    setConfigError(null);
    setConfigSuccess(false);
    try {
      await saveConfig(config, adminSecret);
      setConfigOriginal(JSON.stringify(config));
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setConfigSaving(false);
    }
  };

  const updateImpact = (key: string, val: number) => {
    setConfig((p: any) => ({
      ...p,
      thresholds: {
        ...p.thresholds,
        impact: { ...p.thresholds.impact, [key]: val },
      },
    }));
  };
  const updateContext = (key: string, val: number) => {
    setConfig((p: any) => ({
      ...p,
      thresholds: {
        ...p.thresholds,
        context: { ...p.thresholds.context, [key]: val },
      },
    }));
  };

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Read-only mode. Changes must be made locally and redeployed.
        </div>
      )}
      <div className="bg-bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Classification Thresholds</h2>
            <p className="text-xs text-text-muted mt-1">
              Adjust how matches are classified. Changes trigger a full
              reprocess.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {configChanged && (
              <button
                onClick={() => {
                  setConfig(JSON.parse(configOriginal));
                  setConfigError(null);
                }}
                className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Revert
              </button>
            )}
            <button
              onClick={handleConfigSave}
              disabled={readOnly || !configChanged || !configValid || configSaving}
              className="px-4 py-1.5 bg-accent text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {configSaving ? "Saving..." : "Save & Reprocess"}
            </button>
          </div>
        </div>

        {configError && (
          <div className="mb-3 p-2 rounded-lg bg-loss/10 border border-loss/20 text-loss text-sm">
            {configError}
          </div>
        )}
        {configSuccess && (
          <div className="mb-3 p-2 rounded-lg bg-win/10 border border-win/20 text-win text-sm">
            Thresholds saved and analytics reprocessed.
          </div>
        )}
        {configValidation.length > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm space-y-1">
            {configValidation.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        {!configLoading && config && (
          <div className="space-y-6">
            {/* Rating Impact */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Rating Impact (DUPR Delta)
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Define the "expected" ranges. Anything outside becomes an
                outlier.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Wins scale */}
                <div className="bg-bg-primary rounded-lg p-4">
                  <h4 className="text-sm font-medium text-text-primary mb-3">
                    Wins
                  </h4>
                  <div className="grid grid-cols-3 mb-2">
                    <span className="text-xs text-[#eab308] font-bold text-center">
                      Rough Win
                    </span>
                    <span className="text-xs text-[#94a3b8] font-bold text-center">
                      Standard Win
                    </span>
                    <span className="text-xs text-[#22c55e] font-bold text-center">
                      Dominance
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden flex mb-2">
                    <div className="flex-1 bg-[#eab308]/40" />
                    <div className="flex-1 bg-[#94a3b8]/30" />
                    <div className="flex-1 bg-[#22c55e]/40" />
                  </div>
                  <div className="relative h-14">
                    <div
                      className="absolute text-center"
                      style={{ left: "33.3%", transform: "translateX(-50%)" }}
                    >
                      <p className="text-xs text-text-muted mb-1">&le;</p>
                      <ThresholdInput
                        label="Rough Win threshold"
                        value={config.thresholds.impact.empty_win}
                        onChange={(v) => updateImpact("empty_win", v)}
                      />
                    </div>
                    <div
                      className="absolute text-center"
                      style={{ left: "66.6%", transform: "translateX(-50%)" }}
                    >
                      <p className="text-xs text-text-muted mb-1">&le;</p>
                      <ThresholdInput
                        label="Dominance threshold"
                        value={config.thresholds.impact.dominance}
                        onChange={(v) => updateImpact("dominance", v)}
                      />
                    </div>
                  </div>
                </div>

                {/* Losses scale */}
                <div className="bg-bg-primary rounded-lg p-4">
                  <h4 className="text-sm font-medium text-text-primary mb-3">
                    Losses
                  </h4>
                  <div className="grid grid-cols-3 mb-2">
                    <span className="text-xs text-[#ef4444] font-bold text-center">
                      Underperformance
                    </span>
                    <span className="text-xs text-[#6b7280] font-bold text-center">
                      Soft Loss
                    </span>
                    <span className="text-xs text-[#3b82f6] font-bold text-center">
                      The Grinder
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden flex mb-2">
                    <div className="flex-1 bg-[#ef4444]/40" />
                    <div className="flex-1 bg-[#6b7280]/30" />
                    <div className="flex-1 bg-[#3b82f6]/40" />
                  </div>
                  <div className="relative h-14">
                    <div
                      className="absolute text-center"
                      style={{ left: "33.3%", transform: "translateX(-50%)" }}
                    >
                      <p className="text-xs text-text-muted mb-1">&le;</p>
                      <ThresholdInput
                        label="Underperformance threshold"
                        value={config.thresholds.impact.underperformance}
                        onChange={(v) => updateImpact("underperformance", v)}
                      />
                    </div>
                    <div
                      className="absolute text-center"
                      style={{ left: "66.6%", transform: "translateX(-50%)" }}
                    >
                      <p className="text-xs text-text-muted mb-1">&le;</p>
                      <ThresholdInput
                        label="Grinder threshold"
                        value={config.thresholds.impact.grinder}
                        onChange={(v) => updateImpact("grinder", v)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live distribution — grouped by wins/losses */}
              {distribution && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
                      Wins (
                      {(distribution.impactCounts["Dominance"] ?? 0) +
                        (distribution.impactCounts["Standard Win"] ?? 0) +
                        (distribution.impactCounts["Rough Win"] ?? 0)}
                      )
                    </h4>
                    <DistributionBar
                      items={["Rough Win", "Standard Win", "Dominance"].map(
                        (k) => [k, distribution.impactCounts[k] ?? 0],
                      )}
                      colors={IMPACT_COLORS}
                      total={matchDetails.length}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
                      Losses (
                      {(distribution.impactCounts["The Grinder"] ?? 0) +
                        (distribution.impactCounts["Soft Loss"] ?? 0) +
                        (distribution.impactCounts["Underperformance"] ?? 0)}
                      )
                    </h4>
                    <DistributionBar
                      items={[
                        "Underperformance",
                        "Soft Loss",
                        "The Grinder",
                      ].map((k) => [k, distribution.impactCounts[k] ?? 0])}
                      colors={IMPACT_COLORS}
                      total={matchDetails.length}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Matchup Context */}
            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Matchup Context (Total DUPR Gap)
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Your team's combined DUPR - opponent team's combined DUPR
              </p>

              <div className="bg-bg-primary rounded-lg p-4">
                {/* Labels positioned over each segment */}
                <div className="grid grid-cols-5 mb-2">
                  <span className="text-xs text-[#a855f7] font-bold text-center">
                    Big Underdog
                  </span>
                  <span className="text-xs text-[#818cf8] font-bold text-center">
                    Slight Underdog
                  </span>
                  <span className="text-xs text-text-muted font-bold text-center">
                    Even Match
                  </span>
                  <span className="text-xs text-[#fb923c] font-bold text-center">
                    Slight Favorite
                  </span>
                  <span className="text-xs text-[#f97316] font-bold text-center">
                    Big Favorite
                  </span>
                </div>
                {/* Color bar */}
                <div className="relative h-3 rounded-full overflow-hidden flex mb-2">
                  <div className="flex-1 bg-[#a855f7]/40" />
                  <div className="flex-1 bg-[#818cf8]/40" />
                  <div className="flex-1 bg-text-muted/20" />
                  <div className="flex-1 bg-[#fb923c]/40" />
                  <div className="flex-1 bg-[#f97316]/40" />
                </div>
                {/* Inputs aligned to the 4 transition points (20%, 40%, 60%, 80%) */}
                <div className="relative h-14">
                  <div
                    className="absolute text-center"
                    style={{ left: "20%", transform: "translateX(-50%)" }}
                  >
                    <p className="text-xs text-text-muted mb-1">&le;</p>
                    <ThresholdInput
                      label="Big Underdog"
                      value={config.thresholds.context.big_underdog}
                      onChange={(v) => updateContext("big_underdog", v)}
                      step={0.01}
                    />
                  </div>
                  <div
                    className="absolute text-center"
                    style={{ left: "40%", transform: "translateX(-50%)" }}
                  >
                    <p className="text-xs text-text-muted mb-1">&le;</p>
                    <ThresholdInput
                      label="Slight Underdog"
                      value={config.thresholds.context.slight_underdog}
                      onChange={(v) => updateContext("slight_underdog", v)}
                      step={0.01}
                    />
                  </div>
                  <div
                    className="absolute text-center"
                    style={{ left: "60%", transform: "translateX(-50%)" }}
                  >
                    <p className="text-xs text-text-muted mb-1">&le;</p>
                    <ThresholdInput
                      label="Slight Favorite"
                      value={config.thresholds.context.slight_favorite}
                      onChange={(v) => updateContext("slight_favorite", v)}
                      step={0.01}
                    />
                  </div>
                  <div
                    className="absolute text-center"
                    style={{ left: "80%", transform: "translateX(-50%)" }}
                  >
                    <p className="text-xs text-text-muted mb-1">&le;</p>
                    <ThresholdInput
                      label="Big Favorite"
                      value={config.thresholds.context.big_favorite}
                      onChange={(v) => updateContext("big_favorite", v)}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>

              {/* Live distribution */}
              {distribution && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
                    Preview Distribution ({matchDetails.length} matches)
                  </h4>
                  <DistributionBar
                    items={CONTEXT_ORDER.map((k) => [
                      k,
                      distribution.contextCounts[k] ?? 0,
                    ])}
                    colors={CONTEXT_COLORS}
                    total={matchDetails.length}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sessions JSON editor */}
      <div className="bg-bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Session Data</h2>
            <p className="text-xs text-text-muted mt-1">
              Edit sessions.json directly.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sessionsChanged && (
              <button
                onClick={() => {
                  setSessionsRaw(sessionsOriginal);
                  setSessionsError(null);
                }}
                className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Revert
              </button>
            )}
            <button
              onClick={() => setShowSessionsConfirm(true)}
              disabled={
                readOnly || !sessionsChanged || !sessionsValidJson || sessionsSaving
              }
              className="px-4 py-1.5 bg-accent text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {sessionsSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        {sessionsError && (
          <div className="mb-3 p-2 rounded-lg bg-loss/10 border border-loss/20 text-loss text-sm">
            {sessionsError}
          </div>
        )}
        {sessionsSuccess && (
          <div className="mb-3 p-2 rounded-lg bg-win/10 border border-win/20 text-win text-sm">
            Sessions saved.
          </div>
        )}
        {!sessionsValidJson && sessionsChanged && (
          <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
            Invalid JSON
          </div>
        )}
        {!sessionsLoading && (
          <textarea
            value={sessionsRaw}
            onChange={(e) => setSessionsRaw(e.target.value)}
            spellCheck={false}
            className="w-full h-[40vh] bg-bg-primary border border-border rounded-lg p-4 font-mono text-sm text-text-primary resize-y focus:outline-none focus:border-accent custom-scrollbar"
          />
        )}
      </div>

      {showSessionsConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-bg-card border border-border rounded-xl shadow-2xl p-6 max-w-md m-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Confirm Changes
            </h3>
            <p className="text-sm text-text-muted mb-4">
              This will overwrite sessions.json and reprocess all analytics.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSessionsConfirm(false)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSessionsSave}
                className="px-4 py-2 bg-accent text-bg-primary rounded-lg text-sm font-medium hover:bg-accent-dim transition-colors"
              >
                Yes, Save & Reprocess
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
