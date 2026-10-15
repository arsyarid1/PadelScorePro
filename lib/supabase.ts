/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing. Real-time features are disabled (running local-first).');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createClient('https://placeholder.supabase.co', 'placeholder') as any);

export const BROADCAST_CHANNELS = {
  TOURNAMENT: (tournamentId: string) => `tournament:${tournamentId}`,
};

export interface ScoreBroadcast {
  matchId: string;
  courtId: number;
  teamA: {
    score: any;
    games: number;
    sets: number;
  };
  teamB: {
    score: any;
    games: number;
    sets: number;
  };
  server: 'A' | 'B';
  isTieBreak: boolean;
  status: 'live' | 'finished';
  lastUpdate: number;
}

export interface SessionBroadcast {
  type: 'KICK' | 'KICK_ALL';
  targetCourt?: number;
  deviceId?: string;
}
