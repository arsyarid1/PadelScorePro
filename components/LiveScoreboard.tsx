
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tournament, MatchState, Player } from '../types';
import ChangeMatchupModal from './ChangeMatchupModal';

interface LiveScoreboardProps {
  tournament: Tournament;
  onUpdateScore: (
    matchId: string, 
    teamAScore: any, 
    teamBScore: any, 
    status: 'live' | 'finished',
    teamAGames?: number,
    teamBGames?: number,
    teamASets?: number,
    teamBSets?: number
  ) => void;
  onUpdateMatchPlayers?: (matchId: string, teamAPlayerIds: string[], teamBPlayerIds: string[]) => void;
  onEndMatch: () => void;
  onNextMatch?: () => void;
  onExit?: () => void;
  onToggleScoringMode?: () => void;
}

// --- Helper Functions ---

const TENNIS_POINTS = ['0', '15', '30', '40', 'Ad'];

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const getPointsDisplay = (score: any, teamSets: number, team: 'A' | 'B', match: MatchState, isFinished: boolean, isRally: boolean, scoringType: string) => {
  if (isFinished) {
    if (isRally) return score;
    return scoringType === 'Custom Match' ? match[team === 'A' ? 'teamA' : 'teamB'].games : teamSets;
  }
  if (isRally || match.isTieBreak) return score;
  if (typeof score === 'number' && score >= 0 && score < TENNIS_POINTS.length) {
    const mapped = TENNIS_POINTS[score];
    return mapped === 'Ad' ? 'ADV' : mapped;
  }
  return score === 'Ad' ? 'ADV' : score;
};

// --- Sub-Components ---

const Confetti = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      color: ['#00ffcc', '#ffffff', '#ff0066', '#ffcc00', '#0099ff'][Math.floor(Math.random() * 5)],
      duration: `${2 + Math.random() * 3}s`,
      size: `${Math.random() * 10 + 5}px`,
      rotate: `${Math.random() * 360}deg`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle animate-confetti"
          style={{
            left: p.left,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </div>
  );
};

