
export type GameType = 'Americano' | 'Mexicano' | 'Mexicano Mix' | 'Americano Mix' | 'Americano Fix' | 'Mexicano Fix' | 'Club Americano' | 'Club Mexicano' | 'Club Fix Americano';
export type ScoringFormat = 'Tournament Pro' | 'Custom Match' | 'Rally Points' | 'Tennis Classic';
export type CustomMatchType = 'Race to' | 'Best of' | 'Tournament Pro';
export type ViewState = 'dashboard' | 'setup' | 'leaderboard' | 'live';
export type Gender = 'male' | 'female';
export type TennisRule = 'Advantage' | 'Golden Point';

export interface Club {
  id: string;
  name: string;
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
}

export interface Tournament {
  id: string;
  name: string;
  type: GameType;
  scoring: ScoringFormat;
  customMatchType?: CustomMatchType;
  tennisRule?: TennisRule;
  maxPoints: number; // Used for Rally Points or Custom Match target
  courts: number;
  players: Player[];
  clubs?: Club[];
  matches: Match[];
  currentMatchId?: string;
  status: 'setup' | 'active' | 'finished';
  createdAt: string;
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
