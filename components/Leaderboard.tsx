
import React, { useState } from 'react';
import { Tournament, Gender, Player, MatchHistoryEntry, PlayerTournamentStats, Match } from '../types';
import TournamentBracket from './TournamentBracket';
import { calculatePlayerStats, getMaxMatchesPlayed } from '../utils/gameLogic';
import LeaderboardShareModal from './LeaderboardShareModal';
import MatchShareModal from './MatchShareModal';
import ErrorBoundary from './ErrorBoundary';

interface ScoreDetailModalProps {
  player: Player & { stats?: PlayerTournamentStats };
  tournament: Tournament;
  onShareMatch?: (match: Match) => void;
  onClose: () => void;
}

const ScoreDetailModal: React.FC<ScoreDetailModalProps> = ({ player, tournament, onShareMatch, onClose }) => {
  const totalPoints = player.stats ? player.stats.totalPoints : (player.matchHistory?.reduce((sum, entry) => sum + (typeof entry.score_us === 'number' ? entry.score_us : 0), 0) || player.points || 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-surface-dark border border-primary/20 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <img src={player.avatarUrl} className="size-12 rounded-xl border border-white/10" alt={player.name} />
            <div>
              <h2 className="text-lg font-black uppercase italic text-white">{player.name}</h2>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Score History</p>
            </div>
          </div>
          <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 bg-primary/5 border-b border-white/5 shrink-0">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Points Earned</p>
            <p className="text-2xl font-black text-primary italic">{totalPoints}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {!player.matchHistory || player.matchHistory.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">history</span>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No match history yet</p>
            </div>
          ) : (
            [...player.matchHistory].reverse().map((entry, idx) => {
              const matchedMatch = tournament.matches.find(m => m.id === entry.matchId);
              return (
                <div key={entry.matchId + idx} className="p-4 rounded-xl bg-background-dark border border-white/5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${entry.result === 'Win' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {entry.result}
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{entry.type}</span>
                    </div>
                    <p className="text-xs font-bold text-white truncate">vs {entry.opponent}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-black text-white italic">
                        {entry.score_us} - {entry.score_them}
                      </p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                    </div>
                    {matchedMatch && onShareMatch && (
                      <button
                        onClick={() => onShareMatch(matchedMatch)}
                        className="size-9 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-background-dark flex items-center justify-center transition-all border border-primary/20"
                        title="Bagikan Kartu Skor Laga Ini"
                      >
                        <span className="material-symbols-outlined text-base">share</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 border-t border-white/5 shrink-0">
          <button 
            onClick={onClose}
            className="w-full h-14 bg-surface-dark border border-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface LeaderboardProps {
  tournament: Tournament;
  onGoLive: () => void;
  onEnd: () => void;
  onUpdatePlayerName: (playerId: string, newName: string) => void;
  onAddPlayer: (name: string, gender: Gender) => void;
  onExit?: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ tournament, onGoLive, onEnd, onUpdatePlayerName, onAddPlayer, onExit }) => {
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('male');
  const [leaderboardType, setLeaderboardType] = useState<'individual' | 'club'>(tournament.clubs ? 'club' : 'individual');
  const [selectedPlayer, setSelectedPlayer] = useState<(Player & { stats: PlayerTournamentStats }) | null>(null);
  const [mixGenderTab, setMixGenderTab] = useState<'both' | 'male' | 'female'>('both');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMatch, setShareMatch] = useState<Match | null>(null);

  const isClubMatch = tournament.type.startsWith('Club');
  const isMixMatch = tournament.type === 'Mexicano Mix' || tournament.type === 'Americano Mix';

  const maxMatches = getMaxMatchesPlayed(tournament.players, tournament.matches);

  const playersWithStats = tournament.players.map(p => ({
    ...p,
    stats: calculatePlayerStats(p, tournament.matches, tournament.scoring, maxMatches)
  }));

  const sortedPlayers = [...playersWithStats].sort((a, b) => {
    if (b.stats.totalPoints !== a.stats.totalPoints) return b.stats.totalPoints - a.stats.totalPoints;
    if (b.stats.diff !== a.stats.diff) return b.stats.diff - a.stats.diff;
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    return b.winRate - a.winRate;
  });

  const sortedMales = sortedPlayers.filter(p => p.gender === 'male');
  const sortedFemales = sortedPlayers.filter(p => p.gender === 'female');
  
  const isProfessional = tournament.type === 'Professional Tournament';

  const clubStats = tournament.clubs?.map(club => {
    const clubPlayers = sortedPlayers.filter(p => p.clubId === club.id);
    const totalPoints = clubPlayers.reduce((sum, p) => sum + p.stats.totalPoints, 0);
    const totalWins = clubPlayers.reduce((sum, p) => sum + p.stats.wins, 0);
    
    // For Club Fix Americano, wins are counted per pair, but since each player in a winning pair gets a 'win',
    // totalWins / 2 would be the number of match wins.
    const matchWins = tournament.type === 'Club Fix Americano' ? totalWins / 2 : totalWins;

    return {
      ...club,
      points: totalPoints,
      wins: matchWins,
      playerCount: clubPlayers.length
    };
  }).sort((a, b) => {
    if (tournament.type === 'Club Fix Americano') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.points - a.points;
    }
    return b.points - a.points;
  }) || [];

  const leader = leaderboardType === 'individual' ? sortedPlayers[0] : (clubStats[0] as any);
  const totalPoints = sortedPlayers.reduce((sum, p) => sum + p.stats.totalPoints, 0);

  const handleStartEdit = (pId: string, currentName: string) => {
    setEditingPlayerId(pId);
    setEditValue(currentName);
  };

  const handleSaveEdit = () => {
    if (editingPlayerId && editValue.trim()) {
      onUpdatePlayerName(editingPlayerId, editValue.trim());
    }
    setEditingPlayerId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddPlayer(newName.trim(), newGender);
      setNewName('');
      setShowAddForm(false);
    }
  };

  const isTournamentActive = tournament.status === 'active';

  const renderTableHeaders = (athleteLabel: string = 'Athlete') => (
    <tr className="bg-white/5 border-b border-white/10 text-slate-400 font-black text-[8px] md:text-[10px] uppercase tracking-widest">
      <th className="px-3 md:px-5 py-3.5 text-center w-12 md:w-16">Rank</th>
      <th className="px-3 md:px-5 py-3.5 text-left">{athleteLabel}</th>
      <th className="px-2 md:px-4 py-3.5 text-center" title="Games / Matches Played (Total Pertandingan)">G</th>
      <th className="px-2 md:px-4 py-3.5 text-center" title="Win - Loss - Tie (Menang - Kalah - Seri)">W-L-T</th>
      <th className="px-2 md:px-4 py-3.5 text-center" title="Point Difference (Selisih Poin Scored - Conceded)">Diff</th>
      <th className="px-2 md:px-4 py-3.5 text-center text-amber-400/90" title="Compensation Points (+M) bagi pemain yang benched/bye">+M</th>
      <th className="px-3 md:px-6 py-3.5 text-right text-primary" title="Total Accumulated Points (Match + +M)">Points</th>
      <th className="px-2 md:px-4 py-3.5 text-right w-12">Action</th>
    </tr>
  );

  const renderPlayerRows = (playersList: (Player & { stats: PlayerTournamentStats })[]) => {
    return playersList.map((player, idx) => {
      const { stats } = player;
      return (
        <tr key={player.id} className="group hover:bg-primary/5 transition-colors border-b border-white/[0.03]">
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
                <img src={player.avatarUrl} className="size-8 md:size-9 rounded-xl border border-white/10 object-cover" alt={player.name} />
                <span className={`absolute -bottom-1 -right-1 size-3.5 rounded-full flex items-center justify-center text-[7px] font-black text-white ${player.gender === 'male' ? 'bg-cyan-500' : 'bg-pink-500'}`}>
                  {player.gender === 'male' ? 'M' : 'F'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 group/name">
                  {editingPlayerId === player.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => {
                        if (editValue.trim() && editValue !== player.name) {
                          onUpdatePlayerName(player.id, editValue.trim());
                        }
                        setEditingPlayerId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editValue.trim() && editValue !== player.name) {
                            onUpdatePlayerName(player.id, editValue.trim());
                          }
                          setEditingPlayerId(null);
                        }
                        if (e.key === 'Escape') setEditingPlayerId(null);
                      }}
                      className="bg-white/10 border border-primary/50 rounded px-2 py-0.5 text-white font-bold text-xs md:text-sm w-full outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <>
                      <p className="font-bold text-white uppercase text-xs md:text-sm tracking-tight truncate">{player.name}</p>
                      <button 
                        onClick={() => {
                          setEditingPlayerId(player.id);
                          setEditValue(player.name);
                        }}
                        className="opacity-0 group-hover/name:opacity-100 transition-opacity p-0.5 hover:text-primary"
                      >
                        <span className="material-symbols-outlined text-[11px]">edit</span>
                      </button>
                    </>
                  )}
                  {player.clubId && (
                    <span className="text-[7px] bg-white/5 text-slate-400 px-1 py-0.5 rounded font-black uppercase tracking-tighter shrink-0">
                      {tournament.clubs?.find(c => c.id === player.clubId)?.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>

          {/* G (Games / Matches Played) */}
          <td className="px-2 md:px-4 py-3 text-center">
            <span className="text-xs font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded">
              {stats.gamesPlayed}
            </span>
          </td>

          {/* W-L-T */}
          <td className="px-2 md:px-4 py-3 text-center whitespace-nowrap">
            <span className="text-xs font-bold tracking-wider text-slate-200">
              <span className="text-emerald-400">{stats.wins}</span>-
              <span className="text-red-400">{stats.losses}</span>-
              <span className="text-slate-400">{stats.ties}</span>
            </span>
          </td>

          {/* Diff */}
          <td className="px-2 md:px-4 py-3 text-center whitespace-nowrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded inline-block min-w-[36px] ${
              stats.diff > 0 
                ? 'text-emerald-400 bg-emerald-500/10' 
                : stats.diff < 0 
                ? 'text-red-400 bg-red-500/10' 
                : 'text-slate-400 bg-white/5'
            }`}>
              {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
            </span>
          </td>

          {/* +M (Compensation) */}
          <td className="px-2 md:px-4 py-3 text-center">
            {stats.compensationPoints > 0 ? (
              <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30" title="Poin Kompensasi Cadangan (+M)">
                +{stats.compensationPoints}
              </span>
            ) : (
              <span className="text-xs text-slate-500">0</span>
            )}
          </td>

          {/* Points */}
          <td className="px-3 md:px-6 py-3 text-right">
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center justify-center px-2.5 md:px-3.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 text-xs md:text-sm font-black shadow-[0_0_15px_rgba(0,255,204,0.1)]">
                {stats.totalPoints}
              </span>
            </div>
          </td>

          {/* Action */}
          <td className="px-2 md:px-4 py-3 text-right">
            <button 
              onClick={() => setSelectedPlayer(player)}
              className="size-7 md:size-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-primary hover:border-primary/50 flex items-center justify-center transition-all ml-auto"
              title="View Details"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-background-dark overflow-y-auto">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-background-dark/80 backdrop-blur-md px-4 md:px-10 py-3 md:py-4 shrink-0">
        <div className="flex items-center gap-3 md:gap-6">
          {onExit && (
            <button 
              onClick={onExit} 
              className="size-9 md:size-12 flex items-center justify-center rounded-lg md:rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
            >
              <span className="material-symbols-outlined text-lg">home</span>
            </button>
          )}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="size-8 md:size-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <span className="material-symbols-outlined fill-1 text-sm md:text-base">sports_tennis</span>
            </div>
            <div>
              <h1 className="text-sm md:text-xl font-bold leading-tight tracking-tight text-white line-clamp-1">{tournament.name}</h1>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Season Statistics</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center justify-center size-9 md:size-auto md:px-4 md:h-12 rounded-lg md:rounded-xl bg-surface-dark border border-primary/30 text-primary font-bold text-xs hover:bg-primary/10 transition-all gap-1.5 shadow-[0_0_15px_rgba(0,255,204,0.1)]"
            title="Bagikan Klasemen atau Hasil Pertandingan"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            <span className="hidden sm:inline">Bagikan</span>
          </button>

          {isTournamentActive && (
            <>
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center size-9 md:size-auto md:px-4 md:h-12 rounded-lg md:rounded-xl bg-surface-dark border border-primary/20 text-primary font-bold text-xs hover:bg-primary/10 transition-all"
                title="Add Player"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                <span className="hidden lg:inline ml-2">Add</span>
              </button>
              
              <button 
                onClick={onEnd}
                className="flex items-center justify-center size-9 md:size-auto md:px-4 md:h-12 rounded-lg md:rounded-xl border border-red-500/20 text-red-500 font-bold text-xs hover:bg-red-500/10 transition-all"
                title="End Tournament"
              >
                <span className="material-symbols-outlined text-lg">stop_circle</span>
                <span className="hidden lg:inline ml-2">Finish</span>
              </button>
            </>
          )}
          
          <button 
            onClick={onGoLive}
            className="flex items-center justify-center h-9 md:h-12 px-3 md:px-6 rounded-lg md:rounded-xl bg-primary text-background-dark font-bold text-[10px] md:text-sm transition-transform active:scale-95 shadow-[0_0_15px_rgba(0,255,204,0.2)]"
          >
            <span className="material-symbols-outlined text-lg sm:mr-2">play_arrow</span>
            <span className="hidden sm:inline">
              {tournament.matches.some(m => m.status === 'live') ? 'Active Match' : 'Next Round'}
            </span>
            <span className="sm:hidden">
              {tournament.matches.some(m => m.status === 'live') ? 'Match' : 'Next'}
            </span>
          </button>
        </div>
      </header>

      {/* Finished Tournament Banner */}
      {!isTournamentActive && (
        <div className="mx-4 md:mx-10 mt-4 p-4 md:p-6 rounded-2xl bg-gradient-to-r from-primary/15 via-surface-dark to-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_40px_rgba(0,255,204,0.1)]">
          <div className="flex items-center gap-3 md:gap-4 text-center sm:text-left">
            <div className="size-12 md:size-14 rounded-2xl bg-primary text-background-dark flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-2xl md:text-3xl">emoji_events</span>
            </div>
            <div>
              <h2 className="text-base md:text-xl font-black uppercase italic tracking-tight text-white">
                Turnamen Telah Selesai!
              </h2>
              <p className="text-xs text-slate-300">
                {sortedPlayers[0] ? (
                  <>Selamat kepada <strong className="text-primary">{sortedPlayers[0].name}</strong> sebagai Juara 1 ({sortedPlayers[0].stats.totalPoints} PTS)!</>
                ) : (
                  'Turnamen resmi berakhir.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full sm:w-auto h-11 md:h-12 px-6 rounded-xl bg-primary text-background-dark font-black uppercase text-xs tracking-wider shadow-[0_0_25px_rgba(0,255,204,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            <span>Bagikan Hasil & Skor</span>
          </button>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl">
          <div className="w-full max-w-md bg-surface-dark border border-primary/20 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
               <h2 className="text-lg font-black uppercase italic text-white">Join Pro Hub</h2>
               <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white transition-colors">
                 <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Player Identity</label>
                <input 
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-12 bg-background-dark border border-white/10 rounded-xl px-4 text-white font-bold focus:border-primary transition-all text-sm"
                  placeholder="Enter name..."
                />
              </div>
              <button 
                type="submit"
                className="w-full h-14 bg-primary text-background-dark font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
              >
                Finalize Entry
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row max-w-[1600px] mx-auto w-full p-4 md:p-8 gap-4 md:gap-8 overflow-y-auto lg:overflow-hidden">
        {/* Sidebar Rank info */}
        <aside className="w-full lg:w-80 flex flex-col gap-4 md:gap-6 shrink-0 lg:overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-1 md:gap-2">
            <h2 className="text-xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-none">Standings</h2>
            <p className="text-[#9abcb5] text-[10px] md:text-sm">Global accumulation tracker.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="p-3 md:p-4 rounded-xl bg-surface-dark border border-white/5">
              <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score Pool</p>
              <p className="text-lg md:text-2xl font-bold text-white">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="p-3 md:p-4 rounded-xl bg-surface-dark border border-white/5">
              <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Athletes</p>
              <p className="text-lg md:text-2xl font-bold text-white">{tournament.players.length}</p>
            </div>
          </div>

          {leader && leader.points > 0 && (
            <div className="relative overflow-hidden group p-4 md:p-6 rounded-2xl bg-surface-dark border-2 border-primary/20 podium-rank-1">
              <div className="absolute -right-4 -top-4 text-6xl md:text-8xl font-black text-primary/5 select-none italic">#1</div>
              <div className="relative z-10 flex flex-col gap-3 md:gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="size-12 md:size-16 rounded-xl bg-cover bg-center border-2 border-accent-gold" 
                    style={{ backgroundImage: `url('${leader.avatarUrl}')` }}
                  ></div>
                  <div>
                    <p className="text-[8px] font-bold text-accent-gold uppercase tracking-widest">Global Seed #1</p>
                    <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight">{leader.name}</h3>
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-white/5 pt-3 md:pt-4">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase">Played</p>
                    <p className="text-sm md:text-lg font-bold text-primary">{leader.stats?.gamesPlayed ?? leader.matchesPlayed}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase">Diff</p>
                    <p className={`text-sm md:text-lg font-bold ${leader.stats?.diff > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {leader.stats?.diff > 0 ? `+${leader.stats.diff}` : (leader.stats?.diff ?? 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase">Points</p>
                    <p className="text-sm md:text-lg font-bold text-white">{leader.stats?.totalPoints ?? leader.points}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 List for mobile/compact screens */}
          <div className="grid grid-cols-1 gap-3 sm:hidden md:grid">
            {sortedPlayers.slice(1, 4).filter(p => p.points > 0).map((player, idx) => (
              <div key={player.id} className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-surface-dark border border-white/5 ${idx === 0 ? 'podium-rank-2' : 'podium-rank-3'}`}>
                <div 
                  className={`size-10 md:size-12 rounded-lg bg-cover bg-center border border-white/10`}
                  style={{ backgroundImage: `url('${player.avatarUrl}')` }}
                ></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-white uppercase line-clamp-1">{player.name}</p>
                  <p className="text-xs md:text-sm font-bold text-primary">{player.stats?.totalPoints ?? player.points} PTS</p>
                </div>
                <span className="text-[10px] md:text-xs font-bold text-slate-400">#{idx + 2}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Table/List section */}
        <section className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto custom-scrollbar pb-20 lg:pb-0">
          {isProfessional && tournament.bracket ? (
            <div className="mb-8">
              <div className="flex flex-col gap-1 md:gap-2 mb-6">
                <h2 className="text-xl md:text-3xl font-black tracking-tight text-white uppercase italic leading-none">Tournament Bracket</h2>
                <p className="text-[#9abcb5] text-[10px] md:text-sm">Knockout progression to the championship.</p>
              </div>
              <TournamentBracket bracket={tournament.bracket} players={tournament.players} />
            </div>
          ) : null}

          {isClubMatch && (
            <div className="sticky top-[72px] z-40 flex gap-2 mb-4 p-1 bg-surface-dark/90 backdrop-blur-md rounded-xl border border-white/5 w-fit">
              <button 
                onClick={() => setLeaderboardType('club')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardType === 'club' ? 'bg-primary text-background-dark' : 'text-slate-500 hover:text-white'}`}
              >
                Club Standings
              </button>
              <button 
                onClick={() => setLeaderboardType('individual')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardType === 'individual' ? 'bg-primary text-background-dark' : 'text-slate-500 hover:text-white'}`}
              >
                MVP Race
              </button>
            </div>
          )}

          {isMixMatch && (
            <div className="sticky top-[72px] z-40 flex flex-wrap gap-2 mb-4 p-1 bg-surface-dark/90 backdrop-blur-md rounded-xl border border-white/5 w-fit">
              <button 
                onClick={() => setMixGenderTab('both')}
                className={`px-3 md:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mixGenderTab === 'both' ? 'bg-primary text-background-dark shadow-sm' : 'text-slate-500 hover:text-white'}`}
              >
                Dua Tabel (Pria & Wanita)
              </button>
              <button 
                onClick={() => setMixGenderTab('male')}
                className={`px-3 md:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${mixGenderTab === 'male' ? 'bg-cyan-400 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">male</span>
                <span>Pria ({sortedMales.length})</span>
              </button>
              <button 
                onClick={() => setMixGenderTab('female')}
                className={`px-3 md:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${mixGenderTab === 'female' ? 'bg-pink-400 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">female</span>
                <span>Wanita ({sortedFemales.length})</span>
              </button>
            </div>
          )}

          {isMixMatch && mixGenderTab === 'both' ? (
            <div className="space-y-6">
              {/* Male Table */}
              <div className="bg-surface-dark rounded-xl md:rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                <div className="px-4 md:px-6 py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400 text-lg">male</span>
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-white">Klasemen Pria (Male Ranking)</h3>
                  </div>
                  <span className="text-[9px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 px-2 py-0.5 rounded font-black">
                    {sortedMales.length} Pemain
                  </span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[550px] md:min-w-0">
                    <thead className="bg-surface-dark/95 backdrop-blur-sm sticky top-0 z-20">
                      {renderTableHeaders('Pemain Pria')}
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {renderPlayerRows(sortedMales)}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Female Table */}
              <div className="bg-surface-dark rounded-xl md:rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
                <div className="px-4 md:px-6 py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-pink-400 text-lg">female</span>
                    <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-white">Klasemen Wanita (Female Ranking)</h3>
                  </div>
                  <span className="text-[9px] bg-pink-400/10 text-pink-400 border border-pink-400/30 px-2 py-0.5 rounded font-black">
                    {sortedFemales.length} Pemain
                  </span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[550px] md:min-w-0">
                    <thead className="bg-surface-dark/95 backdrop-blur-sm sticky top-0 z-20">
                      {renderTableHeaders('Pemain Wanita')}
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {renderPlayerRows(sortedFemales)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-dark rounded-xl md:rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
              {isMixMatch && (
                <div className="px-4 md:px-6 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
                  <span className={`material-symbols-outlined text-lg ${mixGenderTab === 'male' ? 'text-cyan-400' : 'text-pink-400'}`}>
                    {mixGenderTab === 'male' ? 'male' : 'female'}
                  </span>
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-white">
                    {mixGenderTab === 'male' ? 'Klasemen Pria (Male Ranking)' : 'Klasemen Wanita (Female Ranking)'}
                  </h3>
                </div>
              )}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[550px] md:min-w-0">
                  <thead className="bg-surface-dark/95 backdrop-blur-sm sticky top-0 z-20">
                    {leaderboardType === 'individual' ? (
                      renderTableHeaders('Player')
                    ) : (
                      <tr className="bg-white/5 border-b border-white/10 text-slate-400 font-black text-[8px] md:text-[10px] uppercase tracking-widest">
                        <th className="px-3 md:px-5 py-3.5 text-center w-12 md:w-16">Rank</th>
                        <th className="px-3 md:px-5 py-3.5 text-left">Club</th>
                        <th className="px-3 md:px-5 py-3.5 text-center">Match Wins</th>
                        <th className="px-3 md:px-6 py-3.5 text-right text-primary">Points</th>
                        <th className="px-2 md:px-4 py-3.5 text-right w-12">Action</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leaderboardType === 'individual' ? (
                      renderPlayerRows(
                        isMixMatch 
                          ? (mixGenderTab === 'male' ? sortedMales : sortedFemales)
                          : sortedPlayers
                      )
                    ) : (
                      clubStats.map((club, idx) => (
                        <tr key={club.id} className="group hover:bg-primary/5 transition-colors">
                          <td className="px-4 md:px-6 py-4">
                            <span className={`text-base md:text-xl font-black italic ${idx < 3 ? 'text-primary' : 'text-white/40'}`}>{(idx + 1).toString().padStart(2, '0')}</span>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 md:size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                {club.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-white uppercase text-xs md:text-sm tracking-tight truncate">{club.name}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase">{club.playerCount} Members</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-center">
                            <span className="text-xs font-bold text-slate-300">{club.wins}</span>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center justify-center px-2 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] md:text-sm font-black min-w-[50px] md:min-w-[80px]">
                                {club.points}
                              </span>
                              <span className="text-[7px] text-slate-500 font-bold uppercase mt-1">Accumulated</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table Legend */}
          <div className="mt-4 px-4 py-3 rounded-2xl bg-surface-dark border border-white/5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] text-slate-400">
            <span className="text-primary font-black uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">info</span> Keterangan:
            </span>
            <span><b className="text-white">G</b>: Matches Played</span>
            <span><b className="text-white">W-L-T</b>: Win - Loss - Tie</span>
            <span><b className="text-white">Diff</b>: Selisih Skor (+/-)</span>
            <span><b className="text-amber-400">+M</b>: Poin Kompensasi Cadangan</span>
            <span><b className="text-primary">Points</b>: Total Poin Akumulasi</span>
          </div>
        </section>
      </main>

      {selectedPlayer && (
        <ScoreDetailModal 
          player={selectedPlayer}
          tournament={tournament}
          onShareMatch={(m) => setShareMatch(m)}
          onClose={() => setSelectedPlayer(null)} 
        />
      )}

      {showShareModal && (
        <ErrorBoundary onReset={() => setShowShareModal(false)}>
          <LeaderboardShareModal
            tournament={tournament}
            onClose={() => setShowShareModal(false)}
          />
        </ErrorBoundary>
      )}

      {shareMatch && (
        <ErrorBoundary onReset={() => setShareMatch(null)}>
          <MatchShareModal
            match={shareMatch}
            tournament={tournament}
            onClose={() => setShareMatch(null)}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default Leaderboard;
