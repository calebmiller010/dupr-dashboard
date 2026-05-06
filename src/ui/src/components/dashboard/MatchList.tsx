import { useState, useEffect, useRef, useMemo } from "react";
import type { MatchDetail, SessionGroup } from "../../types";
import { fmtDateShort, fmtDelta } from "../../utils/format";
import { MatchCard } from "./MatchCard";

export interface PersonFilter {
  name: string;
  role: "partner" | "opponent" | "any";
}

interface MatchListProps {
  matches: MatchDetail[];
  sessions: SessionGroup[];
  filterDate: string | null;
  filterPerson: PersonFilter | null;
  onFilterChange: (date: string | null) => void;
  onPersonFilterChange: (person: PersonFilter | null) => void;
  initialImpact?: string | null;
  initialContext?: string | null;
  initialOppTier?: string | null;
  initialYear?: string | null;
  initialOrganizer?: string | null;
  initialLocation?: string | null;
  initialPersonName?: string | null;
  initialPersonRole?: string | null;
  onClassificationClear?: () => void;
}

function matchHasPerson(match: MatchDetail, filter: PersonFilter): boolean {
  const targetTeam = match.players.find((p) => p.is_target)?.team;
  if (targetTeam == null) return false;
  return match.players.some((p) => {
    if (p.is_target || p.name !== filter.name) return false;
    if (filter.role === "any") return true;
    if (filter.role === "partner") return p.team === targetTeam;
    return p.team !== targetTeam;
  });
}

interface PersonOption {
  name: string;
  count: number;
  asPartner: number;
  asOpponent: number;
}

const PAGE_SIZES = [10, 20, 50];

