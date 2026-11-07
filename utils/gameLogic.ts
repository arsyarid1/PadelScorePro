
import { Player, Match, GameType, KnockoutMatch, Bracket, PlayerTournamentStats } from '../types';

/**
 * Advanced Matchmaking: Rotation Weight & Dynamic Scheduling
 */
export const getAvailablePlayers = (players: Player[], activeMatches: Match[]): Player[] => {
  const playingPlayerIds = new Set(
    activeMatches
      .filter(m => m.status === 'live')
      .flatMap(m => [...m.teamA.playerIds, ...m.teamB.playerIds])
  );
  return players.filter(p => !playingPlayerIds.has(p.id));
};

export const suggestNextMatchesAdvanced = (
  players: Player[],
  activeMatches: Match[],
  courts: number,
  type: GameType,
  roundNumber: number
): Match[] => {
  const availablePlayers = getAvailablePlayers(players, activeMatches);
  const liveMatchCount = activeMatches.filter(m => m.status === 'live').length;
  const freeCourts = courts - liveMatchCount;
  
  if (freeCourts <= 0 || availablePlayers.length < 4) return [];

  const suggestedMatches: Match[] = [];
  let pool = [...availablePlayers];

  // Sort by Match Count (Fairness Algorithm: Rotation Weight)
  pool.sort((a, b) => (a.matchesPlayed || 0) - (b.matchesPlayed || 0));

  for (let i = 0; i < freeCourts; i++) {
    if (pool.length < 4) break;

    // Constraint: No 3 consecutive matches
    // Filter out players who have played 2 consecutive matches already
    let candidates = pool.filter(p => (p.consecutiveMatches || 0) < 2);
    
    // If not enough candidates, fallback to everyone (though this shouldn't happen with enough players)
    if (candidates.length < 4) candidates = [...pool];

    // Pick top 4 based on match count
    const selected = candidates.slice(0, 4);
    
    // Remove from pool
    pool = pool.filter(p => !selected.includes(p));

    // For Americano: Try to find least frequent partners/opponents
    // For now, we just do a simple pairing, but we could optimize this further
    const p1 = selected[0];
    const p2 = selected[1];
    const p3 = selected[2];
    const p4 = selected[3];

    suggestedMatches.push({
      id: 'suggested-' + Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [p1.id, p2.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [p3.id, p4.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: liveMatchCount + i + 1,
      round: roundNumber
    });
  }

  return suggestedMatches;
};

/**
 * Professional Tournament: Knockout System
 */
export const generateKnockoutBracket = (players: Player[]): Bracket => {
  const numPlayers = players.length;
  // Assume players are already in teams (fixed partners)
  // If not, we pair them up by seed
  const teams = [];
  for (let i = 0; i < numPlayers; i += 2) {
    if (players[i] && players[i + 1]) {
      teams.push({ id: `team-${i/2}`, playerIds: [players[i].id, players[i + 1].id] });
    }
  }

  const numTeams = teams.length;
  let stage: 'R16' | 'QF' | 'SF' | 'F' = 'F';
  if (numTeams > 8) stage = 'R16';
  else if (numTeams > 4) stage = 'QF';
  else if (numTeams > 2) stage = 'SF';

  const rounds: Bracket['rounds'] = [];
  
  // Helper to create matches for a stage
  const createStage = (count: number, currentStage: typeof stage, nextMatches?: KnockoutMatch[]) => {
    const matches: KnockoutMatch[] = [];
    for (let i = 0; i < count; i++) {
      const matchId = `${currentStage}-${i}`;
      const nextMatch = nextMatches ? nextMatches[Math.floor(i / 2)] : undefined;
      
      matches.push({
        id: matchId,
        teamA: { playerIds: [], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: 0,
        round: 0,
        stage: currentStage,
        nextMatchId: nextMatch?.id,
        position: i % 2 === 0 ? 'top' : 'bottom'
      });
    }
    return matches;
  };

  const finalMatches = createStage(1, 'F');
  const semiMatches = createStage(2, 'SF', finalMatches);
  const quarterMatches = createStage(4, 'QF', semiMatches);
  const r16Matches = createStage(8, 'R16', quarterMatches);

  if (stage === 'R16') rounds.push({ name: 'Round of 16', matches: r16Matches });
  if (stage === 'R16' || stage === 'QF') rounds.push({ name: 'Quarter-finals', matches: quarterMatches });
  if (stage === 'R16' || stage === 'QF' || stage === 'SF') rounds.push({ name: 'Semi-finals', matches: semiMatches });
  rounds.push({ name: 'Final', matches: finalMatches });

  // Fill the first round with teams
  const firstRound = rounds[0].matches;
  for (let i = 0; i < teams.length; i++) {
    const matchIdx = Math.floor(i / 2);
    if (matchIdx < firstRound.length) {
      if (i % 2 === 0) {
        firstRound[matchIdx].teamA.playerIds = teams[i].playerIds;
      } else {
        firstRound[matchIdx].teamB.playerIds = teams[i].playerIds;
      }
    }
  }

  return { rounds };
};

/**
 * Club Match: Balanced Cross-Pool
 */
export const suggestClubMatchBalanced = (
  players: Player[],
  clubs: { id: string, name: string }[],
  activeMatches: Match[],
  courts: number,
  roundNumber: number
): Match[] => {
  if (!clubs || clubs.length < 2) return [];
  
  const availablePlayers = getAvailablePlayers(players, activeMatches);
  const clubAPool = availablePlayers.filter(p => p.clubId === clubs[0].id);
  const clubBPool = availablePlayers.filter(p => p.clubId === clubs[1].id);

  // Sort by Match Count (Queue system)
  clubAPool.sort((a, b) => (a.matchesPlayed || 0) - (b.matchesPlayed || 0));
  clubBPool.sort((a, b) => (a.matchesPlayed || 0) - (b.matchesPlayed || 0));

  const liveMatchCount = activeMatches.filter(m => m.status === 'live').length;
  const freeCourts = courts - liveMatchCount;
  const suggestedMatches: Match[] = [];

  for (let i = 0; i < freeCourts; i++) {
    if (clubAPool.length < 2 || clubBPool.length < 2) break;

    const pA1 = clubAPool.shift()!;
    const pA2 = clubAPool.shift()!;
    const pB1 = clubBPool.shift()!;
    const pB2 = clubBPool.shift()!;

    suggestedMatches.push({
      id: 'club-suggested-' + Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [pA1.id, pA2.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [pB1.id, pB2.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: liveMatchCount + i + 1,
      round: roundNumber
    });
  }

  return suggestedMatches;
};

/**
 * Fisher-Yates Shuffle for true randomness.
 * Standardizes how we randomize player pools.
 */
export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Count how many times playerA and playerB have played together as partners
 */
export const countPreviousPartnerships = (
  playerAId: string,
  playerBId: string,
  previousMatches: Match[]
): number => {
  let count = 0;
  for (const m of previousMatches) {
    if (
      (m.teamA.playerIds.includes(playerAId) && m.teamA.playerIds.includes(playerBId)) ||
      (m.teamB.playerIds.includes(playerAId) && m.teamB.playerIds.includes(playerBId))
    ) {
      count++;
    }
  }
  return count;
};

/**
 * Count how many matches a player has played so far
 */
export const countPlayerMatches = (playerId: string, matches: Match[]): number => {
  let count = 0;
  for (const m of matches) {
    if (m.teamA.playerIds.includes(playerId) || m.teamB.playerIds.includes(playerId)) {
      count++;
    }
  }
  return count;
};

/**
 * Calculates comprehensive PDLUP-style tournament statistics for a player:
 * G (Games played), W-L-T (Wins, Losses, Ties), Diff (Points scored - conceded),
 * +M (Compensation points for rest rounds), and Points (Total points including +M).
 */
export const calculatePlayerStats = (
  player: Player,
  allMatches: Match[],
  scoringFormat: string = 'Rally Points',
  maxTournamentMatches?: number
): PlayerTournamentStats => {
  const finishedMatches = allMatches.filter(
    m => m.status === 'finished' && (m.teamA.playerIds.includes(player.id) || m.teamB.playerIds.includes(player.id))
  );

  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsScored = 0;
  let pointsConceded = 0;

  for (const m of finishedMatches) {
    const isTeamA = m.teamA.playerIds.includes(player.id);
    const myScore = scoringFormat === 'Rally Points' ? (isTeamA ? m.teamA.score : m.teamB.score) : (isTeamA ? (m.teamA.games ?? 0) : (m.teamB.games ?? 0));
    const oppScore = scoringFormat === 'Rally Points' ? (isTeamA ? m.teamB.score : m.teamA.score) : (isTeamA ? (m.teamB.games ?? 0) : (m.teamA.games ?? 0));

    pointsScored += (myScore || 0);
    pointsConceded += (oppScore || 0);

    if (myScore > oppScore) {
      wins++;
    } else if (myScore < oppScore) {
      losses++;
    } else {
      ties++;
    }
  }

  const gamesPlayed = finishedMatches.length;
  const diff = pointsScored - pointsConceded;

  // Compensation Points (+M):
  // When players are rotated/benched unevenly, benched players get average points per match for missed rounds
  let compensationPoints = 0;
  if (maxTournamentMatches && maxTournamentMatches > gamesPlayed && gamesPlayed > 0) {
    const missedMatches = maxTournamentMatches - gamesPlayed;
    const avgPerMatch = pointsScored / gamesPlayed;
    compensationPoints = Math.round(missedMatches * avgPerMatch);
  }

  // Fallback to player.points if no matches were tracked in allMatches (e.g. initial setup)
  const basePoints = gamesPlayed > 0 ? pointsScored : (player.points || 0);
  const totalPoints = basePoints + compensationPoints;

  return {
    gamesPlayed,
    wins,
    losses,
    ties,
    pointsScored,
    pointsConceded,
    diff,
    compensationPoints,
    totalPoints
  };
};

export const getMaxMatchesPlayed = (players: Player[], matches: Match[]): number => {
  const finished = matches.filter(m => m.status === 'finished');
  const counts = players.map(p => countPlayerMatches(p.id, finished));
  return counts.length > 0 ? Math.max(...counts, 0) : 0;
};

/**
 * Count how many times playerA and playerB have played against each other as opponents
 */
export const countPreviousRivalries = (
  playerAId: string,
  playerBId: string,
  previousMatches: Match[]
): number => {
  let count = 0;
  for (const m of previousMatches) {
    if (
      (m.teamA.playerIds.includes(playerAId) && m.teamB.playerIds.includes(playerBId)) ||
      (m.teamB.playerIds.includes(playerAId) && m.teamA.playerIds.includes(playerBId))
    ) {
      count++;
    }
  }
  return count;
};

/**
 * Check if two fixed teams have already played against each other
 */
export const haveFixedTeamsPlayed = (
  teamAPlayerIds: string[],
  teamBPlayerIds: string[],
  previousMatches: Match[]
): boolean => {
  return previousMatches.some(m => {
    const isAvsB = 
      teamAPlayerIds.every(id => m.teamA.playerIds.includes(id)) &&
      teamBPlayerIds.every(id => m.teamB.playerIds.includes(id));
    const isBvsA = 
      teamAPlayerIds.every(id => m.teamB.playerIds.includes(id)) &&
      teamBPlayerIds.every(id => m.teamA.playerIds.includes(id));
    return isAvsB || isBvsA;
  });
};

export const generateRandomRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  const shuffled = shuffle(players);
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(shuffled.length / 4));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 4;
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [shuffled[offset].id, shuffled[offset + 1].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [shuffled[offset + 2].id, shuffled[offset + 3].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateMexicanoRound = (
  players: Player[], 
  courts: number, 
  roundNumber: number,
  previousMatches: Match[] = []
): Match[] => {
  // Sort players by points descending, then winRate descending, then wins, then seed
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.seed - b.seed;
  });
  
  const maxMatches = Math.min(courts, Math.floor(sortedPlayers.length / 4));
  if (maxMatches <= 0) return [];

  const neededPlayers = maxMatches * 4;
  let activePlayers: Player[] = [];

  // Fair Bench Rotation if we have more players than court capacity
  if (sortedPlayers.length > neededPlayers) {
    const pool = [...sortedPlayers];
    pool.sort((a, b) => {
      if ((a.matchesPlayed || 0) !== (b.matchesPlayed || 0)) {
        return (a.matchesPlayed || 0) - (b.matchesPlayed || 0);
      }
      return b.points - a.points;
    });
    const selected = pool.slice(0, neededPlayers);
    activePlayers = selected.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return a.seed - b.seed;
    });
  } else {
    activePlayers = sortedPlayers.slice(0, neededPlayers);
  }

  const matches: Match[] = [];

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 4;
    const p1 = activePlayers[offset];
    const p2 = activePlayers[offset + 1];
    const p3 = activePlayers[offset + 2];
    const p4 = activePlayers[offset + 3];

    // Three pairing options per court:
    // Option 1 (Formula Standar Kompetitif): (1 + 4) vs (2 + 3)
    // Option 2 (Alternatif Balance): (1 + 3) vs (2 + 4)
    // Option 3 (Alternatif Top vs Low): (1 + 2) vs (3 + 4)
    const options = [
      {
        teamA: [p1, p4],
        teamB: [p2, p3],
        partnerPenalty: countPreviousPartnerships(p1.id, p4.id, previousMatches) + countPreviousPartnerships(p2.id, p3.id, previousMatches),
        preference: 1
      },
      {
        teamA: [p1, p3],
        teamB: [p2, p4],
        partnerPenalty: countPreviousPartnerships(p1.id, p3.id, previousMatches) + countPreviousPartnerships(p2.id, p4.id, previousMatches),
        preference: 2
      },
      {
        teamA: [p1, p2],
        teamB: [p3, p4],
        partnerPenalty: countPreviousPartnerships(p1.id, p2.id, previousMatches) + countPreviousPartnerships(p3.id, p4.id, previousMatches),
        preference: 3
      }
    ];

    // Prioritize lowest partner penalty (repetition avoidance), then preference
    options.sort((a, b) => {
      if (a.partnerPenalty !== b.partnerPenalty) return a.partnerPenalty - b.partnerPenalty;
      return a.preference - b.preference;
    });

    const chosen = options[0];

    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [chosen.teamA[0].id, chosen.teamA[1].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [chosen.teamB[0].id, chosen.teamB[1].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateRandomMixRound = (players: Player[], courts: number, roundNumber: number): Match[] => {
  const males = shuffle(players.filter(p => p.gender === 'male'));
  const females = shuffle(players.filter(p => p.gender === 'female'));
  
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(males.length, females.length) / 2));

  for (let i = 0; i < maxMatches; i++) {
    const mOffset = i * 2;
    const fOffset = i * 2;
    
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [males[mOffset].id, females[fOffset].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [males[mOffset + 1].id, females[fOffset + 1].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  
  // Shuffle matches and re-assign court numbers for better randomness
  return shuffle(matches).map((m, idx) => ({ ...m, court: idx + 1 }));
};

export const generateMexicanoMixRound = (
  players: Player[], 
  courts: number, 
  roundNumber: number,
  previousMatches: Match[] = []
): Match[] => {
  const males = [...players].filter(p => p.gender === 'male');
  const females = [...players].filter(p => p.gender === 'female');

  if (males.length < 2 || females.length < 2) return [];

  const maxMatches = Math.min(courts, Math.floor(males.length / 2), Math.floor(females.length / 2));
  if (maxMatches === 0) return [];

  const neededMales = maxMatches * 2;
  const neededFemales = maxMatches * 2;

  // Fair bench rotation: prioritize players who played fewer matches, then leaderboard points
  const selectActive = (group: Player[], needed: number) => {
    if (group.length === needed) {
      return [...group].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return (a.seed || 0) - (b.seed || 0);
      });
    }
    const sorted = [...group].sort((a, b) => {
      const mA = countPlayerMatches(a.id, previousMatches);
      const mB = countPlayerMatches(b.id, previousMatches);
      if (mA !== mB) return mA - mB;
      if (b.points !== a.points) return b.points - a.points;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return (a.seed || 0) - (b.seed || 0);
    });
    const chosen = sorted.slice(0, needed);
    // Sort selected players by points for court assignment (top courts get best players)
    return chosen.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return (a.seed || 0) - (b.seed || 0);
    });
  };

  const activeMales = selectActive(males, neededMales);
  const activeFemales = selectActive(females, neededFemales);

  const matches: Match[] = [];

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 2;
    const m1 = activeMales[offset];
    const m2 = activeMales[offset + 1];
    const f1 = activeFemales[offset];
    const f2 = activeFemales[offset + 1];

    if (m1 && f1 && m2 && f2) {
      // Balanced Cross: Tim A: M1 + F2 vs Tim B: M2 + F1
      // Alternatif: Tim A: M1 + F1 vs Tim B: M2 + F2
      const opt1Penalty = countPreviousPartnerships(m1.id, f2.id, previousMatches) + countPreviousPartnerships(m2.id, f1.id, previousMatches);
      const opt2Penalty = countPreviousPartnerships(m1.id, f1.id, previousMatches) + countPreviousPartnerships(m2.id, f2.id, previousMatches);

      let teamAPlayers: [Player, Player];
      let teamBPlayers: [Player, Player];

      if (opt1Penalty <= opt2Penalty) {
        teamAPlayers = [m1, f2];
        teamBPlayers = [m2, f1];
      } else {
        teamAPlayers = [m1, f1];
        teamBPlayers = [m2, f2];
      }

      matches.push({
        id: Math.random().toString(36).substr(2, 9),
        teamA: { playerIds: [teamAPlayers[0].id, teamAPlayers[1].id], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [teamBPlayers[0].id, teamBPlayers[1].id], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: i + 1,
        round: roundNumber
      });
    }
  }
  return matches;
};

export const generateAmericanoMixRound = (
  players: Player[], 
  courts: number, 
  roundNumber: number,
  previousMatches: Match[] = []
): Match[] => {
  const males = [...players.filter(p => p.gender === 'male')];
  const females = [...players.filter(p => p.gender === 'female')];
  
  if (males.length < 2 || females.length < 2) return [];

  const maxMatches = Math.min(courts, Math.floor(males.length / 2), Math.floor(females.length / 2));
  if (maxMatches === 0) return [];

  const neededMales = maxMatches * 2;
  const neededFemales = maxMatches * 2;

  // Fair selection if uneven: prioritize players who played fewer matches
  const selectActive = (group: Player[], needed: number) => {
    if (group.length === needed) return [...group];
    const sorted = [...group].sort((a, b) => {
      const mA = countPlayerMatches(a.id, previousMatches);
      const mB = countPlayerMatches(b.id, previousMatches);
      if (mA !== mB) return mA - mB;
      return (a.seed || 0) - (b.seed || 0) || a.id.localeCompare(b.id);
    });
    return sorted.slice(0, needed);
  };

  const activeMales = selectActive(males, neededMales);
  const activeFemales = selectActive(females, neededFemales);

  // Shift females to rotate partners each round
  const shift = (roundNumber - 1) % activeFemales.length;
  const shiftedFemales = [...activeFemales.slice(shift), ...activeFemales.slice(0, shift)];

  const matches: Match[] = [];
  for (let i = 0; i < maxMatches; i++) {
    const t1_m = activeMales[i * 2];
    const t1_f = shiftedFemales[i * 2];
    const t2_m = activeMales[i * 2 + 1];
    const t2_f = shiftedFemales[i * 2 + 1];

    if (t1_m && t1_f && t2_m && t2_f) {
      matches.push({
        id: Math.random().toString(36).substr(2, 9),
        teamA: { playerIds: [t1_m.id, t1_f.id], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [t2_m.id, t2_f.id], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: i + 1,
        round: roundNumber
      });
    }
  }
  
  return matches;
};

export const generateFixedTeams = (players: Player[]): { p1: Player, p2: Player }[] => {
  const teams: { p1: Player, p2: Player }[] = [];
  for (let i = 0; i < players.length; i += 2) {
    if (players[i] && players[i + 1]) {
      teams.push({ p1: players[i], p2: players[i + 1] });
    }
  }
  return teams;
};

export const generateAmericanoFixMatches = (players: Player[], rounds: number = 1): Match[] => {
  const teams = generateFixedTeams(players);
  const matches: Match[] = [];
  const numTeams = teams.length;
  if (numTeams < 2) return [];

  // Circle Method for Round Robin
  const teamList = [...teams];
  const numRounds = numTeams - 1;
  const half = numTeams / 2;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < numRounds; i++) {
      for (let j = 0; j < half; j++) {
        const teamA = teamList[j];
        const teamB = teamList[numTeams - 1 - j];
        
        matches.push({
          id: Math.random().toString(36).substr(2, 9),
          teamA: { playerIds: [teamA.p1.id, teamA.p2.id], score: 0, sets: 0, games: 0 },
          teamB: { playerIds: [teamB.p1.id, teamB.p2.id], score: 0, sets: 0, games: 0 },
          status: 'pending',
          court: j + 1,
          round: i + 1 + (r * numRounds)
        });
      }
      // Rotate
      if (numTeams > 2) {
        teamList.splice(1, 0, teamList.pop()!);
      }
    }
  }
  return matches;
};

export const generateMexicanoFixRound = (
  players: Player[], 
  courts: number, 
  roundNumber: number,
  previousMatches: Match[] = []
): Match[] => {
  const teams = generateFixedTeams(players);
  
  // Sort teams by total points of players, then by average winRate
  const sortedTeams = [...teams].sort((a, b) => {
    const pointsA = a.p1.points + a.p2.points;
    const pointsB = b.p1.points + b.p2.points;
    if (pointsB !== pointsA) return pointsB - pointsA;
    const winRateA = (a.p1.winRate + a.p2.winRate) / 2;
    const winRateB = (b.p1.winRate + b.p2.winRate) / 2;
    return winRateB - winRateA;
  });

  const maxMatches = Math.min(courts, Math.floor(sortedTeams.length / 2));
  if (maxMatches <= 0) return [];

  // Match teams by ranking proximity with rematch avoidance
  const matchedPairs: { teamA: { p1: Player, p2: Player }, teamB: { p1: Player, p2: Player } }[] = [];
  const teamList = [...sortedTeams];

  let idx = 0;
  while (idx < maxMatches * 2) {
    if (idx + 1 >= teamList.length) break;

    const t1 = teamList[idx];
    const t2 = teamList[idx + 1];

    const t1Ids = [t1.p1.id, t1.p2.id];
    const t2Ids = [t2.p1.id, t2.p2.id];

    const alreadyPlayed = haveFixedTeamsPlayed(t1Ids, t2Ids, previousMatches);

    // If already played, attempt swap with adjacent pair (t3, t4)
    if (alreadyPlayed && idx + 3 < teamList.length) {
      const t3 = teamList[idx + 2];
      const t4 = teamList[idx + 3];

      const t3Ids = [t3.p1.id, t3.p2.id];
      const t4Ids = [t4.p1.id, t4.p2.id];

      // Option A: T1 vs T3 and T2 vs T4
      const played13 = haveFixedTeamsPlayed(t1Ids, t3Ids, previousMatches);
      const played24 = haveFixedTeamsPlayed(t2Ids, t4Ids, previousMatches);

      // Option B: T1 vs T4 and T2 vs T3
      const played14 = haveFixedTeamsPlayed(t1Ids, t4Ids, previousMatches);
      const played23 = haveFixedTeamsPlayed(t2Ids, t3Ids, previousMatches);

      if (!played13 && !played24) {
        matchedPairs.push({ teamA: t1, teamB: t3 });
        matchedPairs.push({ teamA: t2, teamB: t4 });
        idx += 4;
        continue;
      } else if (!played14 && !played23) {
        matchedPairs.push({ teamA: t1, teamB: t4 });
        matchedPairs.push({ teamA: t2, teamB: t3 });
        idx += 4;
        continue;
      }
    }

    matchedPairs.push({ teamA: t1, teamB: t2 });
    idx += 2;
  }

  const matches: Match[] = [];
  for (let i = 0; i < Math.min(courts, matchedPairs.length); i++) {
    const pair = matchedPairs[i];
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [pair.teamA.p1.id, pair.teamA.p2.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [pair.teamB.p1.id, pair.teamB.p2.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateAmericanoFixRound = (players: Player[], roundNumber: number): Match[] => {
  const teams = generateFixedTeams(players);
  const numTeams = teams.length;
  if (numTeams < 2) return [];

  const teamList = [...teams];
  const numRounds = numTeams - 1;
  const currentRound = (roundNumber - 1) % numRounds;

  // Rotate to the correct round using Circle Method
  for (let i = 0; i < currentRound; i++) {
    if (numTeams > 2) {
      teamList.splice(1, 0, teamList.pop()!);
    }
  }

  const matches: Match[] = [];
  const half = numTeams / 2;
  for (let j = 0; j < half; j++) {
    const teamA = teamList[j];
    const teamB = teamList[numTeams - 1 - j];
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [teamA.p1.id, teamA.p2.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [teamB.p1.id, teamB.p2.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: j + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateMatches = (players: Player[], type: GameType, rounds: number = 1, clubs?: { id: string, name: string }[]): Match[] => {
  const matches: Match[] = [];
  
  if (type === 'Club Americano') {
    if (!clubs || clubs.length < 2) return [];
    for (let r = 0; r < rounds; r++) {
      matches.push(...generateClubRandomRound(players, clubs, 99, r + 1));
    }
    return matches;
  } else if (type === 'Club Mexicano') {
    if (!clubs || clubs.length < 2) return [];
    // Round 1 is random
    matches.push(...generateClubRandomRound(players, clubs, 99, 1));
    // Subsequent rounds would need to be generated one by one in App.tsx
    return matches;
  } else if (type === 'Club Fix Americano') {
    if (!clubs || clubs.length < 2) return [];
    for (let r = 0; r < rounds; r++) {
      matches.push(...generateClubFixAmericanoRound(players, clubs, r + 1));
    }
    return matches;
  }

  if (type === 'Mexicano') {
    // Mexicano: Round 1 is randomized draw
    return generateRandomRound(players, 99, 1);
  } else if (type === 'Mexicano Mix') {
    return generateRandomMixRound(players, 99, 1);
  } else if (type === 'Americano Mix') {
    for (let r = 0; r < rounds; r++) {
      matches.push(...generateAmericanoMixRound(players, 99, r + 1));
    }
    return matches;
  } else if (type === 'Americano Fix') {
    return generateAmericanoFixMatches(players, rounds);
  } else if (type === 'Mexicano Fix') {
    // Round 1 is random pairing of teams
    const teams = generateFixedTeams(players);
    const shuffledTeams = shuffle(teams);
    for (let j = 0; j < Math.floor(shuffledTeams.length / 2); j++) {
      const t1 = shuffledTeams[j * 2];
      const t2 = shuffledTeams[j * 2 + 1];
      matches.push({
        id: Math.random().toString(36).substr(2, 9),
        teamA: { playerIds: [t1.p1.id, t1.p2.id], score: 0, sets: 0, games: 0 },
        teamB: { playerIds: [t2.p1.id, t2.p2.id], score: 0, sets: 0, games: 0 },
        status: 'pending',
        court: j + 1,
        round: 1,
      });
    }
  } else {
    // Americano: Rotating/Random partners
    // We maintain a pool and shift it per round to ensure "evenness" 
    // (no one is left out twice in a row if counts are uneven).
    let playerPool = shuffle(players);

    for (let r = 0; r < rounds; r++) {
      const currentRoundPool = [...playerPool];
      const numMatches = Math.floor(currentRoundPool.length / 4);
      
      for (let j = 0; j < numMatches; j++) {
        const p1 = currentRoundPool[j * 4];
        const p2 = currentRoundPool[j * 4 + 1];
        const p3 = currentRoundPool[j * 4 + 2];
        const p4 = currentRoundPool[j * 4 + 3];

        matches.push({
          id: Math.random().toString(36).substr(2, 9),
          teamA: { playerIds: [p1.id, p2.id], score: 0, sets: 0, games: 0 },
          teamB: { playerIds: [p3.id, p4.id], score: 0, sets: 0, games: 0 },
          status: 'pending',
          court: j + 1,
          round: r + 1,
        });
      }
      
      // Rotate pool for the next round to change who is "left out"
      // and ensure everyone plays an even amount of games over time.
      if (playerPool.length > 0) {
        const first = playerPool.shift()!;
        playerPool.push(first);
      }
    }
  }
  
  return matches;
};

export const generateClubRandomRound = (players: Player[], clubs: { id: string, name: string }[], courts: number, roundNumber: number): Match[] => {
  const clubAPlayers = shuffle(players.filter(p => p.clubId === clubs[0].id));
  const clubBPlayers = shuffle(players.filter(p => p.clubId === clubs[1].id));
  
  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(clubAPlayers.length, clubBPlayers.length) / 2));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 2;
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [clubAPlayers[offset].id, clubAPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [clubBPlayers[offset].id, clubBPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateClubMexicanoRound = (players: Player[], clubs: { id: string, name: string }[], courts: number, roundNumber: number): Match[] => {
  const clubAPlayers = [...players].filter(p => p.clubId === clubs[0].id).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });
  const clubBPlayers = [...players].filter(p => p.clubId === clubs[1].id).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.winRate - a.winRate;
  });

  const matches: Match[] = [];
  const maxMatches = Math.min(courts, Math.floor(Math.min(clubAPlayers.length, clubBPlayers.length) / 2));

  for (let i = 0; i < maxMatches; i++) {
    const offset = i * 2;
    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [clubAPlayers[offset].id, clubAPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [clubBPlayers[offset].id, clubBPlayers[offset + 1].id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const generateClubFixAmericanoRound = (players: Player[], clubs: { id: string, name: string }[], roundNumber: number): Match[] => {
  const clubAPlayers = players.filter(p => p.clubId === clubs[0].id);
  const clubBPlayers = players.filter(p => p.clubId === clubs[1].id);
  
  const teamsA = generateFixedTeams(clubAPlayers);
  const teamsB = generateFixedTeams(clubBPlayers);
  
  const numTeams = Math.min(teamsA.length, teamsB.length);
  const matches: Match[] = [];

  for (let i = 0; i < numTeams; i++) {
    // Rotate teamsB based on roundNumber
    const bIndex = (i + roundNumber - 1) % teamsB.length;
    const tA = teamsA[i];
    const tB = teamsB[bIndex];

    matches.push({
      id: Math.random().toString(36).substr(2, 9),
      teamA: { playerIds: [tA.p1.id, tA.p2.id], score: 0, sets: 0, games: 0 },
      teamB: { playerIds: [tB.p1.id, tB.p2.id], score: 0, sets: 0, games: 0 },
      status: 'pending',
      court: i + 1,
      round: roundNumber
    });
  }
  return matches;
};

export const getNextTennisScore = (current: number | string): string | number => {
  if (current === 0) return 15;
  if (current === 15) return 30;
  if (current === 30) return 40;
  return 'Game';
};
