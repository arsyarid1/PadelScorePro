
import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, Tournament, Player, Match, Gender } from './types';
import Sidebar from './components/Sidebar';
import TournamentSetup from './components/TournamentSetup';
import Leaderboard from './components/Leaderboard';
import LiveScoreboard from './components/LiveScoreboard';
import MultiCourtScoreboard from './components/MultiCourtScoreboard';
import Dashboard from './components/Dashboard';
import { generateMatches, shuffle, generateRandomRound, generateMexicanoRound, generateRandomMixRound, generateMexicanoMixRound, generateAmericanoMixRound, generateAmericanoFixRound, generateMexicanoFixRound, generateClubRandomRound, generateClubMexicanoRound, generateClubFixAmericanoRound } from './utils/gameLogic';
import { getAvatarUrl } from './utils/avatar';

const STORAGE_KEY = 'padel_sessions_v1';
const ADMIN_PASSWORD_HASH = "7339c362116e81377305c0cc0c756e11c47c0d5445f1377ca9d0ca19df36b359";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setActiveTournaments(parsed);
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever tournaments change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeTournaments));
    }
  }, [activeTournaments, isInitialized]);

  const hashPassword = async (password: string) => {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleStartTournament = (setup: any) => {
    let matches: Match[] = [];
    
    if (setup.type === 'Mexicano') {
      matches = generateRandomRound(setup.players, setup.courts, 1);
    } else if (setup.type === 'Mexicano Mix') {
      const males = setup.players.filter((p: any) => p.gender === 'male');
      const females = setup.players.filter((p: any) => p.gender === 'female');
      if (males.length < 2 || females.length < 2 || males.length !== females.length) {
        alert("Mix modes require an equal number of male and female players.");
        return;
      }
      matches = generateRandomMixRound(setup.players, setup.courts, 1);
    } else if (setup.type === 'Americano Mix') {
      const males = setup.players.filter((p: any) => p.gender === 'male');
      const females = setup.players.filter((p: any) => p.gender === 'female');
      if (males.length < 2 || females.length < 2 || males.length !== females.length) {
        alert("Mix modes require an equal number of male and female players.");
        return;
      }
      matches = generateAmericanoMixRound(setup.players, setup.courts, 1);
    } else if (setup.type === 'Club Americano' || setup.type === 'Club Mexicano' || setup.type === 'Club Fix Americano') {
      matches = generateMatches(setup.players, setup.type, 1, setup.clubs);
    } else {
      matches = generateMatches(setup.players, setup.type, 1);
    }

    for (let i = 0; i < Math.min(setup.courts, matches.length); i++) {
      matches[i].status = 'live';
    }
    
    const newTournament: Tournament = {
      id: Math.random().toString(36).substr(2, 9),
      name: setup.name,
      type: setup.type,
      scoring: setup.scoring,
      customMatchType: setup.customMatchType,
      tennisRule: setup.tennisRule,
      maxPoints: setup.maxPoints,
      courts: setup.courts,
      players: setup.players.map((p: any) => ({ ...p, points: 0, matchesPlayed: 0, wins: 0, winRate: 0 })),
      clubs: setup.clubs,
      matches: matches,
      currentMatchId: matches[0]?.id,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setActiveTournaments([...activeTournaments, newTournament]);
    setCurrentTournamentId(newTournament.id);
    setCurrentView('live');
  };

  const handleUpdateMatch = (
    tournamentId: string, 
    matchId: string, 
    teamAScore: any, 
    teamBScore: any, 
    status: 'live' | 'finished',
    teamAGames: number = 0,
    teamBGames: number = 0,
    teamASets: number = 0,
    teamBSets: number = 0
  ) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const isAlreadyFinished = t.matches.find(m => m.id === matchId)?.status === 'finished';
        
        const updatedMatches = t.matches.map(m => m.id === matchId ? {
          ...m,
          status,
          teamA: { ...m.teamA, score: teamAScore, games: teamAGames, sets: teamASets },
          teamB: { ...m.teamB, score: teamBScore, games: teamBGames, sets: teamBSets }
        } : m);

        let updatedPlayers = t.players;
        if (status === 'finished' && !isAlreadyFinished) {
          const finishedMatch = updatedMatches.find(m => m.id === matchId)!;
          const teamAPlayers = finishedMatch.teamA.playerIds;
          const teamBPlayers = finishedMatch.teamB.playerIds;

          const isWinnerA = t.scoring === 'Rally Points' ? teamAScore > teamBScore : teamAGames > teamBGames;
          const isWinnerB = t.scoring === 'Rally Points' ? teamBScore > teamAScore : teamBGames > teamAGames;

          // Calculate max matches played in the tournament BEFORE this match is finalized for these players
          const maxMatchesPlayed = Math.max(...t.players.map(p => p.matchesPlayed), 0);

          updatedPlayers = t.players.map(p => {
            if (teamAPlayers.includes(p.id)) {
              const newWins = isWinnerA ? p.wins + 1 : p.wins;
              const matchesPlayed = p.matchesPlayed + 1;
              let gainedPoints = t.scoring === 'Rally Points' ? teamAScore : teamAGames;
              
              // Apply bonus for Rally Points if player is behind in match count
              if (t.scoring === 'Rally Points' && p.matchesPlayed < maxMatchesPlayed) {
                const matchDiff = maxMatchesPlayed - p.matchesPlayed;
                gainedPoints += (matchDiff * 10);
              }

              return { 
                ...p, 
                points: p.points + gainedPoints, 
                matchesPlayed, 
                wins: newWins,
                winRate: Math.round((newWins / matchesPlayed) * 100)
              };
            }
            if (teamBPlayers.includes(p.id)) {
              const newWins = isWinnerB ? p.wins + 1 : p.wins;
              const matchesPlayed = p.matchesPlayed + 1;
              let gainedPoints = t.scoring === 'Rally Points' ? teamBScore : teamBGames;

              // Apply bonus for Rally Points if player is behind in match count
              if (t.scoring === 'Rally Points' && p.matchesPlayed < maxMatchesPlayed) {
                const matchDiff = maxMatchesPlayed - p.matchesPlayed;
                gainedPoints += (matchDiff * 10);
              }

              return { 
                ...p, 
                points: p.points + gainedPoints, 
                matchesPlayed, 
                wins: newWins,
                winRate: Math.round((newWins / matchesPlayed) * 100)
              };
            }
            return p;
          });
        }

        return { ...t, matches: updatedMatches, players: updatedPlayers };
      }
      return t;
    }));
  };

  const handleUpdatePlayer = (tournamentId: string, playerId: string, newName: string) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        return {
          ...t,
          players: t.players.map(p => p.id === playerId ? { ...p, name: newName } : p)
        };
      }
      return t;
    }));
  };

  const handleAddPlayerToActive = (tournamentId: string, name: string, gender: Gender) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const newPlayer: Player = {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          gender: gender,
          seed: t.players.length + 1,
          points: 0,
          wins: 0,
          matchesPlayed: 0,
          winRate: 0,
          location: 'Local Club',
          avatarUrl: getAvatarUrl(Math.random().toString())
        };
        return {
          ...t,
          players: [...t.players, newPlayer]
        };
      }
      return t;
    }));
  };

  const handleEndTournament = (tournamentId: string) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        return { ...t, status: 'finished' };
      }
      return t;
    }));
    setCurrentView('dashboard');
  };

  const handleNextMatch = (tournamentId: string) => {
    setActiveTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        let newMatches: Match[] = [];
        const roundNumber = (t.matches[t.matches.length - 1]?.round || 0) + 1;

        if (t.type === 'Mexicano') {
          newMatches = generateMexicanoRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Mexicano Mix') {
          newMatches = generateMexicanoMixRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Mexicano Fix') {
          newMatches = generateMexicanoFixRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Americano Mix') {
          newMatches = generateAmericanoMixRound(t.players, t.courts, roundNumber);
        } else if (t.type === 'Americano Fix') {
          newMatches = generateAmericanoFixRound(t.players, roundNumber);
        } else if (t.type === 'Club Americano') {
          newMatches = generateClubRandomRound(t.players, t.clubs || [], t.courts, roundNumber);
        } else if (t.type === 'Club Mexicano') {
          newMatches = generateClubMexicanoRound(t.players, t.clubs || [], t.courts, roundNumber);
        } else if (t.type === 'Club Fix Americano') {
          newMatches = generateClubFixAmericanoRound(t.players, t.clubs || [], roundNumber);
        } else {
          // Americano logic
          const tiers: { [key: number]: Player[] } = {};
          t.players.forEach(p => {
            if (!tiers[p.matchesPlayed]) tiers[p.matchesPlayed] = [];
            tiers[p.matchesPlayed].push(p);
          });

          const availablePlayers: Player[] = Object.keys(tiers)
            .map(Number)
            .sort((a, b) => a - b)
            .flatMap(tierKey => shuffle(tiers[tierKey]));
          
          const matchesToGenerate = t.courts;

          for (let i = 0; i < matchesToGenerate; i++) {
            const sliceOffset = i * 4;
            const p1 = availablePlayers[sliceOffset];
            const p2 = availablePlayers[sliceOffset + 1];
            const p3 = availablePlayers[sliceOffset + 2];
            const p4 = availablePlayers[sliceOffset + 3];

            if (p1 && p2 && p3 && p4) {
              newMatches.push({
                id: Math.random().toString(36).substr(2, 9),
                teamA: { playerIds: [p1.id, p2.id], score: 0, sets: 0, games: 0 },
                teamB: { playerIds: [p3.id, p4.id], score: 0, sets: 0, games: 0 },
                status: 'pending', // Will be set to live below
                court: i + 1,
                round: roundNumber
              });
            }
          }
        }

        // Set new matches to live
        newMatches = newMatches.map(m => ({ ...m, status: 'live' as const }));

        const updatedMatches = t.matches.map(m => m.status === 'live' ? { ...m, status: 'finished' as const } : m);

        return {
          ...t,
          matches: [...updatedMatches, ...newMatches],
          currentMatchId: newMatches[0]?.id
        };
      }
      return t;
    }));
    setCurrentView('live');
  };

  const handleResume = (id: string) => {
    setCurrentTournamentId(id);
    const tournament = activeTournaments.find(t => t.id === id);
    if (tournament?.status === 'finished') {
      setCurrentView('leaderboard');
    } else {
      setCurrentView('live');
    }
  };

  const handleDeleteSession = async (id: string, password: string) => {
    const hashed = await hashPassword(password);
    if (hashed === ADMIN_PASSWORD_HASH) {
      setActiveTournaments(prev => prev.filter(t => t.id !== id));
      if (currentTournamentId === id) setCurrentTournamentId(null);
      return true;
    }
    return false;
  };

  const activeTournament = activeTournaments.find(t => t.id === currentTournamentId);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background-dark text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#00ffcc 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="flex flex-col md:flex-row h-full w-full relative z-10">
        {currentView !== 'live' && (
          <Sidebar currentView={currentView} setView={setCurrentView} />
        )}
        
        <main className={`flex-1 flex flex-col relative overflow-hidden ${currentView !== 'live' ? 'pb-20 md:pb-0' : ''}`}>
          {currentView === 'dashboard' && (
            <Dashboard 
              activeTournaments={activeTournaments}
              onResume={handleResume} 
              onStartNew={() => setCurrentView('setup')} 
              onDelete={handleDeleteSession}
            />
          )}
          {currentView === 'setup' && (
            <TournamentSetup 
              onStart={handleStartTournament} 
            />
          )}
          {currentView === 'leaderboard' && activeTournament && (
            <Leaderboard 
              tournament={activeTournament} 
              onGoLive={() => handleNextMatch(activeTournament.id)} 
              onEnd={() => handleEndTournament(activeTournament.id)}
              onUpdatePlayerName={(pId, name) => handleUpdatePlayer(activeTournament.id, pId, name)}
              onAddPlayer={(name, gender) => handleAddPlayerToActive(activeTournament.id, name, gender)}
            />
          )}
          {currentView === 'live' && activeTournament && (
            activeTournament.courts > 1 ? (
              <MultiCourtScoreboard
                tournament={activeTournament}
                onUpdateScore={(mId, a, b, status, ga, gb, sa, sb) => handleUpdateMatch(activeTournament.id, mId, a, b, status, ga, gb, sa, sb)}
                onEndMatch={() => setCurrentView('leaderboard')}
                onNextMatch={() => handleNextMatch(activeTournament.id)}
              />
            ) : (
              <LiveScoreboard 
                tournament={activeTournament} 
                onUpdateScore={(mId, a, b, status, ga, gb, sa, sb) => handleUpdateMatch(activeTournament.id, mId, a, b, status, ga, gb, sa, sb)}
                onEndMatch={() => setCurrentView('leaderboard')} 
                onNextMatch={() => handleNextMatch(activeTournament.id)}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