const ScoreHeader = React.memo(({ 
  tournament, onExit, onEndMatch, undo, historyLength, time, onToggleScoringMode, canChangeMatchup, onOpenMatchup 
}: { 
  tournament: Tournament, onExit?: () => void, onEndMatch: () => void, undo: (e?: any) => void, historyLength: number, time: number, onToggleScoringMode?: () => void, canChangeMatchup?: boolean, onOpenMatchup?: () => void 
}) => (
  <header className="flex items-center justify-between border-b border-primary/10 px-4 md:px-8 py-3 md:py-4 bg-background-dark z-50">
    <div className="flex items-center gap-2 md:gap-4">
      {onExit && (
        <button onClick={onExit} className="size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined text-sm md:text-base">home</span>
        </button>
      )}
      <button onClick={onEndMatch} className="size-8 md:size-10 flex items-center justify-center rounded-lg md:rounded-xl bg-surface border border-primary/20 hover:bg-primary/20 transition-colors">
        <span className="material-symbols-outlined text-sm md:text-base">analytics</span>
      </button>
      <div>
        <h2 className="text-sm md:text-xl font-bold tracking-tight uppercase italic leading-none">{tournament.name}</h2>
        <p className="text-[8px] md:text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
          <span>{tournament.type} • {tournament.scoring}{tournament.customMatchType ? ` (${tournament.customMatchType} ${tournament.maxPoints})` : ''}</span>
          {tournament.type.includes('Fix') && (
            <span className="text-primary font-bold border border-primary/30 px-1.5 py-0.5 rounded">Fixed Partner</span>
          )}
          {tournament.courts === 1 && (
            <span className="text-primary font-black border border-primary/30 px-1.5 py-0.5 rounded text-[7px] md:text-[9px] bg-primary/5">
              1 Court • Live Scoring
            </span>
          )}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3 md:gap-6">
      {canChangeMatchup && onOpenMatchup && (
        <button 
          onClick={onOpenMatchup}
          title="Ubah Pemain / Lawan"
          className="flex h-8 md:h-12 px-2.5 md:px-4 items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-surface border border-primary/30 hover:bg-primary/10 text-primary transition-all text-[9px] md:text-xs font-bold uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-sm md:text-base">shuffle</span>
          <span className="hidden sm:inline">Ubah Lawan</span>
        </button>
      )}
      {tournament.courts === 1 && onToggleScoringMode && (
        <button 
          onClick={onToggleScoringMode}
          title="Late Scoring"
          className="flex h-8 md:h-12 px-2.5 md:px-4 items-center gap-1.5 md:gap-2 rounded-lg md:rounded-xl bg-surface border border-primary/30 hover:bg-primary/10 text-primary transition-all text-[9px] md:text-xs font-bold uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-sm md:text-base">tune</span>
          <span className="hidden sm:inline">Late Scoring</span>
        </button>
      )}
      <div className="flex flex-col items-center">
        <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/50">Time</span>
        <span className="text-sm md:text-xl font-mono font-bold tracking-tighter">{formatTime(time)}</span>
      </div>
      <button 
        onClick={undo} 
        disabled={historyLength === 0} 
        className={`flex h-8 md:h-12 px-3 md:px-6 items-center gap-2 rounded-lg md:rounded-xl bg-surface border border-primary/20 hover:bg-primary/20 transition-colors ${historyLength === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
      >
        <span className="material-symbols-outlined text-sm">undo</span>
        <span className="font-bold uppercase text-[10px] md:text-xs tracking-widest hidden sm:inline">Undo</span>
      </button>
    </div>
  </header>
));

const TeamSection = React.memo(({ 
  team, side, match, tournament, flash, isFinished, winner, addPoint, getPlayer 
}: { 
  team: 'A' | 'B', 
  side: 'left' | 'right',
  match: MatchState, 
  tournament: Tournament, 
  flash: { team: 'A' | 'B' | null, color: string }, 
  isFinished: boolean, 
  winner: 'A' | 'B' | null, 
  addPoint: (team: 'A' | 'B', e?: any) => void,
  getPlayer: (id: string) => Player | undefined
}) => {
  const teamState = team === 'A' ? match.teamA : match.teamB;
  const isWinner = winner === team;
  const isRally = tournament.scoring === 'Rally Points';

  return (
    <div 
      onClick={(e) => addPoint(team, e)}
      className={`flex-1 flex flex-col p-4 md:p-6 gap-2 md:gap-6 border-b md:border-b-0 ${side === 'left' ? 'md:border-r' : ''} border-primary/10 transition-all duration-300 relative
        ${!isFinished ? 'cursor-pointer active:bg-white/[0.05] hover:bg-white/[0.02]' : 'pointer-events-none'}
        ${flash.team === team ? 'bg-green-500/20' : ''}`}
    >
      {isFinished && (winner === team || winner === null) && <Confetti />}
      
      <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-4 rounded-xl bg-surface/50 border border-primary/5">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center">
            <div className="size-10 md:size-16 rounded-full bg-cover bg-center border-2 border-primary/40 shadow-xl" style={{ backgroundImage: `url('${getPlayer(teamState.players[0])?.avatarUrl}')` }}></div>
            <div className="size-10 md:size-16 rounded-full bg-cover bg-center border-2 border-primary/40 -ml-5 md:-ml-8 shadow-xl" style={{ backgroundImage: `url('${getPlayer(teamState.players[1])?.avatarUrl}')` }}></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-4xl font-bold uppercase tracking-tight line-clamp-1">
                {getPlayer(teamState.players[0])?.name.split(' ')[0]} / {getPlayer(teamState.players[1])?.name.split(' ')[0]}
              </h3>
            </div>
            <span className="text-[8px] md:text-[10px] text-primary font-bold uppercase tracking-widest">Team {team}</span>
          </div>
        </div>
        {!isRally && (
          <div className="flex gap-3 md:gap-6">
            {tournament.scoring === 'Tournament Pro' && (
              <div className="text-right">
                <span className="text-[8px] md:text-[10px] uppercase text-white/40 block">Sets</span>
                <span className="text-lg md:text-4xl font-black text-primary">{teamState.sets}</span>
              </div>
            )}
            <div className="text-right">
              <span className="text-[8px] md:text-[10px] uppercase text-white/40 block">Games</span>
              <span className="text-lg md:text-4xl font-black">{teamState.games}</span>
            </div>
          </div>
        )}
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center transition-all ${isFinished && isWinner ? 'animate-winner text-primary' : ''}`}>
        {isFinished && isWinner && (
          <span className="text-xl md:text-4xl font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mb-2 md:mb-4 text-primary animate-pulse">Winner</span>
        )}
        <span className="text-[8rem] sm:text-[12rem] md:text-[20rem] lg:text-[25rem] font-black leading-none tracking-tighter drop-shadow-2xl">
          {getPointsDisplay(teamState.score, teamState.sets, team, match, isFinished, isRally, tournament.scoring)}
        </span>
      </div>
    </div>
  );
});

