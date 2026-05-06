import { useState, useEffect, useCallback } from "react";

interface HashState {
  tab: string;
  date: string | null;
  person: string | null;
  role: string | null;
  minGames: number | null;
  impact: string | null;
  context: string | null;
  oppTier: string | null;
  year: string | null;
  organizer: string | null;
  location: string | null;
}

function parseHash(): HashState {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const mg = params.get("minGames");
  return {
    tab: params.get("tab") || "",
    date: params.get("date") || null,
    person: params.get("person") || null,
    role: params.get("role") || null,
    minGames: mg ? parseInt(mg) : null,
    impact: params.get("impact") || null,
    context: params.get("context") || null,
    oppTier: params.get("oppTier") || null,
    year: params.get("year") || null,
    organizer: params.get("organizer") || null,
    location: params.get("location") || null,
  };
}

function writeHash(state: HashState) {
  const params = new URLSearchParams();
  if (state.tab) params.set("tab", state.tab);
  if (state.date) params.set("date", state.date);
  if (state.person) params.set("person", state.person);
  if (state.role) params.set("role", state.role);
  if (
    state.tab === "Partners & Opponents" &&
    state.minGames != null &&
    state.minGames > 1
  )
    params.set("minGames", String(state.minGames));
  if (state.impact) params.set("impact", state.impact);
  if (state.context) params.set("context", state.context);
  if (state.oppTier) params.set("oppTier", state.oppTier);
  if (state.year) params.set("year", state.year);
  if (state.organizer) params.set("organizer", state.organizer);
  if (state.location) params.set("location", state.location);
  const hash = params.toString();
  const newUrl = hash ? `#${hash}` : window.location.pathname;
  window.history.pushState(null, "", newUrl);
}

export function useHashState(defaultTab: string) {
  const initial = parseHash();
  const [tab, setTabRaw] = useState(initial.tab || defaultTab);
  const [date, setDateRaw] = useState(initial.date);
  const [person, setPersonRaw] = useState(initial.person);
  const [role, setRoleRaw] = useState(initial.role);
  const [minGames, setMinGamesRaw] = useState(initial.minGames ?? 1);
  const [impact, setImpactRaw] = useState(initial.impact);
  const [context, setContextRaw] = useState(initial.context);
  const [oppTier, setOppTierRaw] = useState(initial.oppTier);
  const [year, setYearRaw] = useState(initial.year);
  const [organizer, setOrganizerRaw] = useState(initial.organizer);
  const [location, setLocationRaw] = useState(initial.location);

  useEffect(() => {
    const onPop = () => {
      const s = parseHash();
      setTabRaw(s.tab || defaultTab);
      setDateRaw(s.date);
      setPersonRaw(s.person);
      setRoleRaw(s.role);
      setMinGamesRaw(s.minGames ?? 1);
      setImpactRaw(s.impact);
      setContextRaw(s.context);
      setOppTierRaw(s.oppTier);
      setYearRaw(s.year);
      setOrganizerRaw(s.organizer);
      setLocationRaw(s.location);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [defaultTab]);

  const defaults = {
    impact: null,
    context: null,
    oppTier: null,
    year: null,
    organizer: null,
    location: null,
  };

  const setTab = useCallback((t: string) => {
    setTabRaw(t);
    setDateRaw(null);
    setPersonRaw(null);
    setRoleRaw(null);
    setMinGamesRaw(1);
    setImpactRaw(null);
    setContextRaw(null);
    setOppTierRaw(null);
    setYearRaw(null);
    setOrganizerRaw(null);
    setLocationRaw(null);
    writeHash({
      tab: t,
      date: null,
      person: null,
      role: null,
      minGames: null,
      ...defaults,
    });
  }, []);

  const setDate = useCallback(
    (d: string | null) => {
      setDateRaw(d);
      writeHash({
        tab,
        date: d,
        person,
        role,
        minGames: tab === "Partners & Opponents" ? minGames : null,
        impact,
        context,
        oppTier,
        year,
        organizer,
        location,
      });
    },
    [
      tab,
      person,
      role,
      minGames,
      impact,
      context,
      oppTier,
      year,
      organizer,
      location,
    ],
  );

  const setPerson = useCallback(
    (p: string | null, r: string | null) => {
      setPersonRaw(p);
      setRoleRaw(r);
      writeHash({
        tab,
        date,
        person: p,
        role: r,
        minGames: tab === "Partners & Opponents" ? minGames : null,
        impact,
        context,
        oppTier,
        year,
        organizer,
        location,
      });
    },
    [tab, date, minGames, impact, context, oppTier, year, organizer, location],
  );

  const setMinGames = useCallback(
    (n: number) => {
      setMinGamesRaw(n);
      writeHash({
        tab,
        date,
        person,
        role,
        minGames: n,
        impact,
        context,
        oppTier,
        year,
        organizer,
        location,
      });
    },
    [
      tab,
      date,
      person,
      role,
      impact,
      context,
      oppTier,
      year,
      organizer,
      location,
    ],
  );

  const setFilters = useCallback(
    (t: string, d: string | null, p: string | null, r: string | null) => {
      setTabRaw(t);
      setDateRaw(d);
      setPersonRaw(p);
      setRoleRaw(r);
      setMinGamesRaw(1);
      setImpactRaw(null);
      setContextRaw(null);
      setOppTierRaw(null);
      setYearRaw(null);
      setOrganizerRaw(null);
      setLocationRaw(null);
      writeHash({
        tab: t,
        date: d,
        person: p,
        role: r,
        minGames: null,
        ...defaults,
      });
    },
    [],
  );

  const setMatchFilters = useCallback(
    (opts: {
      impact?: string | null;
      context?: string | null;
      oppTier?: string | null;
      year?: string | null;
      organizer?: string | null;
      location?: string | null;
      person?: string | null;
      role?: string | null;
    }) => {
      setTabRaw("Matches");
      setDateRaw(null);
      setPersonRaw(opts.person ?? null);
      setRoleRaw(opts.role ?? null);
      setMinGamesRaw(1);
      setImpactRaw(opts.impact ?? null);
      setContextRaw(opts.context ?? null);
      setOppTierRaw(opts.oppTier ?? null);
      setYearRaw(opts.year ?? null);
      setOrganizerRaw(opts.organizer ?? null);
      setLocationRaw(opts.location ?? null);
      writeHash({
        tab: "Matches",
        date: null,
        person: opts.person ?? null,
        role: opts.role ?? null,
        minGames: null,
        impact: opts.impact ?? null,
        context: opts.context ?? null,
        oppTier: opts.oppTier ?? null,
        year: opts.year ?? null,
        organizer: opts.organizer ?? null,
        location: opts.location ?? null,
      });
    },
    [],
  );

  return {
    tab,
    date,
    person,
    role,
    minGames,
    impact,
    context,
    oppTier,
    year,
    organizer,
    location,
    setTab,
    setDate,
    setPerson,
    setMinGames,
    setFilters,
    setMatchFilters,
  };
}
