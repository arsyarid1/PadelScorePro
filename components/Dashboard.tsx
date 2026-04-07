
import React, { useState } from 'react';
import { Tournament } from '../types';

interface DashboardProps {
  activeTournaments: Tournament[];
  onResume: (tournamentId: string) => void;
  onStartNew: () => void;
  onDelete: (id: string, password: string) => Promise<boolean>;
}

const DeleteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  error?: string;
}> = ({ isOpen, onClose, onConfirm, error }) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-surface-dark border border-red-500/20 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.1)] overflow-hidden">
        <div className="p-6 md:p-8 border-b border-white/5 flex flex-col items-center gap-3 md:gap-4 text-center">
          <div className="size-12 md:size-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <span className="material-symbols-outlined text-3xl md:text-4xl">warning</span>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black uppercase italic tracking-tighter text-white">Critical Action</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Irreversible Session Deletion</p>
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-4 md:space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Confirm Delete</label>
            <input 
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onConfirm(password)}
              className="w-full h-12 md:h-14 bg-background-dark border-red-500/20 rounded-xl md:rounded-2xl px-4 md:px-6 text-white font-bold focus:ring-red-500 focus:border-red-500 transition-all"
              placeholder="••••••••"
            />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">type in 'delete' to confirm delete this session</p>
            {error && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">{error}</p>}
          </div>
        </div>
        <div className="p-4 md:p-6 bg-background-dark/50 border-t border-white/5 flex gap-3 md:gap-4">
          <button onClick={onClose} className="flex-1 h-12 md:h-14 border border-white/10 text-white font-bold uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-white/5 text-xs transition-all">Cancel</button>
          <button onClick={() => onConfirm(password)} className="flex-1 h-12 md:h-14 bg-red-500 text-white font-black uppercase tracking-widest rounded-xl md:rounded-2xl shadow-lg text-xs transition-all">Delete</button>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ activeTournaments, onResume, onStartNew, onDelete }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteConfirm = async (password: string) => {
    if (!deleteId) return;
    const success = await onDelete(deleteId, password);
    if (success) {
      setDeleteId(null);
      setDeleteError('');
    } else {
      setDeleteError('Access Denied');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 md:px-8 py-4 bg-background-dark/80 backdrop-blur-md border-b border-border-dark">
        <div className="flex items-center gap-4">
          <h2 className="text-lg md:text-2xl font-bold tracking-tight">Main Hub</h2>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={onStartNew}
            className="bg-primary text-background-dark px-4 md:px-5 h-9 md:h-10 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm tracking-tight flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg hidden sm:inline">add_circle</span>
            New Session
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[
            { label: 'Sessions', val: activeTournaments.length, icon: 'emoji_events' },
            { label: 'Active Courts', val: activeTournaments.filter(t => t.status === 'active').reduce((acc, t) => acc + t.courts, 0), icon: 'bolt' },
            { label: 'Persistence', val: 'Syncing', icon: 'cloud_done', sub: 'Local-First' },
          ].map((stat, i) => (
            <div key={i} className="group relative flex flex-col gap-2 md:gap-3 rounded-xl md:rounded-2xl p-4 md:p-6 bg-surface-dark border border-border-dark hover:border-primary/50 transition-all">
              <div className="flex justify-between items-start">
                <p className="text-slate-500 text-[10px] md:text-sm font-semibold uppercase tracking-wider">{stat.label}</p>
                <span className="material-symbols-outlined text-primary text-xl">{stat.icon}</span>
              </div>
              <p className="text-2xl md:text-4xl font-bold leading-tight">{stat.val}</p>
              {stat.sub && <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{stat.sub}</p>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 px-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Recent Activity</h2>
          {activeTournaments.some(t => t.status === 'active') && (
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </div>

        {activeTournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 md:py-20 border-2 border-dashed border-white/5 rounded-2xl md:rounded-3xl p-6">
            <div className="size-16 md:size-20 rounded-full bg-white/5 flex items-center justify-center mb-4 md:mb-6">
              <span className="material-symbols-outlined text-3xl md:text-5xl text-slate-500">folder_open</span>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2">No sessions found</h3>
            <p className="text-slate-500 max-w-xs text-center mb-6 md:mb-8 text-xs md:text-sm">Start a new tournament to begin tracking scores across multiple courts.</p>
            <button 
              onClick={onStartNew}
              className="px-6 md:px-8 h-12 md:h-14 bg-primary text-background-dark rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm transition-all"
            >
              Initialize Hub
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {activeTournaments.map(tournament => {
              const liveMatch = tournament.matches.find(m => m.status === 'live');
              const displayMatch = liveMatch || tournament.matches[tournament.matches.length - 1];
              
              const getPlayerName = (id: string) => tournament.players.find(p => p.id === id)?.name.split(' ')[0] || '...';
              const teamAName = `${getPlayerName(displayMatch?.teamA?.playerIds[0])} / ${getPlayerName(displayMatch?.teamA?.playerIds[1])}`;
              const teamBName = `${getPlayerName(displayMatch?.teamB?.playerIds[0])} / ${getPlayerName(displayMatch?.teamB?.playerIds[1])}`;

              return (
                <div key={tournament.id} className="flex flex-col bg-surface-dark rounded-xl md:rounded-2xl border border-border-dark overflow-hidden hover:shadow-2xl transition-all group">
                  <div className="h-32 md:h-48 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 to-transparent z-10"></div>
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Session" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5dwcSGR8c5Z1__pRS-y01S7qB_Ln3OmCYYN9ZuU7K6BC0urQ70ChbEfU2G66mqzDRudEQ8zItWO66B_B5nc7WS3SvqYUaXTP-HTNqH6HE7JGLh-Fyv4DpQPWoqlTVOf_Xvb67oH2BnzgwT5UrM5UeipxSrtgF3MsxgPL--Cu2ghNvuK4p6vkjwvP4oeYFL20A7yWMPGw-OSfPFKiAc5UFwbejpOdRnDPBw_hHFu2k-3CaBcIvS4_mBd5F_-pmyRkL_Z1Jp6iuZXs" />
                    <div className="absolute top-3 left-3 z-20 flex gap-2">
                      <span className="bg-primary text-background-dark text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded tracking-tighter uppercase">Court {displayMatch?.court || 1}</span>
                      {tournament.status === 'active' && <span className="bg-red-500 text-white text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded uppercase animate-pulse">Live</span>}
                    </div>
                    <div className="absolute top-3 right-3 z-20">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(tournament.id); }}
                        className="size-8 md:size-10 rounded-lg md:rounded-xl bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg"
                      >
                        <span className="material-symbols-outlined text-lg md:text-xl">delete</span>
                      </button>
                    </div>
                    <div className="absolute bottom-3 left-3 z-20">
                      <p className="text-white text-sm md:text-lg font-bold truncate pr-4">{tournament.name}</p>
                      <p className="text-primary text-[10px] md:text-sm font-medium">{tournament.type} • {tournament.courts} Crt</p>
                    </div>
                  </div>
                  <div className="p-4 md:p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-background-dark/50 p-3 rounded-lg md:rounded-xl border border-border-dark">
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        <p className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase truncate w-full text-center">{teamAName}</p>
                        <p className={`text-xl md:text-2xl font-black ${tournament.status === 'active' ? 'text-white' : 'text-slate-500'}`}>{displayMatch?.teamA?.score || 0}</p>
                      </div>
                      <div className="w-px h-6 md:h-8 bg-border-dark mx-2"></div>
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        <p className="text-[8px] md:text-[10px] text-primary font-bold uppercase truncate w-full text-center">{teamBName}</p>
                        <p className={`text-xl md:text-2xl font-black text-primary`}>{displayMatch?.teamB?.score || 0}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onResume(tournament.id)}
                      className="w-full bg-primary text-background-dark py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm hover:brightness-110 transition-all"
                    >
                      {tournament.status === 'active' ? 'Resume Match' : 'Review Stats'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteModal isOpen={!!deleteId} onClose={() => { setDeleteId(null); setDeleteError(''); }} onConfirm={handleDeleteConfirm} error={deleteError} />
    </div>
  );
};

export default Dashboard;