function personFilterLabel(f: PersonFilter): string {
  if (f.role === "any") return f.name;
  return `${f.role === "partner" ? "w/" : "vs"} ${f.name}`;
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page numbers to show
  const pages: (number | "...")[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 py-2">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="px-2 py-1 text-xs rounded bg-bg-primary text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-1 text-xs text-text-muted">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              p === page
                ? "bg-accent text-bg-primary font-medium"
                : "bg-bg-primary text-text-secondary hover:text-text-primary"
            }`}
          >
            {p + 1}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="px-2 py-1 text-xs rounded bg-bg-primary text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors"
      >
        Next
      </button>
    </div>
  );
}

export function MatchList({
  matches,
  sessions,
  filterDate,
  filterPerson,
  onFilterChange,
  onPersonFilterChange,
  initialImpact,
  initialContext,
  initialOppTier,
  initialYear,
  initialOrganizer,
  initialLocation,
  initialPersonName,
  initialPersonRole,
  onClassificationClear,
}: MatchListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [personSearch, setPersonSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterImpact, setFilterImpact] = useState(initialImpact ?? "");
  const [filterContext, setFilterContext] = useState(initialContext ?? "");
  const [filterOppTier, setFilterOppTier] = useState(initialOppTier ?? "");
  const [filterYear, setFilterYear] = useState(initialYear ?? "");
  const [filterOrganizer, setFilterOrganizer] = useState(
    initialOrganizer ?? "",
  );
  const [filterLocation, setFilterLocation] = useState(initialLocation ?? "");
  const [showMoreFilters, setShowMoreFilters] = useState(
    !!(initialImpact || initialContext || initialOppTier),
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync from hash state when navigating from Analytics
  useEffect(() => {
    if (initialImpact != null) setFilterImpact(initialImpact);
    if (initialContext != null) setFilterContext(initialContext);
    if (initialOppTier != null) setFilterOppTier(initialOppTier);
    if (initialYear != null) setFilterYear(initialYear);
    if (initialOrganizer != null) setFilterOrganizer(initialOrganizer);
    if (initialLocation != null) setFilterLocation(initialLocation);
    if (initialPersonName) {
      onPersonFilterChange({
        name: initialPersonName,
        role: (initialPersonRole as "partner" | "opponent" | "any") || "any",
      });
    }
    if (initialImpact || initialContext || initialOppTier)
      setShowMoreFilters(true);
  }, [
    initialImpact,
    initialContext,
    initialOppTier,
    initialYear,
    initialOrganizer,
    initialLocation,
    initialPersonName,
    initialPersonRole,
  ]);

  useEffect(() => {
    setPage(0);
  }, [
    filterDate,
    filterPerson,
    pageSize,
    dateFrom,
    dateTo,
    filterImpact,
    filterContext,
    filterYear,
    filterOrganizer,
    filterLocation,
    filterOppTier,
  ]);

  useEffect(() => {
    if ((filterDate || filterPerson) && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [filterDate, filterPerson]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const personOptions = useMemo(() => {
    const counts: Record<string, { partner: number; opponent: number }> = {};
    for (const m of matches) {
      const targetTeam = m.players.find((p) => p.is_target)?.team;
      if (targetTeam == null) continue;
      for (const p of m.players) {
        if (p.is_target) continue;
        if (!counts[p.name]) counts[p.name] = { partner: 0, opponent: 0 };
        if (p.team === targetTeam) counts[p.name].partner++;
        else counts[p.name].opponent++;
      }
    }
    return Object.entries(counts)
      .map(
        ([name, c]): PersonOption => ({
          name,
          count: c.partner + c.opponent,
          asPartner: c.partner,
          asOpponent: c.opponent,
        }),
      )
      .sort((a, b) => b.count - a.count);
  }, [matches]);

  const filteredOptions = personSearch
    ? personOptions.filter((p) =>
        p.name.toLowerCase().includes(personSearch.toLowerCase()),
      )
    : personOptions;

  // Derive year/organizer/location from sessions
  const years = useMemo(() => {
    const ySet = new Set(sessions.map((s) => s.date.slice(0, 4)));
    return [...ySet].sort().reverse();
  }, [sessions]);

  const { organizers, organizerCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      if (s.organizer) counts[s.organizer] = (counts[s.organizer] ?? 0) + 1;
    }
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { organizers: sorted, organizerCounts: counts };
  }, [sessions]);

  const { locations, locationCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      if (s.location) counts[s.location] = (counts[s.location] ?? 0) + 1;
    }
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return { locations: sorted, locationCounts: counts };
  }, [sessions]);

  // Build set of matching session dates for year/organizer/location filters
  const allowedDates = useMemo(() => {
    if (!filterYear && !filterOrganizer && !filterLocation) return null;
    const matching = sessions.filter((s) => {
      if (filterYear && s.date.slice(0, 4) !== filterYear) return false;
      if (filterOrganizer && s.organizer !== filterOrganizer) return false;
      if (filterLocation && s.location !== filterLocation) return false;
      return true;
    });
    return new Set(matching.map((s) => s.date));
  }, [sessions, filterYear, filterOrganizer, filterLocation]);

  const reversed = [...matches].reverse();

  let filtered = reversed;
  if (allowedDates) {
    filtered = filtered.filter((m) => allowedDates.has(m.date));
  }
  if (filterDate) {
    filtered = filtered.filter((m) => m.date === filterDate);
  }
  if (filterPerson) {
    filtered = filtered.filter((m) => matchHasPerson(m, filterPerson));
  }
  if (dateFrom) {
    filtered = filtered.filter((m) => m.date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter((m) => m.date <= dateTo);
  }
  if (filterImpact) {
    filtered = filtered.filter((m) => m.narrative === filterImpact);
  }
  if (filterContext) {
    filtered = filtered.filter((m) => m.matchup_context === filterContext);
  }
  if (filterOppTier) {
    const TIER_RANGES: Record<string, { min: number; max: number }> = {
      "< 3.0": { min: 0, max: 3.0 },
      "3.0–3.5": { min: 3.0, max: 3.5 },
      "3.5–4.0": { min: 3.5, max: 4.0 },
      "4.0–4.5": { min: 4.0, max: 4.5 },
      "4.5+": { min: 4.5, max: 99 },
    };
    const tier = TIER_RANGES[filterOppTier];
    if (tier) {
      filtered = filtered.filter((m) => {
        const targetTeam = m.players.find((p) => p.is_target)?.team;
        const opponents = m.players.filter(
          (p) => !p.is_target && p.team !== targetTeam,
        );
        const oppRatings = opponents
          .map((p) => p.pre_rating)
          .filter((r): r is number => r != null);
        if (oppRatings.length === 0) return false;
        const avg = oppRatings.reduce((a, b) => a + b, 0) / oppRatings.length;
        return avg >= tier.min && avg < tier.max;
      });
    }
  }

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const dates = [...new Set(matches.map((m) => m.date))].sort().reverse();

  const hasMoreFilters = !!(
    dateFrom ||
    dateTo ||
    filterImpact ||
    filterContext ||
    filterDate ||
    filterOppTier
  );
  const hasActiveFilter =
    filterDate ||
    filterPerson ||
    filterYear ||
    filterOrganizer ||
    filterLocation ||
    dateFrom ||
    dateTo ||
    filterImpact ||
    filterContext ||
    filterOppTier;
  const filterLabelParts = [
    filterDate ? fmtDateShort(filterDate) : null,
    filterPerson ? personFilterLabel(filterPerson) : null,
  ].filter(Boolean);

  const selectPerson = (name: string, role: "partner" | "opponent" | "any") => {
    onPersonFilterChange({ name, role });
    setPersonSearch("");
    setShowDropdown(false);
  };

  const clearAll = () => {
    onFilterChange(null);
    onPersonFilterChange(null);
    setDateFrom("");
    setDateTo("");
    setFilterImpact("");
    setFilterContext("");
    setFilterOppTier("");
    setFilterYear("");
    setFilterOrganizer("");
    setFilterLocation("");
    onClassificationClear?.();
  };

  return (
    <div ref={ref} className="bg-bg-card rounded-xl p-4 border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold">
          Match History
          {filterLabelParts.length > 0 && (
            <span className="text-text-muted text-sm font-normal ml-2">
              ({filterLabelParts.join(" · ")})
            </span>
          )}
          <span className="text-text-muted text-sm font-normal ml-2">
            {filtered.length} match{filtered.length !== 1 ? "es" : ""}
          </span>
        </h2>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-4">
        {/* Quick filter pills + person search */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year pills */}
          <button
            onClick={() => setFilterYear("")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !filterYear
                ? "bg-accent text-bg-primary border-accent font-medium"
                : "bg-bg-primary text-text-secondary border-border hover:border-text-muted hover:text-text-primary"
            }`}
          >
            All Time
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setFilterYear(filterYear === y ? "" : y)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filterYear === y
                  ? "bg-accent text-bg-primary border-accent font-medium"
                  : "bg-bg-primary text-text-secondary border-border hover:border-text-muted hover:text-text-primary"
              }`}
            >
              {y}
            </button>
          ))}

          <span className="w-px h-5 bg-border mx-1" />

          {/* Top organizer pills (3+ sessions) */}
          {organizers
            .filter((o) => (organizerCounts[o] ?? 0) >= 3)
            .map((o) => (
              <button
                key={o}
                onClick={() =>
                  setFilterOrganizer(filterOrganizer === o ? "" : o)
                }
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filterOrganizer === o
                    ? "bg-accent text-bg-primary border-accent font-medium"
                    : "bg-bg-primary text-text-secondary border-border hover:border-text-muted hover:text-text-primary"
                }`}
              >
                {o}
              </button>
            ))}

          <span className="w-px h-5 bg-border mx-1" />

          {/* Top location pills (3+ sessions) */}
          {locations
            .filter((l) => (locationCounts[l] ?? 0) >= 3)
            .map((l) => (
              <button
                key={l}
                onClick={() => setFilterLocation(filterLocation === l ? "" : l)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  filterLocation === l
                    ? "bg-accent text-bg-primary border-accent font-medium"
                    : "bg-bg-primary text-text-secondary border-border hover:border-text-muted hover:text-text-primary"
                }`}
              >
                {l}
              </button>
            ))}

          <span className="w-px h-5 bg-border mx-1" />

          {/* Person search */}
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={
                filterPerson ? personFilterLabel(filterPerson) : personSearch
              }
              onChange={(e) => {
                if (filterPerson) onPersonFilterChange(null);
                setPersonSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Filter by person..."
              className="bg-bg-primary border border-border rounded-full px-3 py-1 text-xs text-text-primary placeholder:text-text-muted w-48 focus:outline-none focus:border-accent"
            />
            {filterPerson && (
              <button
                onClick={() => {
                  onPersonFilterChange(null);
                  setPersonSearch("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
              >
                &times;
              </button>
            )}
            {showDropdown && !filterPerson && filteredOptions.length > 0 && (
              <div className="absolute z-20 top-full left-0 mt-1 w-80 bg-bg-card border border-border rounded-lg shadow-xl max-h-72 overflow-y-auto">
                {filteredOptions.slice(0, 30).map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between px-3 py-2 hover:bg-bg-card-hover text-sm group"
                  >
                    <button
                      className="text-text-primary truncate text-left flex-1 cursor-pointer"
                      onClick={() => selectPerson(p.name, "any")}
                    >
                      {p.name}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-text-muted text-xs">
                        {p.count}g
                      </span>
                      {p.asPartner > 0 && (
                        <button
                          onClick={() => selectPerson(p.name, "partner")}
                          className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent hover:bg-accent/30"
                        >
                          w/ {p.asPartner}
                        </button>
                      )}
                      {p.asOpponent > 0 && (
                        <button
                          onClick={() => selectPerson(p.name, "opponent")}
                          className="text-xs px-1.5 py-0.5 rounded bg-loss/20 text-loss hover:bg-loss/30"
                        >
                          vs {p.asOpponent}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <span className="w-px h-5 bg-border mx-1" />

          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className={`text-xs transition-colors ${
              hasMoreFilters
                ? "text-accent hover:text-accent-dim"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {showMoreFilters ? "Less filters" : "More filters"}
            {hasMoreFilters && !showMoreFilters && " (active)"}
          </button>

          {hasActiveFilter && (
            <button
              onClick={clearAll}
              className="text-xs text-accent hover:text-accent-dim transition-colors ml-auto"
            >
              Clear all
            </button>
          )}

          {/* Page size — always visible */}
          {!hasActiveFilter && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-text-muted">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-bg-primary border border-border rounded-lg px-2 py-1 text-xs text-text-primary"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Expanded more filters */}
        {showMoreFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-3 bg-bg-primary rounded-lg border border-border">
            {/* Session dropdown (full list) */}
            <div>
              <label className="text-xs text-text-muted block mb-1">
                Session
              </label>
              <select
                value={filterDate ?? ""}
                onChange={(e) => onFilterChange(e.target.value || null)}
                className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary w-full appearance-none cursor-pointer hover:border-text-muted transition-colors"
              >
                <option value="">All</option>
                {dates.map((d) => {
                  const session = sessions.find((s) => s.date === d);
                  const label = session?.organizer
                    ? `${fmtDateShort(d)} - ${session.organizer}`
                    : fmtDateShort(d);
                  return (
                    <option key={d} value={d}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="text-xs text-text-muted block mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary w-full"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary w-full"
              />
            </div>

            {/* Classification filters */}
            <div>
              <label className="text-xs text-text-muted block mb-1">
                Rating Impact
              </label>
              <select
                value={filterImpact}
                onChange={(e) => setFilterImpact(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary w-full appearance-none cursor-pointer hover:border-text-muted transition-colors"
              >
                <option value="">All</option>
                <option value="Dominance">Dominance</option>
                <option value="Standard Win">Standard Win</option>
                <option value="Rough Win">Rough Win</option>
                <option value="The Grinder">The Grinder</option>
                <option value="Soft Loss">Soft Loss</option>
                <option value="Underperformance">Underperformance</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">
                Matchup Context
              </label>
              <select
                value={filterContext}
                onChange={(e) => setFilterContext(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary w-full appearance-none cursor-pointer hover:border-text-muted transition-colors"
              >
                <option value="">All</option>
                <option value="Big Underdog">Big Underdog</option>
                <option value="Slight Underdog">Slight Underdog</option>
                <option value="Even Match">Even Match</option>
                <option value="Slight Favorite">Slight Favorite</option>
                <option value="Big Favorite">Big Favorite</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">
                Opp. Rating Tier
              </label>
              <select
                value={filterOppTier}
                onChange={(e) => setFilterOppTier(e.target.value)}
                className="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary w-full appearance-none cursor-pointer hover:border-text-muted transition-colors"
              >
                <option value="">All</option>
                <option value="< 3.0">&lt; 3.0</option>
                <option value="3.0–3.5">3.0–3.5</option>
                <option value="3.5–4.0">3.5–4.0</option>
                <option value="4.0–4.5">4.0–4.5</option>
                <option value="4.5+">4.5+</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Pagination top */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Summary stats */}
      {filtered.length > 0 &&
        (() => {
          const wins = filtered.filter((m) => m.won).length;
          const losses = filtered.length - wins;
          const totalDelta = filtered.reduce(
            (sum, m) => sum + m.target_delta,
            0,
          );
          const label = filterPerson
            ? `${filtered.length} matches ${filterPerson.role === "partner" ? "with" : filterPerson.role === "opponent" ? "against" : "with/against"} `
            : `${filtered.length} matches`;
          return (
            <div className="mb-4 p-3 rounded-lg bg-bg-primary border border-border flex items-center justify-between flex-wrap gap-2 text-sm">
              <span className="text-text-primary font-medium">
                {label}
                {filterPerson && (
                  <span className="text-accent">{filterPerson.name}</span>
                )}
              </span>
              <div className="flex items-center gap-4">
                <span>
                  <span className="text-win font-medium">{wins}W</span>
                  {" - "}
                  <span className="text-loss font-medium">{losses}L</span>
                </span>
                <span
                  className={`font-medium ${totalDelta >= 0 ? "text-win" : "text-loss"}`}
                >
                  {fmtDelta(totalDelta)} total DUPR
                </span>
                <span className="text-text-muted">
                  ({fmtDelta(totalDelta / filtered.length)}/match)
                </span>
              </div>
            </div>
          );
        })()}

      {/* Match cards */}
      <div className="space-y-4">
        {paginated.length === 0 ? (
          <p className="text-text-muted text-center py-8">No matches found</p>
        ) : (
          paginated.map((m) => {
            const session = sessions.find((s) => s.date === m.date);
            return (
              <MatchCard
                key={m.match_id}
                match={m}
                showDate
                sessionLabel={
                  session?.location && session?.organizer
                    ? `${session.location} - ${session.organizer}`
                    : session?.location || session?.organizer || undefined
                }
              />
            );
          })
        )}
      </div>

      {/* Pagination bottom */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
