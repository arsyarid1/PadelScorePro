
export type GameType = 'Americano' | 'Mexicano' | 'Mexicano Mix' | 'Americano Mix' | 'Americano Fix' | 'Mexicano Fix' | 'Club Americano' | 'Club Mexicano' | 'Club Fix Americano' | 'Professional Tournament';
export type ScoringFormat = 'Tournament Pro' | 'Custom Match' | 'Rally Points' | 'Tennis Classic';
export type ScoringMode = 'live' | 'late';
export type CustomMatchType = 'Race to' | 'Best of' | 'Tournament Pro';
export type ViewState = 'dashboard' | 'setup' | 'leaderboard' | 'live' | 'shortcode' | 'superadmin';
export type Gender = 'male' | 'female';
export type TennisRule = 'Advantage' | 'Golden Point';

export interface Club {
  id: string;
  name: string;
}

export interface MatchHistoryEntry {
  matchId: string;
  opponent: string;
  score_us: number;
  score_them: number;
  result: 'Win' | 'Lose' | 'Tie';
  type: ScoringFormat;
  date: string;
}

export interface PlayerTournamentStats {
  gamesPlayed: number;        // G: Matches / games played
  wins: number;               // W: Wins count
  losses: number;             // L: Losses count
  ties: number;               // T: Ties / draws count
  pointsScored: number;       // Total points scored
  pointsConceded: number;     // Total points conceded
  diff: number;               // Diff: pointsScored - pointsConceded
  compensationPoints: number; // +M: Compensation points for benched / bye rounds
  totalPoints: number;        // Points: Accumulated points + compensation
}

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  seed: number;
  points: number;
  wins: number;
  matchesPlayed: number;
  winRate: number;
  avatarUrl: string;
  location: string;
  clubId?: string;
  matchHistory?: MatchHistoryEntry[];
  // Advanced Matchmaking tracking
  consecutiveMatches?: number;
  lastPartnerIds?: string[];
  opponentIds?: string[];
}

export interface KnockoutMatch extends Match {
  nextMatchId?: string;
  position?: 'top' | 'bottom';
  stage: 'R16' | 'QF' | 'SF' | 'F';
}

export interface Bracket {
  rounds: {
    name: string;
    matches: KnockoutMatch[];
  }[];
}

export interface Team {
  playerIds: string[];
  score: any; // Current points (0, 15, 30, 40, Ad)
  games: number; // Games won in current set
  sets: number; // Sets won in match
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  winner?: 'A' | 'B';
  status: 'pending' | 'live' | 'finished';
  court: number;
  round: number;
  isTieBreak?: boolean;
  server?: 'A' | 'B';
}

export interface Tournament {
  id: string;
  shortcode?: string; // For spectator access
  name: string;
  type: GameType;
  scoring: ScoringFormat;
  scoringMode?: ScoringMode; // For 1 court: 'live' (point-by-point live scoreboard) or 'late' (score control modal / multi-court style)
  customMatchType?: CustomMatchType;
  tennisRule?: TennisRule;
  maxPoints: number;
  courts: number;
  players: Player[];
  clubs?: Club[];
  matches: Match[];
  currentMatchId?: string;
  status: 'setup' | 'active' | 'finished';
  createdAt: string;
  isCloud?: boolean; // Flag for tournament mode
  role?: 'admin' | 'spectator';
  bracket?: Bracket;
  suggestedMatches?: Match[];
}

export interface RefereeSession {
  courtId: number;
  refereeName: string;
  deviceId: string;
  browserInfo: string;
  lastActive: number;
}

export interface MatchState {
  teamA: {
    players: string[];
    score: any;
    games: number;
    sets: number;
    totalGames: number;
  };
  teamB: {
    players: string[];
    score: any;
    games: number;
    sets: number;
    totalGames: number;
  };
  server: 'A' | 'B';
  time: number;
  isTieBreak: boolean;
}

export interface UserDevice {
  type: 'Mobile' | 'Tablet' | 'Desktop';
  os: string;
  browser: string;
  screen: string;
  userAgent: string;
}

export interface UserLocation {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  flag: string;
  isp?: string;
  latitude?: number;
  longitude?: number;
}

export interface UserActivitySession {
  id: string;
  visitorId: string;
  userName?: string;
  role?: string;
  device: UserDevice;
  location: UserLocation;
  currentView: string;
  action: string;
  firstSeen: number;
  lastActive: number;
  visitCount: number;
}

export interface AnalyticsSummary {
  totalVisitors: number;
  onlineNow: number;
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  topLocations: Array<{ name: string; count: number; flag: string }>;
  recentSessions: UserActivitySession[];
}
