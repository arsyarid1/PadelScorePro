import React, { useState, useEffect, useMemo } from 'react';
import { tournamentService } from '../services/tournamentService';
import { Tournament, Match, Player, PlayerTournamentStats } from '../types';
import { ScoreBroadcast } from '../lib/supabase';
import { calculatePlayerStats, getMaxMatchesPlayed } from '../utils/gameLogic';
import MatchShareModal from './MatchShareModal';

interface SpectatorViewProps {
  tournament: Tournament;
  onExit: () => void;
}

const SpectatorView: React.FC<SpectatorViewProps> = ({ tournament, onExit }) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard'>('matches');
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'male' | 'female'>('all');
  const [liveScores, setLiveScores] = useState<{ [courtId: number]: ScoreBroadcast }>({});
  const [isKicked, setIsKicked] = useState(false);
  const [shareMatch, setShareMatch] = useState<Match | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const cleanup = tournamentService.subscribe(
      tournament.id,
      (score) => {
        setLiveScores(prev => ({ ...prev, [score.courtId]: score }));
      },
      (event) => {
        if (event.type === 'KICK_ALL') {
          setIsKicked(true);
        }
      }
    );

    return () => cleanup();
  }, [tournament.id]);

  // Compute player tournament statistics
  const maxMatches = useMemo(() => getMaxMatchesPlayed(tournament.matches), [tournament.matches]);
  const isRally = tournament.scoring === 'Rally Points';

  const playersWithStats = useMemo(() => {
    return tournament.players.map(player => ({
      ...player,
      stats: calculatePlayerStats(
        player.id,
        tournament.matches,
        maxMatches,
        isRally ? tournament.maxPoints : undefined
      )
    })).sort((a, b) => {
      if (b.stats.totalPoints !== a.stats.totalPoints) {
        return b.stats.totalPoints - a.stats.totalPoints;
      }
      if (b.stats.diff !== a.stats.diff) {
        return b.stats.diff - a.stats.diff;
      }
      return b.stats.wins - a.stats.wins;
    });
  }, [tournament.players, tournament.matches, maxMatches, isRally, tournament.maxPoints]);

  const malePlayers = useMemo(() => playersWithStats.filter(p => p.gender === 'male'), [playersWithStats]);
  const femalePlayers = useMemo(() => playersWithStats.filter(p => p.gender === 'female'), [playersWithStats]);

  const displayedPlayers = useMemo(() => {
    if (leaderboardFilter === 'male') return malePlayers;
    if (leaderboardFilter === 'female') return femalePlayers;
    return playersWithStats;
  }, [leaderboardFilter, malePlayers, femalePlayers, playersWithStats]);

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const grouped = new Map<number, Match[]>();
    tournament.matches.forEach(m => {
      const list = grouped.get(m.round) || [];
      list.push(m);
      grouped.set(m.round, list);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => b - a); // latest round first
  }, [tournament.matches]);

  const getPlayer = (id: string): Player | undefined => {
    return tournament.players.find(p => p.id === id);
  };

  const getPlayerNames = (ids: string[]) => {
    return ids.map(id => getPlayer(id)?.name || 'Unknown').join(' / ');
  };

  const handleShareTournament = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${tournament.name} - PadelScore Pro`,
        text: `Ikuti live match dan klasemen turnamen ${tournament.name} secara real-time!`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
    }
  };

  if (isKicked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background-dark text-white text-center">
        <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 animate-pulse">
          <span className="material-symbols-outlined text-6xl">sports_tennis</span>
        </div>
        <h2 className="text-3xl font-black uppercase italic mb-2">Turnamen Berakhir</h2>
        <p className="text-slate-400 mb-8 max-w-xs">Turnamen ini telah berakhir. Terima kasih telah menonton!</p>
        <button 
          onClick={onExit}
          className="w-full max-w-xs h-16 bg-primary text-background-dark font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const isMixType = tournament.type.includes('Mix');
  const liveCount = tournament.matches.filter(m => m.status === 'live').length;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background-dark text-white font-display overflow-hidden select-none">
      {/* Header */}
      <header className="px-4 py-3 md:px-8 md:py-4 border-b border-primary/10 flex justify-between items-center bg-surface-dark/95 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onExit}
            className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all shrink-0 text-slate-400 hover:text-white"
            title="Kembali"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-xl font-black uppercase italic tracking-tighter text-white truncate">
                {tournament.name}
              </h1>
              {liveCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse shrink-0">
                  <span className="size-1.5 rounded-full bg-red-500"></span>
                  LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[9px] font-black uppercase tracking-wider shrink-0">
                  {tournament.status === 'finished' ? 'FINISHED' : 'ACTIVE'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">
              {tournament.type} • {tournament.scoring} • {tournament.courts} Lapangan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareTournament}
            className="h-9 md:h-10 px-3 md:px-4 rounded-xl bg-primary text-background-dark font-black uppercase text-[10px] md:text-xs tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,255,204,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm md:text-base">share</span>
            <span>{copyFeedback ? 'Link Disalin!' : 'Bagikan'}</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-center px-4 py-2 border-b border-white/5 bg-background-dark/80 shrink-0">
        <div className="flex bg-surface-dark p-1 rounded-xl border border-white/10 w-full max-w-md">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'matches' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-sm">sports_tennis</span>
            <span>Matches ({tournament.matches.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'leaderboard' ? 'bg-primary text-background-dark shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="material-symbols-outlined text-sm">leaderboard</span>
            <span>Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto w-full">
          {activeTab === 'matches' ? (
            /* TAB 1: MATCHES LIST */
            <div className="space-y-6">
              {matchesByRound.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <span className="material-symbols-outlined text-5xl mb-2 opacity-40">sports_tennis</span>
                  <p className="text-sm uppercase font-bold tracking-wider">Belum ada pertandingan</p>
                </div>
              ) : (
                matchesByRound.map(([roundNum, roundMatches]) => (
                  <div key={roundNum} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Round {roundNum}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">• {roundMatches.length} Pertandingan</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {roundMatches.map(match => {
                        const courtScore = liveScores[match.court];
                        const isMatchLive = match.status === 'live';
                        const isMatchFinished = match.status === 'finished';

                        // Score to display
                        const scoreA = isMatchLive && courtScore ? courtScore.teamA.score : match.teamA.score;
                        const scoreB = isMatchLive && courtScore ? courtScore.teamB.score : match.teamB.score;

                        const teamAName = getPlayerNames(match.teamA.playerIds);
                        const teamBName = getPlayerNames(match.teamB.playerIds);

                        const pA1 = getPlayer(match.teamA.playerIds[0]);
                        const pA2 = getPlayer(match.teamA.playerIds[1]);
                        const pB1 = getPlayer(match.teamB.playerIds[0]);
                        const pB2 = getPlayer(match.teamB.playerIds[1]);

                        const isTeamAWinner = isMatchFinished && scoreA > scoreB;
                        const isTeamBWinner = isMatchFinished && scoreB > scoreA;

                        return (
                          <div 
                            key={match.id}
                            className={`rounded-2xl border p-4 transition-all relative overflow-hidden ${isMatchLive ? 'bg-surface border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)]' : 'bg-surface border-white/5 hover:border-white/15'}`}
                          >
                            {/* Card Top Pill: Court & Status */}
                            <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-wider">
                              <span className="text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                                Lapangan {match.court}
                              </span>
                              {isMatchLive ? (
                                <span className="text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/40 flex items-center gap-1 animate-pulse">
                                  <span className="size-1.5 rounded-full bg-red-500"></span>
                                  LIVE
                                </span>
                              ) : isMatchFinished ? (
                                <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">check_circle</span>
                                  SELESAI
                                </span>
                              ) : (
                                <span className="text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                                  SCHEDULED
                                </span>
                              )}
                            </div>

                            {/* Match Teams & Score */}
                            <div className="space-y-2">
                              {/* Team A */}
                              <div className={`flex items-center justify-between p-2 rounded-xl transition-all ${isTeamAWinner ? 'bg-primary/10 border border-primary/20' : 'bg-background-dark/40'}`}>
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                  <div className="flex items-center shrink-0">
                                    {pA1 && <img src={pA1.avatarUrl} alt="" className="size-7 rounded-lg border border-white/10 object-cover" />}
                                    {pA2 && <img src={pA2.avatarUrl} alt="" className="size-7 rounded-lg border border-white/10 object-cover -ml-3" />}
                                  </div>
                                  <p className={`text-xs md:text-sm font-bold uppercase tracking-tight truncate ${isTeamAWinner ? 'text-primary' : 'text-white'}`}>
                                    {teamAName}
                                  </p>
                                </div>
                                <span className={`text-xl md:text-2xl font-black shrink-0 ${isTeamAWinner ? 'text-primary' : 'text-white'}`}>
                                  {scoreA}
                                </span>
                              </div>

                              {/* Team B */}
                              <div className={`flex items-center justify-between p-2 rounded-xl transition-all ${isTeamBWinner ? 'bg-primary/10 border border-primary/20' : 'bg-background-dark/40'}`}>
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                  <div className="flex items-center shrink-0">
                                    {pB1 && <img src={pB1.avatarUrl} alt="" className="size-7 rounded-lg border border-white/10 object-cover" />}
                                    {pB2 && <img src={pB2.avatarUrl} alt="" className="size-7 rounded-lg border border-white/10 object-cover -ml-3" />}
                                  </div>
                                  <p className={`text-xs md:text-sm font-bold uppercase tracking-tight truncate ${isTeamBWinner ? 'text-primary' : 'text-white'}`}>
                                    {teamBName}
                                  </p>
                                </div>
                                <span className={`text-xl md:text-2xl font-black shrink-0 ${isTeamBWinner ? 'text-primary' : 'text-white'}`}>
                                  {scoreB}
                                </span>
                              </div>
                            </div>

                            {/* Card Action for Finished Matches: Share */}
                            {isMatchFinished && (
                              <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-end">
                                <button
                                  onClick={() => setShareMatch(match)}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-primary hover:text-background-dark text-slate-300 font-black uppercase text-[9px] tracking-wider flex items-center gap-1.5 transition-all"
                                >
                                  <span className="material-symbols-outlined text-xs">share</span>
                                  <span>Bagikan Skor</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* TAB 2: LEADERBOARD TABLE (PDLUP COLUMNS) */
            <div className="space-y-6">
              {/* Filter pills if Mix tournament */}
              {isMixType && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setLeaderboardFilter('all')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${leaderboardFilter === 'all' ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'}`}
                  >
                    Semua ({playersWithStats.length})
                  </button>
                  <button
                    onClick={() => setLeaderboardFilter('male')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${leaderboardFilter === 'male' ? 'bg-cyan-500 text-background-dark shadow-md shadow-cyan-500/20' : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'}`}
                  >
                    Pria ({malePlayers.length})
                  </button>
                  <button
                    onClick={() => setLeaderboardFilter('female')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${leaderboardFilter === 'female' ? 'bg-pink-500 text-background-dark shadow-md shadow-pink-500/20' : 'bg-surface-dark text-slate-400 hover:text-white border border-white/5'}`}
                  >
                    Wanita ({femalePlayers.length})
                  </button>
                </div>
              )}

              {/* Top 3 Podium Cards */}
              {displayedPlayers.length >= 3 && (
                <div className="grid grid-cols-3 gap-2 md:gap-4 items-end pt-4 pb-2">
                  {/* Rank 2 - Silver */}
                  {displayedPlayers[1] && (
                    <div className="bg-surface border border-slate-400/20 rounded-2xl p-3 md:p-5 flex flex-col items-center text-center relative order-1">
                      <div className="size-6 md:size-8 rounded-full bg-slate-400/20 text-slate-300 flex items-center justify-center font-black text-xs md:text-sm mb-2">
                        2
                      </div>
                      <img src={displayedPlayers[1].avatarUrl} alt="" className="size-12 md:size-16 rounded-2xl border-2 border-slate-400/40 object-cover mb-2" />
                      <p className="font-black text-xs md:text-sm uppercase tracking-tight line-clamp-1 w-full text-slate-200">
                        {displayedPlayers[1].name}
                      </p>
                      <span className="text-lg md:text-2xl font-black text-white mt-1">
                        {displayedPlayers[1].stats.totalPoints} <span className="text-[9px] text-slate-400 font-bold">PTS</span>
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                        Diff: {displayedPlayers[1].stats.diff > 0 ? `+${displayedPlayers[1].stats.diff}` : displayedPlayers[1].stats.diff}
                      </span>
                    </div>
                  )}

                  {/* Rank 1 - Gold (Elevated) */}
                  {displayedPlayers[0] && (
                    <div className="bg-surface border-2 border-primary/50 rounded-2xl p-4 md:p-6 flex flex-col items-center text-center relative order-2 shadow-[0_0_40px_rgba(0,255,204,0.15)] -mt-4">
                      <div className="size-7 md:size-9 rounded-full bg-primary text-background-dark flex items-center justify-center font-black text-sm md:text-base mb-2 shadow-lg shadow-primary/30">
                        👑
                      </div>
                      <img src={displayedPlayers[0].avatarUrl} alt="" className="size-14 md:size-20 rounded-2xl border-2 border-primary object-cover mb-2 shadow-lg shadow-primary/20" />
                      <p className="font-black text-xs md:text-base uppercase tracking-tight line-clamp-1 w-full text-primary">
                        {displayedPlayers[0].name}
                      </p>
                      <span className="text-xl md:text-3xl font-black text-primary mt-1">
                        {displayedPlayers[0].stats.totalPoints} <span className="text-[10px] text-primary/70 font-bold">PTS</span>
                      </span>
                      <span className="text-[9px] md:text-[10px] text-primary/70 font-bold uppercase mt-0.5">
                        Diff: {displayedPlayers[0].stats.diff > 0 ? `+${displayedPlayers[0].stats.diff}` : displayedPlayers[0].stats.diff}
                      </span>
                    </div>
                  )}

                  {/* Rank 3 - Bronze */}
                  {displayedPlayers[2] && (
                    <div className="bg-surface border border-amber-600/20 rounded-2xl p-3 md:p-5 flex flex-col items-center text-center relative order-3">
                      <div className="size-6 md:size-8 rounded-full bg-amber-600/20 text-amber-500 flex items-center justify-center font-black text-xs md:text-sm mb-2">
                        3
                      </div>
                      <img src={displayedPlayers[2].avatarUrl} alt="" className="size-12 md:size-16 rounded-2xl border-2 border-amber-600/40 object-cover mb-2" />
                      <p className="font-black text-xs md:text-sm uppercase tracking-tight line-clamp-1 w-full text-amber-200">
                        {displayedPlayers[2].name}
                      </p>
                      <span className="text-lg md:text-2xl font-black text-white mt-1">
                        {displayedPlayers[2].stats.totalPoints} <span className="text-[9px] text-slate-400 font-bold">PTS</span>
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                        Diff: {displayedPlayers[2].stats.diff > 0 ? `+${displayedPlayers[2].stats.diff}` : displayedPlayers[2].stats.diff}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Full PDLUP-style Table */}
              <div className="bg-surface border border-white/5 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-slate-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest">
                        <th className="px-3 md:px-5 py-3.5 text-center w-12 md:w-16">Rank</th>
                        <th className="px-3 md:px-5 py-3.5 text-left">Pemain</th>
                        <th className="px-2 md:px-4 py-3.5 text-center" title="Games / Matches Played">G</th>
                        <th className="px-2 md:px-4 py-3.5 text-center" title="Win - Loss - Tie">W-L-T</th>
                        <th className="px-2 md:px-4 py-3.5 text-center" title="Point Difference">Diff</th>
                        <th className="px-2 md:px-4 py-3.5 text-center text-amber-400/90" title="Compensation Points (+M)">+M</th>
                        <th className="px-3 md:px-6 py-3.5 text-right text-primary" title="Total Points">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {displayedPlayers.map((player, idx) => {
                        const { stats } = player;
                        return (
                          <tr key={player.id} className="group hover:bg-primary/5 transition-colors">
                            {/* Rank */}
                            <td className="px-3 md:px-5 py-3 text-center">
                              <span className={`text-sm md:text-base font-black italic ${idx < 3 ? 'text-primary' : 'text-white/40'}`}>
                                {(idx + 1).toString().padStart(2, '0')}
                              </span>
                            </td>

                            {/* Player Info */}
                            <td className="px-3 md:px-5 py-3">
                              <div className="flex items-center gap-2.5 md:gap-3">
                                <div className="relative shrink-0">
                                  <img src={player.avatarUrl} className="size-8 md:size-9 rounded-xl border border-white/10 object-cover" alt="" />
                                  <span className={`absolute -bottom-1 -right-1 size-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white ${player.gender === 'male' ? 'bg-cyan-500' : 'bg-pink-500'}`}>
                                    {player.gender === 'male' ? 'M' : 'F'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-white uppercase text-xs md:text-sm tracking-tight truncate">
                                    {player.name}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* G (Games played) */}
                            <td className="px-2 md:px-4 py-3 text-center">
                              <span className="text-xs md:text-sm font-bold text-slate-300">
                                {stats.gamesPlayed}
                              </span>
                            </td>

                            {/* W-L-T */}
                            <td className="px-2 md:px-4 py-3 text-center">
                              <span className="text-[11px] md:text-xs font-mono font-semibold text-slate-300">
                                <span className="text-primary font-bold">{stats.wins}</span>-
                                <span className="text-red-400 font-bold">{stats.losses}</span>-
                                <span className="text-slate-400">{stats.ties}</span>
                              </span>
                            </td>

                            {/* Diff */}
                            <td className="px-2 md:px-4 py-3 text-center">
                              <span className={`inline-block px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold font-mono ${stats.diff > 0 ? 'bg-primary/10 text-primary' : stats.diff < 0 ? 'bg-red-500/10 text-red-400' : 'text-slate-400'}`}>
                                {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
                              </span>
                            </td>

                            {/* +M */}
                            <td className="px-2 md:px-4 py-3 text-center">
                              <span className={`text-[11px] md:text-xs font-mono font-bold ${stats.compensationPoints > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                                {stats.compensationPoints > 0 ? `+${stats.compensationPoints}` : '-'}
                              </span>
                            </td>

                            {/* Points */}
                            <td className="px-3 md:px-6 py-3 text-right">
                              <span className="text-base md:text-xl font-black text-primary font-mono">
                                {stats.totalPoints}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* PDLUP Standard Legend Footer */}
                <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-[9px] md:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <span><strong className="text-white">G:</strong> Games Played</span>
                  <span><strong className="text-white">W-L-T:</strong> Menang - Kalah - Seri</span>
                  <span><strong className="text-white">Diff:</strong> Selisih Poin (Skor - Kebobolan)</span>
                  <span><strong className="text-amber-400">+M:</strong> Kompensasi Cadangan</span>
                  <span><strong className="text-primary">Points:</strong> Total Poin Akumulasi</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2.5 px-4 border-t border-white/5 bg-background-dark/95 flex items-center justify-between text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
          <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">PadelScore Pro Live Spectator</p>
        </div>
        <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider">
          Auto-Sync Active
        </p>
      </footer>

      {/* Match Share Modal */}
      {shareMatch && (
        <MatchShareModal
          match={shareMatch}
          tournament={tournament}
          onClose={() => setShareMatch(null)}
        />
      )}
    </div>
  );
};

export default SpectatorView;