const LiveScoreboard: React.FC<LiveScoreboardProps> = ({ 
  tournament, 
  onUpdateScore, 
  onUpdateMatchPlayers,
  onEndMatch, 
  onNextMatch, 
  onExit, 
  onToggleScoringMode 
}) => {
  const isRally = tournament.scoring === 'Rally Points';
  const liveMatch = useMemo(() => 
    tournament.matches.find(m => m.id === tournament.currentMatchId) || tournament.matches[tournament.matches.length - 1],
    [tournament.matches, tournament.currentMatchId]
  );
  
  const [match, setMatch] = useState<MatchState>({
    teamA: { 
      players: liveMatch.teamA.playerIds, 
      score: liveMatch.teamA.score || 0, 
      games: liveMatch.teamA.games || 0,
      sets: liveMatch.teamA.sets || 0,
      totalGames: liveMatch.teamA.games || 0
    },
    teamB: { 
      players: liveMatch.teamB.playerIds, 
      score: liveMatch.teamB.score || 0, 
      games: liveMatch.teamB.games || 0,
      sets: liveMatch.teamB.sets || 0,
      totalGames: liveMatch.teamB.games || 0
    },
    server: 'A',
    time: 0,
    isTieBreak: false
  });

  const [history, setHistory] = useState<MatchState[]>([]);
  const [flash, setFlash] = useState<{ team: 'A' | 'B' | null, color: 'green' | 'red' }>({ team: null, color: 'green' });
  const [isFinished, setIsFinished] = useState(liveMatch.status === 'finished');
  const [showMatchupModal, setShowMatchupModal] = useState(false);
  const lastClickTime = React.useRef<number>(0);

  const canChangeMatchup = !tournament.type.startsWith('Club') && tournament.type !== 'Professional Tournament' && !isFinished;

  // Memoized Player Lookup
  const playersMap = useMemo(() => {
    const map = new Map<string, Player>();
    tournament.players.forEach(p => map.set(p.id, p));
    return map;
  }, [tournament.players]);

  const getPlayer = useCallback((id: string) => playersMap.get(id), [playersMap]);

  // Sync state when match changes
  useEffect(() => {
    setMatch({
      teamA: { players: liveMatch.teamA.playerIds, score: liveMatch.teamA.score || 0, games: liveMatch.teamA.games || 0, sets: liveMatch.teamA.sets || 0, totalGames: liveMatch.teamA.games || 0 },
      teamB: { players: liveMatch.teamB.playerIds, score: liveMatch.teamB.score || 0, games: liveMatch.teamB.games || 0, sets: liveMatch.teamB.sets || 0, totalGames: liveMatch.teamB.games || 0 },
      server: 'A', time: 0, isTieBreak: false
    });
    setIsFinished(liveMatch.status === 'finished');
    setHistory([]);
  }, [liveMatch.id]);

  // Scoring Logic Helpers
  const checkWinner = useCallback((next: MatchState, teamKey: 'teamA' | 'teamB', oppKey: 'teamA' | 'teamB'): boolean => {
    if (tournament.scoring === 'Custom Match') {
      const totalGames = next.teamA.games + next.teamB.games;
      if (tournament.customMatchType === 'Race to') {
        if (next[teamKey].games >= tournament.maxPoints) {
          next.teamA.score = 0; next.teamB.score = 0; return true;
        }
      } else if (tournament.customMatchType === 'Best of') {
        if (totalGames >= tournament.maxPoints) {
          next.teamA.score = 0; next.teamB.score = 0; return true;
        }
      }
      next.teamA.score = 0; next.teamB.score = 0; next.isTieBreak = false; return false;
    } else {
      // Standard Tennis/Padel logic
      next.teamA.score = 0; next.teamB.score = 0; next.isTieBreak = false;
      if ((next[teamKey].games >= 6 && (next[teamKey].games - next[oppKey].games) >= 2) || (next[teamKey].games === 7 && next[oppKey].games === 6)) {
        next[teamKey].sets += 1;
        if (next[teamKey].sets === 2) return true;
        next.teamA.games = 0; next.teamB.games = 0; return false;
      } else if (next.teamA.games === 6 && next.teamB.games === 6) {
        next.isTieBreak = true;
      }
      return false;
    }
  }, [tournament.scoring, tournament.customMatchType, tournament.maxPoints]);

  const addPoint = useCallback((team: 'A' | 'B', e?: any) => {
    if (e) {
      if ('stopPropagation' in e) e.stopPropagation();
      if ('preventDefault' in e) e.preventDefault();
      if ('stopImmediatePropagation' in e) e.stopImmediatePropagation();
    }
    if (isFinished || tournament.isCloud) return;

    const now = Date.now();
    if (now - lastClickTime.current < 500) return;
    lastClickTime.current = now;

    setMatch(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as MatchState;
      const teamKey = team === 'A' ? 'teamA' : 'teamB';
      const oppKey = team === 'A' ? 'teamB' : 'teamA';
      let nextFinished = false;

      if (isRally) {
        next[teamKey].score += 1;
        next[teamKey].totalGames += 1;
        if (next.teamA.score + next.teamB.score >= tournament.maxPoints) nextFinished = true;
      } else {
        if (next.isTieBreak) {
          next[teamKey].score += 1;
          if (next[teamKey].score >= 7 && (next[teamKey].score - next[oppKey].score) >= 2) {
            next[teamKey].games += 1; next[teamKey].totalGames += 1; nextFinished = checkWinner(next, teamKey, oppKey);
          }
        } else {
          if (next[teamKey].score < 3) {
            next[teamKey].score += 1;
          } else if (next[teamKey].score === 3) {
            if (next[oppKey].score === 3) {
              if (tournament.tennisRule === 'Golden Point') {
                next[teamKey].games += 1; next[teamKey].totalGames += 1; nextFinished = checkWinner(next, teamKey, oppKey);
              } else {
                next[teamKey].score = 'Ad';
              }
            } else if (next[oppKey].score === 'Ad') {
              next[oppKey].score = 3;
            } else {
              next[teamKey].games += 1; next[teamKey].totalGames += 1; nextFinished = checkWinner(next, teamKey, oppKey);
            }
          } else if (next[teamKey].score === 'Ad') {
            next[teamKey].games += 1; next[teamKey].totalGames += 1; nextFinished = checkWinner(next, teamKey, oppKey);
          }
        }
      }

      if (nextFinished) setIsFinished(true);

      queueMicrotask(() => {
        setHistory(h => [...h, JSON.parse(JSON.stringify(prev))]);
        onUpdateScore(liveMatch.id, next.teamA.score, next.teamB.score, nextFinished ? 'finished' : 'live', next.teamA.totalGames, next.teamB.totalGames, next.teamA.sets, next.teamB.sets);
        setFlash({ team, color: 'green' });
        setTimeout(() => setFlash({ team: null, color: 'green' }), 300);
        if (window.navigator?.vibrate) window.navigator.vibrate(50);
      });

      return next;
    });
  }, [isFinished, tournament.isCloud, tournament.maxPoints, tournament.tennisRule, isRally, checkWinner, liveMatch.id, onUpdateScore]);

  const undo = useCallback((e?: any) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const lastState = prevHistory[prevHistory.length - 1];
      setMatch(lastState);
      setIsFinished(false);
      onUpdateScore(liveMatch.id, lastState.teamA.score, lastState.teamB.score, 'live', lastState.teamA.totalGames, lastState.teamB.totalGames, lastState.teamA.sets, lastState.teamB.sets);
      return prevHistory.slice(0, -1);
    });
  }, [liveMatch.id, onUpdateScore]);

  // Keyboard Remote Logic
  useEffect(() => {
    if (isFinished) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (['a', 'b', 'u'].includes(key)) {
        e.preventDefault(); e.stopPropagation();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        if (key === 'a') addPoint('A', e);
        else if (key === 'b') addPoint('B', e);
        else if (key === 'u') undo(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isFinished, addPoint, undo]);

  // Game Timer
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => setMatch(prev => ({ ...prev, time: prev.time + 1 })), 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  const winner = useMemo(() => {
    if (!isFinished) return null;
    if (isRally) return match.teamA.score > match.teamB.score ? 'A' : (match.teamA.score < match.teamB.score ? 'B' : null);
    if (tournament.scoring === 'Custom Match') return match.teamA.games > match.teamB.games ? 'A' : (match.teamA.games < match.teamB.games ? 'B' : null);
    return match.teamA.sets >= 2 ? 'A' : (match.teamB.sets >= 2 ? 'B' : null);
  }, [isFinished, isRally, match, tournament.scoring]);

  return (
    <div className="flex flex-col h-screen w-full bg-background-dark font-display text-white overflow-hidden select-none focus:outline-none [&_*]:focus:outline-none">
      <ScoreHeader 
        tournament={tournament} 
        onExit={onExit} 
        onEndMatch={onEndMatch} 
        undo={undo} 
        historyLength={history.length} 
        time={match.time} 
        onToggleScoringMode={onToggleScoringMode}
        canChangeMatchup={canChangeMatchup}
        onOpenMatchup={() => setShowMatchupModal(true)}
      />

      <main className="flex-1 flex flex-col md:flex-row w-full relative overflow-hidden">
        {isFinished && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background-dark/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="max-w-lg w-full p-8 md:p-12 rounded-[2.5rem] bg-surface border-2 border-primary/30 shadow-[0_0_100px_rgba(0,255,204,0.3)] flex flex-col items-center text-center scale-in-center">
              <div className="size-24 md:size-32 rounded-full bg-primary/20 flex items-center justify-center mb-6 md:mb-8 animate-bounce">
                <span className="material-symbols-outlined text-5xl md:text-7xl text-primary">emoji_events</span>
              </div>
              <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-white mb-2">
                {winner ? `Team ${winner} Wins!` : "It's a Draw!"}
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-8 md:mb-12">
                Final Score: {match.teamA.games} - {match.teamB.games}
              </p>
              <div className="flex flex-col w-full gap-4">
                <button onClick={onNextMatch || onEndMatch} className="w-full h-16 md:h-20 bg-primary text-background-dark rounded-2xl font-black uppercase tracking-widest text-lg md:text-xl shadow-[0_10px_40px_rgba(0,255,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all">Next Match</button>
                <button onClick={onEndMatch} className="w-full h-12 md:h-14 border-2 border-white/10 text-white/50 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white/5 transition-all">Back to Leaderboard</button>
              </div>
            </div>
            <Confetti />
          </div>
        )}

        <TeamSection team="A" side="left" match={match} tournament={tournament} flash={flash} isFinished={isFinished} winner={winner} addPoint={addPoint} getPlayer={getPlayer} />
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 md:gap-3 pointer-events-auto">
          <div className="text-4xl md:text-8xl font-black italic text-primary/10 tracking-tighter select-none pointer-events-none">VS</div>
          {canChangeMatchup && (
            <button 
              onClick={() => setShowMatchupModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-surface-dark/90 border border-primary/40 text-primary hover:bg-primary hover:text-background-dark font-black text-[9px] md:text-xs uppercase tracking-widest shadow-2xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-xs md:text-sm">shuffle</span>
              <span>Atur Lawan</span>
            </button>
          )}
        </div>

        <TeamSection team="B" side="right" match={match} tournament={tournament} flash={flash} isFinished={isFinished} winner={winner} addPoint={addPoint} getPlayer={getPlayer} />
      </main>

      <footer className="bg-background-dark border-t border-primary/10 p-4 md:p-8 flex items-center justify-center">
        {isFinished ? (
          <button onClick={onNextMatch || onEndMatch} className="h-12 md:h-20 px-8 md:px-16 bg-primary text-background-dark rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-sm md:text-xl shadow-[0_0_40px_rgba(0,255,204,0.5)] hover:scale-105 active:scale-95 transition-all animate-pulse">
            {winner ? `TEAM ${winner} WINS - FINISH` : 'FINISH MATCH'}
          </button>
        ) : (
          <button 
            onClick={() => {
              setIsFinished(true);
              onUpdateScore(liveMatch.id, match.teamA.score, match.teamB.score, 'finished', match.teamA.totalGames, match.teamB.totalGames, match.teamA.sets, match.teamB.sets);
            }}
            className="h-12 md:h-20 px-8 md:px-16 bg-red-500 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-sm md:text-xl shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            Finish Match
          </button>
        )}
      </footer>

      {showMatchupModal && (
        <ChangeMatchupModal
          match={liveMatch}
          players={tournament.players}
          gameType={tournament.type}
          allMatches={tournament.matches}
          onClose={() => setShowMatchupModal(false)}
          onSave={(mId, aIds, bIds) => {
            if (onUpdateMatchPlayers) {
              onUpdateMatchPlayers(mId, aIds, bIds);
            }
            setMatch(prev => ({
              ...prev,
              teamA: { ...prev.teamA, players: aIds },
              teamB: { ...prev.teamB, players: bIds }
            }));
          }}
        />
      )}
    </div>
  );
};

export default LiveScoreboard;
