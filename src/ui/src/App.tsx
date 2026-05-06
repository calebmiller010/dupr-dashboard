import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useAnalytics } from "./hooks/useAnalytics";
import { useHashState } from "./hooks/useHashState";
import { useAdmin } from "./hooks/useAdmin";
import { triggerSync, cancelSync } from "./api";
import type { NewSessionPreview, PlayerAnalytics } from "./types";
import { Shell } from "./components/layout/Shell";
import { HeroStats } from "./components/dashboard/HeroStats";
import {
  RecentTrend,
  AllTimeStats,
  RecentSessions,
} from "./components/dashboard/OverviewStats";
import { RatingChart } from "./components/dashboard/RatingChart";

import { SessionTimeline } from "./components/dashboard/SessionTimeline";
import { MatchList, type PersonFilter } from "./components/dashboard/MatchList";
import { PlacementChart } from "./components/dashboard/PlacementChart";
import { SessionDeltaChart } from "./components/dashboard/SessionDeltaChart";
import { SessionWLChart } from "./components/dashboard/SessionWLChart";
import { SessionFilters } from "./components/dashboard/SessionFilters";

import { PartnerLeaderboard } from "./components/people/PartnerLeaderboard";
import { OpponentList } from "./components/people/OpponentList";

import { ImportWizard } from "./components/wizard/ImportWizard";

import { NarrativeTooltip } from "./components/common/NarrativeTooltip";
import { ConfigTab } from "./components/dashboard/ConfigTab";
import { ClassificationMatrix } from "./components/dashboard/ClassificationMatrix";

const TABS = [
  "Overview",
  "Sessions",
  "Matches",
  "Partners & Opponents",
  "Analytics",
  "Config",
];

// ─── Tab Content Components ─────────────────────────────

function OverviewTab({ data }: { data: PlayerAnalytics }) {
  return (
    <>
      <HeroStats data={data} />
      <RecentTrend data={data} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllTimeStats data={data} />
        <RecentSessions data={data} />
      </div>
    </>
  );
}

