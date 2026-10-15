import { supabase, isSupabaseConfigured, BROADCAST_CHANNELS, ScoreBroadcast, SessionBroadcast } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

class TournamentService {
  private channel: RealtimeChannel | null = null;

  subscribe(tournamentId: string, onScoreUpdate: (data: ScoreBroadcast) => void, onSessionEvent: (data: SessionBroadcast) => void) {
    if (!isSupabaseConfigured) {
      return () => {};
    }
    this.channel = supabase.channel(BROADCAST_CHANNELS.TOURNAMENT(tournamentId));

    this.channel
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
        onScoreUpdate(payload);
      })
      .on('broadcast', { event: 'session_event' }, ({ payload }) => {
        onSessionEvent(payload);
      })
      .subscribe();

    return () => {
      this.channel?.unsubscribe();
    };
  }

  broadcastScore(tournamentId: string, data: ScoreBroadcast) {
    if (!isSupabaseConfigured) return;
    if (!this.channel) {
      this.channel = supabase.channel(BROADCAST_CHANNELS.TOURNAMENT(tournamentId));
      this.channel.subscribe();
    }
    this.channel.send({
      type: 'broadcast',
      event: 'score_update',
      payload: data,
    });
  }

  broadcastSessionEvent(tournamentId: string, data: SessionBroadcast) {
    if (!isSupabaseConfigured) return;
    if (!this.channel) {
      this.channel = supabase.channel(BROADCAST_CHANNELS.TOURNAMENT(tournamentId));
      this.channel.subscribe();
    }
    this.channel.send({
      type: 'broadcast',
      event: 'session_event',
      payload: data,
    });
  }

  // Presence for tracking referees
  trackPresence(tournamentId: string, refereeInfo: any) {
    if (!isSupabaseConfigured) {
      return { unsubscribe: () => {} };
    }
    const presenceChannel = supabase.channel(`presence:${tournamentId}`, {
      config: {
        presence: {
          key: refereeInfo.deviceId,
        },
      },
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track(refereeInfo);
      }
    });

    return presenceChannel;
  }
}

export const tournamentService = new TournamentService();
