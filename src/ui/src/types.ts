export interface PlayerAnalytics {
  player_id: number;

  current_doubles: number;
  current_singles: number | null;
  career_high_doubles: number;
  career_high_date: string;
  career_high_singles: number | null;
  rating_30d_ago: number | null;

  total_matches: number;
  total_wins: number;
  overall_win_rate: number;

  narratives: Record<string, number>;
  matchup_contexts: Record<string, number>;
  thresholds: {
    impact: {
      dominance: number;
      empty_win: number;
      grinder: number;
      underperformance: number;
    };
    context: {
      big_underdog: number;
      slight_underdog: number;
      slight_favorite: number;
      big_favorite: number;
    };
  };

  history: HistoryPoint[];
  sessions: SessionGroup[];

  by_source: ContextSplit[];
  by_format: ContextSplit[];
  by_phase: ContextSplit[];
  by_day_of_week: ContextSplit[];
  by_rating_gap: ContextSplit[];
  by_score_format: ContextSplit[];

  avg_point_diff_wins: number;
  avg_point_diff_losses: number;
  blowout_win_pct: number;
  close_loss_pct: number;

  clutch: ClutchStats;

  current_streak: StreakInfo | null;
  longest_win_streak: StreakInfo | null;
  longest_loss_streak: StreakInfo | null;

  // Placement
  placement_distribution: Record<string, number>;
  finals_record: string;

  // People stats by time filter
  // Keys: "Last 5 Sessions", "Last 10 Sessions", "Past Year", "All Time"
  people: Record<string, PeopleStats>;

  rolling_win_rate_10: number[];
  rolling_delta_10: number[];

  match_details: MatchDetail[];
}

export interface PeopleStats {
  top_partners: PartnerStats[];
  worst_partners: PartnerStats[];
  kryptonite_opponents: OpponentStats[];
  feast_opponents: OpponentStats[];
}

export interface HistoryPoint {
  date: string;
  rating: number; // full precision (pre + delta) for chart line
  display_rating: number; // 3dp postMatchRating — what DUPR shows
  match_id: string;
  result: "Win" | "Loss";
  narrative: string;
  matchup_context: string;
  match_source: "CLUB" | "TOURNAMENT" | "REC";
  event_format: "DOUBLES" | "SINGLES";
  point_diff: number;
  rating_gap: number;
  match_delta: number;
  sync_gap: boolean;
  adjustment_amount: number;
}

export interface SessionGroup {
  date: string;
  matches: string[];
  wins: number;
  losses: number;
  start_rating: number;
  end_rating: number;
  net_delta: number;
  total_matches: number;
  win_rate: number;
  source: string;
  event_name: string;
  organizer: string;
  location: string;
  format: string;
  tournament_partner: string;
  place: number | null;
  notes: string;
  adjustment: number;
}

// ─── Match Detail Types ─────────────────────────────────

export interface MatchPlayer {
  name: string;
  team: number;
  is_target: boolean;
  pre_rating: number | null;
  post_rating: number | null;
  delta: number;
}

export interface MatchDetailGame {
  game_num: number;
  team1_score: number;
  team2_score: number;
}

export interface MatchDetail {
  match_id: string;
  date: string;
  event_name: string;
  phase: string;
  won: boolean;
  narrative: string;
  matchup_context: string;
  target_delta: number;
  rating_gap: number;
  players: MatchPlayer[];
  games: MatchDetailGame[];
  point_differential: number;
}

// ─── Sync / Import Wizard Types ─────────────────────────

export interface MatchPreview {
  match_id: string;
  won: boolean;
  partner: string;
  opponents: string[];
  score: string;
}

export interface NewSessionPreview {
  date: string;
  match_count: number;
  wins: number;
  losses: number;
  suggested_organizer: string;
  suggested_location: string;
  suggested_partner: string;
  event_name: string;
  matches: MatchPreview[];
}

export interface SyncResult {
  new_matches_fetched: number;
  total_matches_processed: number;
  current_rating: number;
  career_high: number;
  status: string;
  message: string;
  new_sessions: NewSessionPreview[];
}

export interface SessionsInfo {
  sessions: Record<string, { organizer: string; location: string }>;
  suggestions: { organizers: string[]; locations: string[] };
}

export interface ContextSplit {
  label: string;
  matches: number;
  wins: number;
  total_delta: number;
  win_rate: number;
  avg_delta: number;
}

export interface PartnerStats {
  id: number;
  name: string;
  matches: number;
  wins: number;
  total_delta: number;
  last_played: string;
  win_rate: number;
  avg_delta: number;
}

export interface OpponentStats {
  id: number;
  name: string;
  matches: number;
  wins_against: number;
  losses_to: number;
  total_delta: number;
  avg_rating: number;
  last_played: string;
  avg_delta_per_match: number;
  is_kryptonite: boolean;
  is_feast: boolean;
}

export interface ClutchStats {
  comeback_wins: number;
  choke_losses: number;
  close_game_wins: number;
  close_game_losses: number;
  bracket_wins: number;
  bracket_losses: number;
  total_bracket: number;
  comeback_rate: number;
  close_game_win_rate: number;
  bracket_win_rate: number;
}

export interface StreakInfo {
  type: "win" | "loss";
  count: number;
  start_date: string;
  end_date: string;
  rating_change: number;
}

// ─── Health / Deployment Types ──────────────────────────

export interface HealthInfo {
  raw_file: string;
  raw_exists: boolean;
  raw_size_kb: number;
  raw_match_count: number;
  analytics_file: string;
  analytics_exists: boolean;
  analytics_size_kb: number;
  dupr_id: string;
  player_id: number | null;
  admin_locked: boolean;
  read_only: boolean;
}
