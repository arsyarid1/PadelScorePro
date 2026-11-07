/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing. Real-time features are disabled (running local-first).');
}

const createDummySupabaseClient = () => {
  const dummyChannel = {
    on: () => dummyChannel,
    subscribe: () => dummyChannel,
    unsubscribe: () => {},
    send: () => {},
    track: () => Promise.resolve()
  };

  return {
    channel: () => dummyChannel,
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null })
    })
  } as any;
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createDummySupabaseClient();

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
