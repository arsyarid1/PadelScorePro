import { Tournament } from '../types';

/**
 * Encodes a lightweight, URL-safe snapshot of the tournament
 * so that any recipient can view full leaderboard rankings and match results
 * even on static hosting without requiring a backend database.
 */
export function encodeTournamentSnapshot(tournament: Tournament): string {
  try {
    const compact = {
      i: tournament.id,
      n: tournament.name,
      t: tournament.type,
      s: tournament.scoring,
      sm: tournament.scoringMode || 'late',
      c: tournament.courts,
      st: tournament.status,
      sc: tournament.shortcode,
      p: (tournament.players || []).map(p => ({
        i: p.id,
        n: p.name,
        g: p.gender,
        pt: p.points || 0,
        w: p.wins || 0,
        mp: p.matchesPlayed || 0,
        wr: p.winRate || 0,
        a: p.avatarUrl || '',
        h: (p.matchHistory || []).map(h => ({
          m: h.matchId,
          o: h.opponent,
          su: h.score_us,
          st: h.score_them,
          r: h.result,
          t: h.type,
          d: h.date
        }))
      })),
      m: (tournament.matches || []).map(m => ({
        i: m.id,
        c: m.court,
        r: m.round,
        st: m.status,
        w: m.winner,
        ta: { 
          p: m.teamA?.playerIds || [], 
          s: m.teamA?.score ?? 0, 
          g: m.teamA?.games ?? 0, 
          se: m.teamA?.sets ?? 0 
        },
        tb: { 
          p: m.teamB?.playerIds || [], 
          s: m.teamB?.score ?? 0, 
          g: m.teamB?.games ?? 0, 
          se: m.teamB?.sets ?? 0 
        }
      }))
    };

    const json = JSON.stringify(compact);
    const utf8Bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const b64 = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return b64;
  } catch (err) {
    console.warn("Could not encode tournament snapshot:", err);
    return '';
  }
}

/**
 * Decodes a tournament snapshot from the URL parameter.
 */
export function decodeTournamentSnapshot(encoded: string): Tournament | null {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const c = JSON.parse(json);

    if (!c || !c.i) return null;

    return {
      id: c.i,
      name: c.n || 'Turnamen Padel',
      type: c.t || 'Americano',
      scoring: c.s || 'Rally Points',
      scoringMode: c.sm || 'late',
      courts: c.c || 1,
      status: c.st || 'finished',
      shortcode: c.sc,
      role: 'spectator',
      isCloud: false,
      maxPoints: 21,
      createdAt: new Date().toISOString(),
      players: (c.p || []).map((p: any) => ({
        id: p.i,
        name: p.n || 'Pemain',
        gender: p.g || 'male',
        points: p.pt || 0,
        wins: p.w || 0,
        matchesPlayed: p.mp || 0,
        winRate: p.wr || 0,
        avatarUrl: p.a || '',
        location: 'Local',
        seed: 1,
        matchHistory: (p.h || []).map((h: any) => ({
          matchId: h.m,
          opponent: h.o,
          score_us: h.su,
          score_them: h.st,
          result: h.r,
          type: h.t,
          date: h.d
        }))
      })),
      matches: (c.m || []).map((m: any) => ({
        id: m.i,
        court: m.c || 1,
        round: m.r || 1,
        status: m.st || 'finished',
        winner: m.w,
        teamA: {
          playerIds: m.ta?.p || [],
          score: m.ta?.s ?? 0,
          games: m.ta?.g ?? 0,
          sets: m.ta?.se ?? 0
        },
        teamB: {
          playerIds: m.tb?.p || [],
          score: m.tb?.s ?? 0,
          games: m.tb?.g ?? 0,
          sets: m.tb?.se ?? 0
        }
      }))
    };
  } catch (err) {
    console.error("Failed to decode tournament snapshot:", err);
    return null;
  }
}

/**
 * Builds the canonical public shareable URL.
 */
export function buildPublicTournamentUrl(tournament: Tournament): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.padelscore.pro';
  const snapshot = encodeTournamentSnapshot(tournament);
  const snapParam = snapshot ? `?d=${snapshot}` : '';

  if (tournament.shortcode) {
    return `${origin}/live?code=${tournament.shortcode}${snapshot ? `&d=${snapshot}` : ''}`;
  }
  return `${origin}/t/${tournament.id}${snapParam}`;
}