function SessionsTab({
  data,
  onSessionClick: externalOnSessionClick,
}: {
  data: PlayerAnalytics;
  onSessionClick: (date: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [brushRange, setBrushRange] = useState<[number, number] | undefined>(
    undefined,
  );
  const [visibleDates, setVisibleDates] = useState<[string, string] | null>(
    null,
  );
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterOrganizer, setFilterOrganizer] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterFormat, setFilterFormat] = useState<string>("");

  const filtered = useMemo(() => {
    return data.sessions.filter((s) => {
      if (filterYear && !s.date.startsWith(filterYear)) return false;
      if (filterOrganizer && s.organizer !== filterOrganizer) return false;
      if (filterLocation && s.location !== filterLocation) return false;
      if (filterFormat && s.format !== filterFormat) return false;
      return true;
    });
  }, [data.sessions, filterYear, filterOrganizer, filterLocation, filterFormat]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedDate(null);
  }, [filtered]);

  const onSessionClick = useCallback((date: string) => {
    console.log("[SessionsTab] onSessionClick received date:", date);
    setSelectedDate(date);
  }, []);

  const onSessionDoubleClick = useCallback((date: string) => {
    externalOnSessionClick(date);
  }, [externalOnSessionClick]);

  const years = [...new Set(data.sessions.map((s) => s.date.slice(0, 4)))]
    .sort()
    .reverse();
  const organizers = [
    ...new Set(data.sessions.map((s) => s.organizer).filter(Boolean)),
  ].sort();
  const locations = [
    ...new Set(data.sessions.map((s) => s.location).filter(Boolean)),
  ].sort();
  const formats = [
    ...new Set(data.sessions.map((s) => s.format).filter(Boolean)),
  ].sort();

  const organizerCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};
  for (const s of data.sessions) {
    if (s.organizer)
      organizerCounts[s.organizer] = (organizerCounts[s.organizer] ?? 0) + 1;
    if (s.location)
      locationCounts[s.location] = (locationCounts[s.location] ?? 0) + 1;
  }

  const resetBrush = useCallback(() => {
    setBrushRange(undefined);
    setVisibleDates(null);
  }, []);

  const clearAll = () => {
    setFilterYear("");
    setFilterOrganizer("");
    setFilterLocation("");
    setFilterFormat("");
    resetBrush();
  };

  const handleBrushChange = useCallback((r: [number, number]) => {
    setBrushRange(r);
  }, []);

  const handleVisibleDatesChange = useCallback((s: string, e: string) => {
    setVisibleDates((prev) => {
      if (prev && prev[0] === s && prev[1] === e) return prev;
      return [s, e];
    });
  }, []);

  return (
    <>
      <SessionFilters
        years={years}
        organizers={organizers}
        locations={locations}
        formats={formats}
        organizerCounts={organizerCounts}
        locationCounts={locationCounts}
        filterYear={filterYear}
        filterOrganizer={filterOrganizer}
        filterLocation={filterLocation}
        filterFormat={filterFormat}
        onYearChange={(v) => {
          setFilterYear(v);
          resetBrush();
        }}
        onOrganizerChange={(v) => {
          setFilterOrganizer(v);
          resetBrush();
        }}
        onLocationChange={(v) => {
          setFilterLocation(v);
          resetBrush();
        }}
        onFormatChange={(v) => {
          setFilterFormat(v);
          resetBrush();
        }}
        onClear={clearAll}
      />

      <div className="flex gap-6">
        {/* Sidebar — scrollable independently, sticky */}
        <div
          className="w-80 shrink-0 sticky top-20"
          style={{ height: "calc(100vh - 140px)" }}
        >
          <SessionTimeline
            sessions={filtered}
            onSessionClick={onSessionDoubleClick}
            onSessionHover={setHoverDate}
            highlightDate={hoverDate}
            selectedDate={selectedDate}
            showAll
          />
        </div>
        {/* Charts — normal page scroll */}
        <div className="flex-1 space-y-6 min-w-0">
          <RatingChart
            sessions={filtered}
            onSessionClick={onSessionClick}
            highlightDate={hoverDate}
            onSessionHover={setHoverDate}
            brushRange={brushRange}
            onBrushChange={handleBrushChange}
            onVisibleDatesChange={handleVisibleDatesChange}
          />
          <SessionDeltaChart
            sessions={filtered}
            onSessionClick={onSessionClick}
            highlightDate={hoverDate}
            onSessionHover={setHoverDate}
            visibleDateRange={visibleDates}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SessionWLChart
              sessions={filtered}
              onSessionClick={onSessionClick}
              highlightDate={hoverDate}
              onSessionHover={setHoverDate}
              visibleDateRange={visibleDates}
            />
            <PlacementChart
              sessions={filtered}
              visibleDateRange={visibleDates}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function MatchesTab({
  data,
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
}: {
  data: PlayerAnalytics;
  filterDate: string | null;
  filterPerson: PersonFilter | null;
  onFilterChange: (date: string | null) => void;
  onPersonFilterChange: (person: PersonFilter | null) => void;
  initialImpact: string | null;
  initialContext: string | null;
  initialOppTier: string | null;
  initialYear: string | null;
  initialOrganizer: string | null;
  initialLocation: string | null;
  initialPersonName: string | null;
  initialPersonRole: string | null;
  onClassificationClear: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <NarrativeTooltip
          counts={data.narratives}
          contextCounts={data.matchup_contexts}
          thresholds={data.thresholds}
        />
      </div>
      <MatchList
        matches={data.match_details}
        sessions={data.sessions}
        filterDate={filterDate}
        filterPerson={filterPerson}
        onFilterChange={onFilterChange}
        onPersonFilterChange={onPersonFilterChange}
        initialImpact={initialImpact}
        initialContext={initialContext}
        initialOppTier={initialOppTier}
        initialYear={initialYear}
        initialOrganizer={initialOrganizer}
        initialLocation={initialLocation}
        initialPersonName={initialPersonName}
        initialPersonRole={initialPersonRole}
        onClassificationClear={onClassificationClear}
      />
    </div>
  );
}

function SegmentedControl({
  options,
  active,
  onChange,
}: {
  options: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-bg-primary p-0.5 text-xs">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-md transition-colors ${
            active === opt
              ? "bg-bg-card-hover text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function PartnersTab({
  data,
  onViewPartnerMatches,
  onViewOpponentMatches,
  minGames,
  onMinGamesChange,
}: {
  data: PlayerAnalytics;
  onViewPartnerMatches: (name: string) => void;
  onViewOpponentMatches: (name: string) => void;
  minGames: number;
  onMinGamesChange: (n: number) => void;
}) {
  const [filter, setFilter] = useState<string>("");
  const peopleKeys = Object.keys(data.people);
  const activeFilter =
    filter && data.people[filter] ? filter : (peopleKeys[0] ?? "All Time");
  const active = data.people[activeFilter] ?? {
    top_partners: [],
    worst_partners: [],
    kryptonite_opponents: [],
    feast_opponents: [],
  };

  const filteredPartners = active.top_partners.filter(
    (p) => p.matches >= minGames,
  );
  const filteredWorst = active.worst_partners.filter(
    (p) => p.matches >= minGames,
  );
  const filteredKryptonite = active.kryptonite_opponents.filter(
    (o) => o.matches >= minGames,
  );
  const filteredFeast = active.feast_opponents.filter(
    (o) => o.matches >= minGames,
  );

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Partners & Opponents</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted">Min games</span>
            <input
              type="number"
              min={1}
              value={minGames}
              onChange={(e) =>
                onMinGamesChange(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-14 bg-bg-primary border border-border rounded-lg px-2 py-1 text-sm text-text-primary text-center"
            />
          </div>
          {peopleKeys.length > 1 && (
            <SegmentedControl
              options={peopleKeys}
              active={activeFilter}
              onChange={setFilter}
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PartnerLeaderboard
          title="Best Partners"
          partners={filteredPartners}
          onViewMatches={onViewPartnerMatches}
        />
        <PartnerLeaderboard
          title="Worst Partners"
          partners={filteredWorst}
          variant="worst"
          onViewMatches={onViewPartnerMatches}
        />
        <OpponentList
          title="Kryptonite"
          opponents={filteredKryptonite}
          variant="kryptonite"
          onViewMatches={onViewOpponentMatches}
        />
        <OpponentList
          title="Feast"
          opponents={filteredFeast}
          variant="feast"
          onViewMatches={onViewOpponentMatches}
        />
      </div>
    </>
  );
}

interface MatchFilterOpts {
  impact?: string | null;
  context?: string | null;
  oppTier?: string | null;
  year?: string | null;
  organizer?: string | null;
  location?: string | null;
  person?: string | null;
  role?: string | null;
}

function AnalyticsTab({
  data,
  onViewMatches,
}: {
  data: PlayerAnalytics;
  onViewMatches: (opts: MatchFilterOpts) => void;
}) {
  const [filterYear, setFilterYear] = useState("");
  const [filterOrganizer, setFilterOrganizer] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [filterRole, setFilterRole] = useState<"any" | "partner" | "opponent">(
    "any",
  );
  const [personSearch, setPersonSearch] = useState("");
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterImpact, setFilterImpact] = useState("");
  const [filterContext, setFilterContext] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const personDropdownRef = React.useRef<HTMLDivElement>(null);

  const sessions = data.sessions;
  const allMatches = data.match_details;

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        personDropdownRef.current &&
        !personDropdownRef.current.contains(e.target as Node)
      ) {
        setShowPersonDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  const personOptions = useMemo(() => {
    const counts: Record<string, { partner: number; opponent: number }> = {};
    for (const m of allMatches) {
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
      .map(([name, c]) => ({
        name,
        count: c.partner + c.opponent,
        asPartner: c.partner,
        asOpponent: c.opponent,
      }))
      .sort((a, b) => b.count - a.count);
  }, [allMatches]);

  const filteredPersonOptions = personSearch
    ? personOptions.filter((p) =>
        p.name.toLowerCase().includes(personSearch.toLowerCase()),
      )
    : personOptions;

  const filteredMatches = useMemo(() => {
    let result = allMatches;

    // Year/organizer/location
    if (filterYear || filterOrganizer || filterLocation) {
      const allowedDates = new Set(
        sessions
          .filter((s) => {
            if (filterYear && s.date.slice(0, 4) !== filterYear) return false;
            if (filterOrganizer && s.organizer !== filterOrganizer)
              return false;
            if (filterLocation && s.location !== filterLocation) return false;
            return true;
          })
          .map((s) => s.date),
      );
      result = result.filter((m) => allowedDates.has(m.date));
    }

    // Person
    if (filterPerson) {
      result = result.filter((m) => {
        const targetTeam = m.players.find((p) => p.is_target)?.team;
        if (targetTeam == null) return false;
        return m.players.some((p) => {
          if (p.is_target || p.name !== filterPerson) return false;
          if (filterRole === "any") return true;
          if (filterRole === "partner") return p.team === targetTeam;
          return p.team !== targetTeam;
        });
      });
    }

    // Date range
    if (dateFrom) result = result.filter((m) => m.date >= dateFrom);
    if (dateTo) result = result.filter((m) => m.date <= dateTo);

    // Classifications
    if (filterImpact)
      result = result.filter((m) => m.narrative === filterImpact);
    if (filterContext)
      result = result.filter((m) => m.matchup_context === filterContext);

    return result;
  }, [
    allMatches,
    sessions,
    filterYear,
    filterOrganizer,
    filterLocation,
    filterPerson,
    filterRole,
    dateFrom,
    dateTo,
    filterImpact,
    filterContext,
  ]);

  const hasMoreFilters = !!(
    dateFrom ||
    dateTo ||
    filterImpact ||
    filterContext
  );
  const hasActiveFilter = !!(
    filterYear ||
    filterOrganizer ||
    filterLocation ||
    filterPerson ||
    dateFrom ||
    dateTo ||
    filterImpact ||
    filterContext
  );

  const clearAll = () => {
    setFilterYear("");
    setFilterOrganizer("");
    setFilterLocation("");
    setFilterPerson("");
    setFilterRole("any");
    setPersonSearch("");
    setDateFrom("");
    setDateTo("");
    setFilterImpact("");
    setFilterContext("");
  };

  // Navigate to Matches tab carrying over current Analytics filters
  const viewMatches = (extra: {
    impact?: string | null;
    context?: string | null;
    oppTier?: string | null;
  }) => {
    onViewMatches({
      ...extra,
      year: filterYear || null,
      organizer: filterOrganizer || null,
      location: filterLocation || null,
      person: filterPerson || null,
      role: filterPerson ? filterRole : null,
    });
  };

  const selectPerson = (name: string, role: "any" | "partner" | "opponent") => {
    setFilterPerson(name);
    setFilterRole(role);
    setPersonSearch("");
    setShowPersonDropdown(false);
  };

  const personLabel = filterPerson
    ? filterRole === "any"
      ? filterPerson
      : `${filterRole === "partner" ? "w/" : "vs"} ${filterPerson}`
    : "";

  // ─── Computed analytics from filtered matches ───
  const analytics = useMemo(() => {
    const matches = filteredMatches;
    const wins = matches.filter((m) => m.won);
    const losses = matches.filter((m) => !m.won);

    // Impact distribution
    const impactCounts: Record<string, number> = {};
    const contextCounts: Record<string, number> = {};
    for (const m of matches) {
      impactCounts[m.narrative] = (impactCounts[m.narrative] ?? 0) + 1;
      contextCounts[m.matchup_context] =
        (contextCounts[m.matchup_context] ?? 0) + 1;
    }

    // Matchup context breakdown
    const contextBreakdown: Record<
      string,
      { wins: number; losses: number; totalDelta: number; count: number }
    > = {};
    for (const ctx of [
      "Big Underdog",
      "Slight Underdog",
      "Even Match",
      "Slight Favorite",
      "Big Favorite",
    ]) {
      contextBreakdown[ctx] = { wins: 0, losses: 0, totalDelta: 0, count: 0 };
    }
    for (const m of matches) {
      const b = contextBreakdown[m.matchup_context];
      if (b) {
        b.count++;
        b.totalDelta += m.target_delta;
        if (m.won) b.wins++;
        else b.losses++;
      }
    }

    // Scoring
    const winDiffs = wins.map((m) => m.point_differential);
    const lossDiffs = losses.map((m) => m.point_differential);
    const avgPointDiffWins =
      winDiffs.length > 0
        ? winDiffs.reduce((a, b) => a + b, 0) / winDiffs.length
        : 0;
    const avgPointDiffLosses =
      lossDiffs.length > 0
        ? lossDiffs.reduce((a, b) => a + b, 0) / lossDiffs.length
        : 0;

    // Points for/against from games
    let totalPtsFor = 0,
      totalPtsAgainst = 0,
      totalGames = 0;
    for (const m of matches) {
      const targetTeam = m.players.find((p) => p.is_target)?.team;
      for (const g of m.games) {
        totalGames++;
        if (targetTeam === 1) {
          totalPtsFor += g.team1_score;
          totalPtsAgainst += g.team2_score;
        } else {
          totalPtsFor += g.team2_score;
          totalPtsAgainst += g.team1_score;
        }
      }
    }

    // Streaks
    let currentStreak = 0;
    let currentStreakType: "W" | "L" | null = null;
    let longestWin = 0,
      longestLoss = 0,
      tempWin = 0,
      tempLoss = 0;
    // Process newest-first (matches are oldest-first in data, we want current streak from end)
    const chronological = [...matches].reverse();
    for (const m of [...matches]) {
      if (m.won) {
        tempWin++;
        tempLoss = 0;
        longestWin = Math.max(longestWin, tempWin);
      } else {
        tempLoss++;
        tempWin = 0;
        longestLoss = Math.max(longestLoss, tempLoss);
      }
    }
    for (const m of chronological) {
      if (currentStreakType === null) {
        currentStreakType = m.won ? "W" : "L";
        currentStreak = 1;
      } else if (
        (m.won && currentStreakType === "W") ||
        (!m.won && currentStreakType === "L")
      ) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Rolling win rate trend (last N matches)
    const winRateTrend: {
      match: number;
      last10: number;
      last20: number;
      overall: number;
    }[] = [];
    let runningWins = 0;
    for (let i = 0; i < matches.length; i++) {
      if (matches[i].won) runningWins++;
      const matchNum = i + 1;
      const overall = runningWins / matchNum;

      // Last 10
      let last10Wins = 0;
      const start10 = Math.max(0, i - 9);
      for (let j = start10; j <= i; j++) {
        if (matches[j].won) last10Wins++;
      }
      const last10 = last10Wins / (i - start10 + 1);

      // Last 20
      let last20Wins = 0;
      const start20 = Math.max(0, i - 19);
      for (let j = start20; j <= i; j++) {
        if (matches[j].won) last20Wins++;
      }
      const last20 = last20Wins / (i - start20 + 1);

      winRateTrend.push({ match: matchNum, last10, last20, overall });
    }

    // Opponent rating tier efficiency
    // Use avg opponent rating per match, bucketed into tiers
    const TIER_RANGES = [
      { label: "< 3.0", min: 0, max: 3.0 },
      { label: "3.0–3.5", min: 3.0, max: 3.5 },
      { label: "3.5–4.0", min: 3.5, max: 4.0 },
      { label: "4.0–4.5", min: 4.0, max: 4.5 },
      { label: "4.5+", min: 4.5, max: 99 },
    ];
    const tierData: Record<
      string,
      {
        wins: number;
        losses: number;
        totalDelta: number;
        count: number;
        avgPtDiff: number;
        totalPtDiff: number;
      }
    > = {};
    for (const t of TIER_RANGES) {
      tierData[t.label] = {
        wins: 0,
        losses: 0,
        totalDelta: 0,
        count: 0,
        avgPtDiff: 0,
        totalPtDiff: 0,
      };
    }
    for (const m of matches) {
      const targetTeam = m.players.find((p) => p.is_target)?.team;
      const opponents = m.players.filter(
        (p) => !p.is_target && p.team !== targetTeam,
      );
      const oppRatings = opponents
        .map((p) => p.pre_rating)
        .filter((r): r is number => r != null);
      if (oppRatings.length === 0) continue;
      const avgOppRating =
        oppRatings.reduce((a, b) => a + b, 0) / oppRatings.length;
      const tier = TIER_RANGES.find(
        (t) => avgOppRating >= t.min && avgOppRating < t.max,
      );
      if (!tier) continue;
      const td = tierData[tier.label];
      td.count++;
      td.totalDelta += m.target_delta;
      td.totalPtDiff += m.point_differential;
      if (m.won) td.wins++;
      else td.losses++;
    }
    for (const t of TIER_RANGES) {
      const td = tierData[t.label];
      if (td.count > 0) td.avgPtDiff = td.totalPtDiff / td.count;
    }

    return {
      total: matches.length,
      wins: wins.length,
      losses: losses.length,
      impactCounts,
      contextCounts,
      contextBreakdown,
      avgPointDiffWins,
      avgPointDiffLosses,
      avgPtsFor: totalGames > 0 ? totalPtsFor / totalGames : 0,
      avgPtsAgainst: totalGames > 0 ? totalPtsAgainst / totalGames : 0,
      currentStreak,
      currentStreakType,
      longestWin,
      longestLoss,
      winRateTrend,
      tierData,
      tierRanges: TIER_RANGES,
    };
  }, [filteredMatches]);

  const IMPACT_ORDER = [
    "Rough Win",
    "Standard Win",
    "Dominance",
    "Underperformance",
    "Soft Loss",
    "The Grinder",
  ];
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

  const fmtD = (v: number) => (v >= 0 ? `+${v.toFixed(3)}` : v.toFixed(3));

  return (
    <>
      {/* Quick filter pills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
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
          <div className="relative" ref={personDropdownRef}>
            <input
              type="text"
              value={filterPerson ? personLabel : personSearch}
              onChange={(e) => {
                if (filterPerson) {
                  setFilterPerson("");
                  setFilterRole("any");
                }
                setPersonSearch(e.target.value);
                setShowPersonDropdown(true);
              }}
              onFocus={() => setShowPersonDropdown(true)}
              placeholder="Filter by person..."
              className="bg-bg-primary border border-border rounded-full px-3 py-1 text-xs text-text-primary placeholder:text-text-muted w-48 focus:outline-none focus:border-accent"
            />
            {filterPerson && (
              <button
                onClick={() => {
                  setFilterPerson("");
                  setFilterRole("any");
                  setPersonSearch("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
              >
                &times;
              </button>
            )}
            {showPersonDropdown &&
              !filterPerson &&
              filteredPersonOptions.length > 0 && (
                <div className="absolute z-20 top-full left-0 mt-1 w-80 bg-bg-card border border-border rounded-lg shadow-xl max-h-72 overflow-y-auto">
                  {filteredPersonOptions.slice(0, 30).map((p) => (
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
            <>
              <span className="text-xs text-text-muted ml-auto">
                {filteredMatches.length} match
                {filteredMatches.length !== 1 ? "es" : ""}
              </span>
              <button
                onClick={clearAll}
                className="text-xs text-accent hover:text-accent-dim transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>

        {/* Expanded more filters */}
        {showMoreFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-bg-primary rounded-lg border border-border">
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
          </div>
        )}
      </div>

      {analytics.total === 0 ? (
        <div className="bg-bg-card rounded-xl p-8 border border-border text-center">
          <p className="text-text-muted">
            No matches found for the selected filters.
          </p>
        </div>
      ) : (
        <>
          {/* Row 1: Win Rate Trend + Streaks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Win Rate Trend */}
            <div className="bg-bg-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Win Rate Trend
              </h3>
              {analytics.winRateTrend.length > 0 ? (
                <>
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#22c55e] inline-block rounded" />{" "}
                      Last 10
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#3b82f6] inline-block rounded" />{" "}
                      Last 20
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 bg-[#94a3b8] inline-block rounded opacity-50" />{" "}
                      Overall
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.winRateTrend}>
                      <XAxis
                        dataKey="match"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <ReferenceLine
                        y={0.5}
                        stroke="#334155"
                        strokeDasharray="3 3"
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(
                          value: any,
                          name: any,
                        ): [string, string] => [
                          `${Math.round(Number(value) * 100)}%`,
                          (name === "last10"
                            ? "Last 10"
                            : name === "last20"
                              ? "Last 20"
                              : "Overall") as string,
                        ]}
                        labelFormatter={(label: any) => `Match ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="overall"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        dot={false}
                        opacity={0.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="last20"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="last10"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="bg-bg-primary rounded-lg p-2 text-center">
                      <p className="text-text-muted text-[10px]">Last 10</p>
                      <p className="text-[#22c55e] text-lg font-bold">
                        {Math.round(
                          analytics.winRateTrend[
                            analytics.winRateTrend.length - 1
                          ].last10 * 100,
                        )}
                        %
                      </p>
                    </div>
                    <div className="bg-bg-primary rounded-lg p-2 text-center">
                      <p className="text-text-muted text-[10px]">Last 20</p>
                      <p className="text-[#3b82f6] text-lg font-bold">
                        {Math.round(
                          analytics.winRateTrend[
                            analytics.winRateTrend.length - 1
                          ].last20 * 100,
                        )}
                        %
                      </p>
                    </div>
                    <div className="bg-bg-primary rounded-lg p-2 text-center">
                      <p className="text-text-muted text-[10px]">Overall</p>
                      <p className="text-text-primary text-lg font-bold">
                        {Math.round(
                          analytics.winRateTrend[
                            analytics.winRateTrend.length - 1
                          ].overall * 100,
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-text-muted text-sm text-center py-8">
                  No data
                </p>
              )}
            </div>

            {/* Streaks + Scoring */}
            <div className="bg-bg-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Streaks & Scoring
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-primary rounded-lg p-3">
                  <p className="text-text-muted text-xs">Current Streak</p>
                  <p
                    className={`text-xl font-bold ${analytics.currentStreakType === "W" ? "text-win" : "text-loss"}`}
                  >
                    {analytics.currentStreak}
                    {analytics.currentStreakType}
                  </p>
                </div>
                <div className="bg-bg-primary rounded-lg p-3">
                  <p className="text-text-muted text-xs">Longest Streaks</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-win text-lg font-bold">
                      {analytics.longestWin}W
                    </span>
                    <span className="text-text-muted">/</span>
                    <span className="text-loss text-lg font-bold">
                      {analytics.longestLoss}L
                    </span>
                  </div>
                </div>
                <div className="bg-bg-primary rounded-lg p-3">
                  <p className="text-text-muted text-xs">Avg Margin (Wins)</p>
                  <p className="text-win text-xl font-bold">
                    +{analytics.avgPointDiffWins.toFixed(1)}
                  </p>
                </div>
                <div className="bg-bg-primary rounded-lg p-3">
                  <p className="text-text-muted text-xs">Avg Margin (Losses)</p>
                  <p className="text-loss text-xl font-bold">
                    {analytics.avgPointDiffLosses.toFixed(1)}
                  </p>
                </div>
                <div className="bg-bg-primary rounded-lg p-3">
                  <p className="text-text-muted text-xs">Avg Pts Scored</p>
                  <p className="text-text-primary text-xl font-bold">
                    {analytics.avgPtsFor.toFixed(1)}
                  </p>
                </div>
                <div className="bg-bg-primary rounded-lg p-3">
                  <p className="text-text-muted text-xs">Avg Pts Allowed</p>
                  <p className="text-text-primary text-xl font-bold">
                    {analytics.avgPtsAgainst.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Classification Distributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating Impact Distribution */}
            <div className="bg-bg-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Rating Impact Distribution
              </h3>
              <div className="space-y-1.5">
                {IMPACT_ORDER.map((name) => {
                  const count = analytics.impactCounts[name] ?? 0;
                  return (
                    <div key={name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-28 text-right font-medium"
                        style={{ color: IMPACT_COLORS[name] }}
                      >
                        {name}
                      </span>
                      <div className="flex-1 h-4 bg-bg-primary rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%`,
                            backgroundColor: IMPACT_COLORS[name],
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-text-muted">
                        {count}
                      </span>
                      <span className="w-10 text-right text-text-muted">
                        {analytics.total > 0
                          ? `${Math.round((count / analytics.total) * 100)}%`
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matchup Context Distribution */}
            <div className="bg-bg-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Matchup Context Distribution
              </h3>
              <div className="space-y-1.5">
                {CONTEXT_ORDER.map((name) => {
                  const count = analytics.contextCounts[name] ?? 0;
                  return (
                    <div key={name} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-28 text-right font-medium"
                        style={{ color: CONTEXT_COLORS[name] }}
                      >
                        {name}
                      </span>
                      <div className="flex-1 h-4 bg-bg-primary rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%`,
                            backgroundColor: CONTEXT_COLORS[name],
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-text-muted">
                        {count}
                      </span>
                      <span className="w-10 text-right text-text-muted">
                        {analytics.total > 0
                          ? `${Math.round((count / analytics.total) * 100)}%`
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: Matchup Context Breakdown */}
          <div className="bg-bg-card rounded-xl p-4 border border-border">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Performance by Matchup Context
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {CONTEXT_ORDER.map((ctx) => {
                const b = analytics.contextBreakdown[ctx];
                if (!b || b.count === 0)
                  return (
                    <div
                      key={ctx}
                      className="bg-bg-primary rounded-lg p-3 text-center"
                    >
                      <p
                        className="text-xs font-medium mb-2"
                        style={{ color: CONTEXT_COLORS[ctx] }}
                      >
                        {ctx}
                      </p>
                      <p className="text-text-muted/30 text-sm">—</p>
                    </div>
                  );
                const winRate = b.count > 0 ? b.wins / b.count : 0;
                const avgDelta = b.count > 0 ? b.totalDelta / b.count : 0;
                return (
                  <div
                    key={ctx}
                    className="bg-bg-primary rounded-lg p-3 text-center"
                  >
                    <p
                      className="text-xs font-medium mb-2"
                      style={{ color: CONTEXT_COLORS[ctx] }}
                    >
                      {ctx}
                    </p>
                    <p className="text-lg font-bold text-text-primary">
                      {Math.round(winRate * 100)}%
                    </p>
                    <p className="text-xs text-text-muted">
                      {b.wins}W-{b.losses}L
                    </p>
                    <p
                      className={`text-xs font-mono mt-1 ${b.totalDelta >= 0 ? "text-win" : "text-loss"}`}
                    >
                      {fmtD(b.totalDelta)}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono">
                      avg {fmtD(avgDelta)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 4: Opponent Rating Tier Efficiency */}
          <div className="bg-bg-card rounded-xl p-4 border border-border">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Opponent Rating Tier Efficiency
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Performance against opponents grouped by avg DUPR rating
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Win rate bar chart */}
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
                  Win Rate by Tier
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={analytics.tierRanges.map((t) => {
                      const d = analytics.tierData[t.label];
                      return {
                        tier: t.label,
                        winRate: d.count > 0 ? d.wins / d.count : 0,
                        count: d.count,
                      };
                    })}
                    barCategoryGap="20%"
                  >
                    <XAxis
                      dataKey="tier"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                    />
                    <ReferenceLine
                      y={0.5}
                      stroke="#334155"
                      strokeDasharray="3 3"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(
                        value: any,
                        _name: any,
                        props: any,
                      ): [string, string] => [
                        `${Math.round(Number(value) * 100)}% (${props.payload.count} matches)`,
                        "Win Rate",
                      ]}
                    />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                      {analytics.tierRanges.map((t) => {
                        const d = analytics.tierData[t.label];
                        const wr = d.count > 0 ? d.wins / d.count : 0;
                        return (
                          <Cell
                            key={t.label}
                            fill={
                              wr >= 0.6
                                ? "#22c55e"
                                : wr >= 0.45
                                  ? "#eab308"
                                  : d.count === 0
                                    ? "#334155"
                                    : "#ef4444"
                            }
                            opacity={d.count === 0 ? 0.3 : 0.8}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Detail table */}
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase mb-2">
                  Breakdown
                </h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs">
                      <th className="text-left py-1.5 font-medium">Tier</th>
                      <th className="text-center py-1.5 font-medium">Record</th>
                      <th className="text-center py-1.5 font-medium">Win %</th>
                      <th className="text-center py-1.5 font-medium">
                        Avg Delta
                      </th>
                      <th className="text-center py-1.5 font-medium">
                        Avg Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.tierRanges.map((t) => {
                      const d = analytics.tierData[t.label];
                      if (d.count === 0)
                        return (
                          <tr
                            key={t.label}
                            className="border-t border-border/30"
                          >
                            <td className="py-2 text-text-primary font-medium">
                              {t.label}
                            </td>
                            <td
                              className="text-center text-text-muted/30"
                              colSpan={4}
                            >
                              —
                            </td>
                          </tr>
                        );
                      const wr = d.wins / d.count;
                      const avgDelta = d.totalDelta / d.count;
                      return (
                        <tr
                          key={t.label}
                          className="border-t border-border/30 cursor-pointer hover:bg-bg-card-hover transition-colors"
                          onClick={() => viewMatches({ oppTier: t.label })}
                        >
                          <td className="py-2 text-text-primary font-medium">
                            {t.label}
                          </td>
                          <td className="text-center">
                            <span className="text-win">{d.wins}W</span>
                            <span className="text-text-muted">-</span>
                            <span className="text-loss">{d.losses}L</span>
                          </td>
                          <td
                            className={`text-center font-bold ${wr >= 0.6 ? "text-win" : wr >= 0.45 ? "text-yellow-400" : "text-loss"}`}
                          >
                            {Math.round(wr * 100)}%
                          </td>
                          <td
                            className={`text-center font-mono text-xs ${avgDelta >= 0 ? "text-win" : "text-loss"}`}
                          >
                            {fmtD(avgDelta)}
                          </td>
                          <td
                            className={`text-center font-mono text-xs ${d.avgPtDiff >= 0 ? "text-win" : "text-loss"}`}
                          >
                            {d.avgPtDiff >= 0 ? "+" : ""}
                            {d.avgPtDiff.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Row 5: Performance Matrix */}
          <ClassificationMatrix
            matches={filteredMatches}
            onCellClick={(imp, ctx) =>
              viewMatches({ impact: imp, context: ctx })
            }
          />
        </>
      )}
    </>
  );
}

// ─── Utility Components ─────────────────────────────────

function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-bg-card border border-border rounded-lg shadow-xl px-4 py-3 flex items-center gap-3">
      <p className="text-sm text-text-primary">{message}</p>
      <button
        onClick={onDismiss}
        className="text-text-muted hover:text-text-primary text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────

export default function App() {
  const { data, loading, error, reload } = useAnalytics();
  const hash = useHashState(TABS[0]);
  const activeTab = TABS.includes(hash.tab) ? hash.tab : TABS[0];
  const matchDateFilter = hash.date;
  const matchPersonFilter: PersonFilter | null = hash.person
    ? { name: hash.person, role: (hash.role as PersonFilter["role"]) || "any" }
    : null;

  const [syncing, setSyncing] = useState(false);
  const [wizardSessions, setWizardSessions] = useState<
    NewSessionPreview[] | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);

  const { isAdmin, adminLocked, readOnly, adminSecret, unlock, lock } = useAdmin();

  useEffect(() => {
    if (activeTab === "Config" && !isAdmin) {
      hash.setTab("Overview");
    }
  }, [activeTab, isAdmin]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await triggerSync(adminSecret);
      if (result.new_sessions && result.new_sessions.length > 0) {
        setWizardSessions(result.new_sessions);
      } else {
        await reload();
        setToast("Up to date — no new matches found.");
        setTimeout(() => setToast(null), 4000);
      }
    } catch (e) {
      setToast(
        `Sync failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const handleWizardComplete = async () => {
    setWizardSessions(null);
    await reload();
    setToast("Sessions saved and analytics updated.");
    setTimeout(() => setToast(null), 4000);
  };

  const handleWizardSkip = async () => {
    setWizardSessions(null);
    await cancelSync(adminSecret);
    await reload();
    setToast("Sync cancelled — new matches discarded.");
    setTimeout(() => setToast(null), 4000);
  };

  const handleSessionClick = (date: string) => {
    hash.setFilters("Matches", date, null, null);
  };

  const handleViewPartnerMatches = (name: string) => {
    hash.setFilters("Matches", null, name, "partner");
  };

  const handleViewOpponentMatches = (name: string) => {
    hash.setFilters("Matches", null, name, "opponent");
  };

  if (loading) {
    return (
      <Shell>
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-bg-card rounded-xl" />
          <div className="h-80 bg-bg-card rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-bg-card rounded-xl" />
            <div className="h-64 bg-bg-card rounded-xl" />
          </div>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-loss text-lg">{error ?? "No data"}</p>
          <button
            onClick={reload}
            className="px-4 py-2 bg-accent text-bg-primary rounded-lg font-medium hover:bg-accent-dim transition-colors"
          >
            Retry
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <>
      <Shell
        onSync={isAdmin ? handleSync : undefined}
        syncing={syncing}
        tabs={isAdmin ? TABS : TABS.filter((t) => t !== "Config")}
        activeTab={activeTab}
        onTabChange={hash.setTab}
        adminLocked={adminLocked}
        isAdmin={isAdmin}
        readOnly={readOnly}
        onUnlock={unlock}
        onLock={lock}
      >
        {activeTab === "Overview" && <OverviewTab data={data} />}
        {activeTab === "Sessions" && (
          <SessionsTab data={data} onSessionClick={handleSessionClick} />
        )}
        {activeTab === "Matches" && (
          <MatchesTab
            data={data}
            filterDate={matchDateFilter}
            filterPerson={matchPersonFilter}
            onFilterChange={(d) => hash.setDate(d)}
            onPersonFilterChange={(p) =>
              hash.setPerson(p?.name ?? null, p?.role ?? null)
            }
            initialImpact={hash.impact}
            initialContext={hash.context}
            initialOppTier={hash.oppTier}
            initialYear={hash.year}
            initialOrganizer={hash.organizer}
            initialLocation={hash.location}
            initialPersonName={hash.person}
            initialPersonRole={hash.role}
            onClassificationClear={() => hash.setMatchFilters({})}
          />
        )}
        {activeTab === "Partners & Opponents" && (
          <PartnersTab
            data={data}
            onViewPartnerMatches={handleViewPartnerMatches}
            onViewOpponentMatches={handleViewOpponentMatches}
            minGames={hash.minGames}
            onMinGamesChange={hash.setMinGames}
          />
        )}
        {activeTab === "Analytics" && (
          <AnalyticsTab data={data} onViewMatches={hash.setMatchFilters} />
        )}
        {activeTab === "Config" && isAdmin && (
          <ConfigTab matchDetails={data.match_details} adminSecret={adminSecret} readOnly={readOnly} />
        )}
      </Shell>

      {wizardSessions && isAdmin && (
        <ImportWizard
          sessions={wizardSessions}
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
          adminSecret={adminSecret}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
