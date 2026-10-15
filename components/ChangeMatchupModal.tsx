import React, { useState, useMemo } from 'react';
import { Match, Player, GameType } from '../types';

interface ChangeMatchupModalProps {
  match: Match;
  players: Player[];
  gameType: GameType;
  allMatches?: Match[];
  onClose: () => void;
  onSave: (matchId: string, teamAPlayerIds: string[], teamBPlayerIds: string[]) => void;
}

const ChangeMatchupModal: React.FC<ChangeMatchupModalProps> = ({
  match,
  players,
  gameType,
  allMatches = [],
  onClose,
  onSave
}) => {
  const [pA1, setPA1] = useState(match.teamA.playerIds[0] || '');
  const [pA2, setPA2] = useState(match.teamA.playerIds[1] || '');
  const [pB1, setPB1] = useState(match.teamB.playerIds[0] || '');
  const [pB2, setPB2] = useState(match.teamB.playerIds[1] || '');
  const [selectedSlot, setSelectedSlot] = useState<'A1' | 'A2' | 'B1' | 'B2'>('A1');
  const [error, setError] = useState<string | null>(null);

  const getPlayer = (id: string) => players.find(p => p.id === id);

  // Identify players currently playing in other live courts
  const otherLiveMatchPlayers = useMemo(() => {
    const map = new Map<string, number>(); // playerId -> court number
    allMatches.forEach(m => {
      if (m.id !== match.id && m.status === 'live') {
        m.teamA.playerIds.forEach(id => map.set(id, m.court));
        m.teamB.playerIds.forEach(id => map.set(id, m.court));
      }
    });
    return map;
  }, [allMatches, match.id]);

  // Players currently resting / on bench (not in this match and not in other live matches)
  const currentSelectedIds = useMemo(() => new Set([pA1, pA2, pB1, pB2]), [pA1, pA2, pB1, pB2]);
  const benchPlayers = useMemo(() => {
    return players.filter(p => !currentSelectedIds.has(p.id) && !otherLiveMatchPlayers.has(p.id));
  }, [players, currentSelectedIds, otherLiveMatchPlayers]);

  const isFixedPartner = gameType.includes('Fix');

  // For fixed partner mode, generate pairs from initial players (every 2 players is a fixed team)
  const fixedTeams = useMemo(() => {
    if (!isFixedPartner) return [];
    const teams: Array<{ id: string; name: string; playerIds: [string, string] }> = [];
    for (let i = 0; i < players.length; i += 2) {
      const p1 = players[i];
      const p2 = players[i + 1];
      if (p1 && p2) {
        teams.push({
          id: `team_${i / 2 + 1}`,
          name: `Team ${i / 2 + 1}: ${p1.name} & ${p2.name}`,
          playerIds: [p1.id, p2.id]
        });
      }
    }
    return teams;
  }, [players, isFixedPartner]);

  // Quick Swap 1: Swap entire sides (Team A <-> Team B)
  const handleSwapSides = () => {
    const tempA1 = pA1;
    const tempA2 = pA2;
    setPA1(pB1);
    setPA2(pB2);
    setPB1(tempA1);
    setPB2(tempA2);
    setError(null);
  };

  // Quick Swap 2: Pair P1 + P3 vs P2 + P4
  const handleSwapPartners1 = () => {
    const newA1 = pA1;
    const newA2 = pB1;
    const newB1 = pA2;
    const newB2 = pB2;
    setPA1(newA1);
    setPA2(newA2);
    setPB1(newB1);
    setPB2(newB2);
    setError(null);
  };

  // Quick Swap 3: Pair P1 + P4 vs P2 + P3
  const handleSwapPartners2 = () => {
    const newA1 = pA1;
    const newA2 = pB2;
    const newB1 = pA2;
    const newB2 = pB1;
    setPA1(newA1);
    setPA2(newA2);
    setPB1(newB1);
    setPB2(newB2);
    setError(null);
  };

  // Quick replace selected slot with a bench player
  const handleReplaceSlotWithPlayer = (playerId: string) => {
    if (selectedSlot === 'A1') setPA1(playerId);
    else if (selectedSlot === 'A2') setPA2(playerId);
    else if (selectedSlot === 'B1') setPB1(playerId);
    else if (selectedSlot === 'B2') setPB2(playerId);
    setError(null);
  };

  const handleSave = () => {
    const selectedIds = [pA1, pA2, pB1, pB2];
    
    // Check if any is missing
    if (selectedIds.some(id => !id)) {
      setError('Semua 4 posisi pemain harus terisi!');
      return;
    }

    // Check uniqueness
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== 4) {
      setError('Pemain tidak boleh ganda! 4 pemain harus berbeda.');
      return;
    }

    // Check Mix rules if applicable
    if (gameType === 'Americano Mix' || gameType === 'Mexicano Mix') {
      const playerA1 = getPlayer(pA1);
      const playerA2 = getPlayer(pA2);
      const playerB1 = getPlayer(pB1);
      const playerB2 = getPlayer(pB2);

      const teamAGenders = [playerA1?.gender, playerA2?.gender];
      const teamBGenders = [playerB1?.gender, playerB2?.gender];

      if (!teamAGenders.includes('male') || !teamAGenders.includes('female')) {
        setError('Mode Mix mengharuskan Team A terdiri dari 1 Pria dan 1 Wanita!');
        return;
      }
      if (!teamBGenders.includes('male') || !teamBGenders.includes('female')) {
        setError('Mode Mix mengharuskan Team B terdiri dari 1 Pria dan 1 Wanita!');
        return;
      }
    }

    onSave(match.id, [pA1, pA2], [pB1, pB2]);
    onClose();
  };

  const renderPlayerSelect = (
    label: string, 
    value: string, 
    onChange: (id: string) => void,
    slotKey: 'A1' | 'A2' | 'B1' | 'B2',
    colorClass: string
  ) => {
    const selectedPlayer = getPlayer(value);
    const isSlotSelected = selectedSlot === slotKey;

    return (
      <div 
        onClick={() => setSelectedSlot(slotKey)}
        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
          isSlotSelected 
            ? 'bg-background-dark border-primary shadow-[0_0_20px_rgba(0,255,204,0.15)] ring-1 ring-primary' 
            : 'bg-background-dark/80 border-white/5 hover:border-white/20'
        } flex flex-col gap-2`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-black uppercase tracking-wider ${colorClass}`}>{label}</span>
            {isSlotSelected && (
              <span className="text-[7px] font-black uppercase px-1 py-0.2 rounded bg-primary text-background-dark">
                Aktif Diganti
              </span>
            )}
          </div>
          {selectedPlayer && (
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${selectedPlayer.gender === 'male' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
              {selectedPlayer.gender === 'male' ? 'M' : 'F'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {selectedPlayer ? (
            <img 
              src={selectedPlayer.avatarUrl} 
              alt={selectedPlayer.name}
              className="size-10 rounded-xl object-cover border border-white/10 shrink-0" 
            />
          ) : (
            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 shrink-0">
              <span className="material-symbols-outlined text-sm">person</span>
            </div>
          )}

          <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <select
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setError(null);
              }}
              className="w-full bg-surface-dark border border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary cursor-pointer truncate"
            >
              <option value="">-- Pilih Pemain --</option>
              {players.map(p => {
                const isPlayingOther = otherLiveMatchPlayers.has(p.id);
                const courtNum = otherLiveMatchPlayers.get(p.id);
                const isBench = benchPlayers.some(bp => bp.id === p.id);
                const statusTag = isPlayingOther ? ` [Court ${courtNum}]` : (isBench ? ' [Menunggu]' : '');

                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gender === 'male' ? 'M' : 'F'}) • {p.points} Pts{statusTag}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-surface-dark border border-primary/20 rounded-[2rem] shadow-[0_0_80px_rgba(0,255,204,0.15)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center shrink-0 bg-background-dark/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">shuffle</span>
              <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-white">
                Pilih & Atur Tim Bertanding
              </h2>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Court {match.court} • Ubah Siapa Lawan Siapa / Antisipasi Pemain Belum Datang
            </p>
          </div>
          <button 
            onClick={onClose}
            className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-5">
          {/* Quick Swap Buttons */}
          <div className="space-y-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
              Tukar Cepat Pasangan / Tim:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSwapSides}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-background-dark border border-white/10 hover:border-primary/40 hover:text-primary text-[10px] font-bold text-slate-300 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                <span>Tukar Sisi (A ⇄ B)</span>
              </button>
              <button
                type="button"
                onClick={handleSwapPartners1}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-background-dark border border-white/10 hover:border-primary/40 hover:text-primary text-[10px] font-bold text-slate-300 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">shuffle</span>
                <span>P1+P3 vs P2+P4</span>
              </button>
              <button
                type="button"
                onClick={handleSwapPartners2}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-background-dark border border-white/10 hover:border-primary/40 hover:text-primary text-[10px] font-bold text-slate-300 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">shuffle</span>
                <span>P1+P4 vs P2+P3</span>
              </button>
            </div>
          </div>

          {/* Fixed Team Selector (if Fixed format) */}
          {isFixedPartner && fixedTeams.length >= 2 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">group</span>
                Pilih Pasangan Tim Tetap (Fixed Teams)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-bold uppercase text-slate-400 block mb-1">Pilih Team A:</label>
                  <select
                    onChange={(e) => {
                      const selected = fixedTeams.find(t => t.id === e.target.value);
                      if (selected) {
                        setPA1(selected.playerIds[0]);
                        setPA2(selected.playerIds[1]);
                        setError(null);
                      }
                    }}
                    className="w-full bg-background-dark border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-primary"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Ganti Pasangan Team A --</option>
                    {fixedTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[8px] font-bold uppercase text-slate-400 block mb-1">Pilih Team B:</label>
                  <select
                    onChange={(e) => {
                      const selected = fixedTeams.find(t => t.id === e.target.value);
                      if (selected) {
                        setPB1(selected.playerIds[0]);
                        setPB2(selected.playerIds[1]);
                        setError(null);
                      }
                    }}
                    className="w-full bg-background-dark border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-primary"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Ganti Pasangan Team B --</option>
                    {fixedTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Quick Bench Replacement Section (If player hasn't arrived) */}
          {benchPlayers.length > 0 && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                  Pemain Cadangan / Menunggu (Siap Main):
                </span>
                <span className="text-[8px] text-slate-400 uppercase">
                  Klik untuk menggantikan posisi aktif ({selectedSlot})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {benchPlayers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleReplaceSlotWithPlayer(p.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background-dark border border-amber-500/30 hover:bg-amber-500/20 text-white text-[10px] font-bold transition-all active:scale-95 group"
                    title={`Klik untuk memasukkan ${p.name} ke slot ${selectedSlot}`}
                  >
                    <img src={p.avatarUrl} alt={p.name} className="size-4 rounded-md object-cover" />
                    <span>{p.name}</span>
                    <span className={`text-[7px] font-black px-1 rounded ${p.gender === 'male' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                      {p.gender === 'male' ? 'M' : 'F'}
                    </span>
                    <span className="material-symbols-outlined text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      add_circle
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A */}
            <div className="p-4 rounded-2xl bg-surface border border-primary/20 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary">Team A</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">2 Pemain</span>
              </div>
              {renderPlayerSelect('Pemain 1 (A1)', pA1, setPA1, 'A1', 'text-primary')}
              {renderPlayerSelect('Pemain 2 (A2)', pA2, setPA2, 'A2', 'text-primary')}
            </div>

            {/* Team B */}
            <div className="p-4 rounded-2xl bg-surface border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">Team B</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">2 Pemain</span>
              </div>
              {renderPlayerSelect('Pemain 1 (B1)', pB1, setPB1, 'B1', 'text-blue-400')}
              {renderPlayerSelect('Pemain 2 (B2)', pB2, setPB2, 'B2', 'text-blue-400')}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* Help Info */}
          <p className="text-[10px] text-slate-500 italic text-center">
            Pilih nama dari dropdown atau klik chip pemain cadangan jika ada pemain yang belum tiba untuk menggantikannya.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 bg-background-dark/80 border-t border-white/5 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-white/10 text-slate-300 font-bold uppercase tracking-wider text-xs hover:bg-white/5 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-12 rounded-xl bg-primary text-background-dark font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">check</span>
            <span>Terapkan Pertandingan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeMatchupModal;
