import React, { useState, useEffect, useMemo } from 'react';
import { UserActivitySession, AnalyticsSummary } from '../types';

interface TournamentInfo {
  id: string;
  name: string;
  shortcode: string;
  status: 'active' | 'finished';
  courts: number;
  activeCourts: number;
  lastActivity: number;
}

interface SuperAdminProps {
  onExit: () => void;
  onFinish: (id: string) => void;
  onView: (id: string) => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ onExit, onFinish, onView }) => {
  const [activeTab, setActiveTab] = useState<'tracking' | 'tournaments'>('tracking');
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [analytics, setAnalytics] = useState<{ summary: AnalyticsSummary; sessions: UserActivitySession[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDevice, setFilterDevice] = useState<'all' | 'mobile' | 'desktop' | 'tablet'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Tournaments
  const fetchTournaments = () => {
    fetch('/api/admin/tournaments')
      .then(res => res.json())
      .then(data => setTournaments(data || []))
      .catch(err => console.error("Failed to fetch tournaments", err));
  };

  // Fetch Analytics & User Tracking
  const fetchAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const handleClearAnalytics = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua riwayat data pengguna & device tracking?")) {
      try {
        const res = await fetch('/api/admin/analytics/clear', { method: 'POST' });
        if (res.ok) {
          fetchAnalytics();
        }
      } catch (err) {
        console.error("Error clearing analytics:", err);
      }
    }
  };

  useEffect(() => {
    fetchTournaments();
    fetchAnalytics();

    const interval = setInterval(() => {
      fetchTournaments();
      fetchAnalytics();
    }, 15000); // 15 seconds polling for real-time tracking

    return () => clearInterval(interval);
  }, []);

  // Format relative time
  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 15) return 'Baru saja';
    if (seconds < 60) return `${seconds} detik lalu`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    if (!analytics?.sessions) return [];
    return analytics.sessions.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchQuery = 
        !q ||
        s.visitorId?.toLowerCase().includes(q) ||
        s.userName?.toLowerCase().includes(q) ||
        s.location?.city?.toLowerCase().includes(q) ||
        s.location?.country?.toLowerCase().includes(q) ||
        s.location?.ip?.toLowerCase().includes(q) ||
        s.device?.os?.toLowerCase().includes(q) ||
        s.device?.browser?.toLowerCase().includes(q) ||
        s.currentView?.toLowerCase().includes(q) ||
        s.action?.toLowerCase().includes(q);

      const matchDev = 
        filterDevice === 'all' || 
        s.device?.type?.toLowerCase() === filterDevice;

      return matchQuery && matchDev;
    });
  }, [analytics, searchQuery, filterDevice]);

  const summary = analytics?.summary;
  const isOnline = (lastActive: number) => (Date.now() - lastActive) < 5 * 60 * 1000;

  return (
    <div className="flex flex-col h-full bg-background-dark text-white overflow-hidden">
      {/* Top Header */}
      <header className="h-20 border-b border-border-dark flex items-center justify-between px-6 md:px-8 bg-background-dark/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,255,204,0.15)]">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tight">Super Admin Hub</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/30">
                Live Telemetry
              </span>
            </div>
            <p className="text-slate-400 text-xs font-medium hidden sm:block">
              Pemantauan Pengguna, Device, Lokasi & Manajemen Turnamen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => { fetchTournaments(); fetchAnalytics(); }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 md:px-4 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-xs font-bold disabled:opacity-50"
            title="Refresh Data"
          >
            <span className={`material-symbols-outlined text-base ${isRefreshing ? 'animate-spin text-primary' : ''}`}>
              refresh
            </span>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button 
            onClick={onExit}
            className="px-4 md:px-5 h-10 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition-all uppercase tracking-wider"
          >
            Exit Admin
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="px-6 md:px-8 pt-4 border-b border-white/5 bg-surface-dark/40 flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'tracking'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">devices</span>
          <span>User & Device Tracking</span>
          {summary?.onlineNow !== undefined && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              {summary.onlineNow} Online
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tournaments')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'tournaments'
              ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">emoji_events</span>
          <span>Global Tournaments</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold">
            {tournaments.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          
          {/* TAB 1: USER & DEVICE TRACKING */}
          {activeTab === 'tracking' && (
            <>
              {/* Telemetry Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                {/* Total Visitors */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-dark border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Total Pengguna</span>
                    <span className="material-symbols-outlined text-primary text-xl">group</span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-black text-white">{summary?.totalVisitors || 0}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Visitor unik terdata</p>
                  </div>
                </div>

                {/* Online Now */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-dark border border-emerald-500/20 flex flex-col justify-between shadow-[0_0_30px_rgba(16,185,129,0.08)]">
                  <div className="flex items-center justify-between text-emerald-400 mb-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      Aktif Sekarang
                    </span>
                    <span className="material-symbols-outlined text-emerald-400 text-xl">sensors</span>
                  </div>
                  <div>
                    <span className="text-2xl md:text-3xl font-black text-emerald-400">{summary?.onlineNow || 0}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Online dlm 5 mnt terakhir</p>
                  </div>
                </div>

                {/* Device Breakdown */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-dark border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Perangkat (Devices)</span>
                    <span className="material-symbols-outlined text-amber-400 text-xl">phonelink</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <div className="flex items-center gap-1 text-slate-300">
                      <span className="material-symbols-outlined text-sm text-primary">smartphone</span>
                      <span>{summary?.deviceBreakdown?.mobile || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <span className="material-symbols-outlined text-sm text-blue-400">laptop</span>
                      <span>{summary?.deviceBreakdown?.desktop || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                      <span className="material-symbols-outlined text-sm text-purple-400">tablet</span>
                      <span>{summary?.deviceBreakdown?.tablet || 0}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Mobile • Desktop • Tablet</p>
                </div>

                {/* Top Location */}
                <div className="p-4 md:p-5 rounded-2xl bg-surface-dark border border-white/10 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Lokasi Terbanyak</span>
                    <span className="material-symbols-outlined text-cyan-400 text-xl">public</span>
                  </div>
                  <div className="truncate">
                    {summary?.topLocations && summary.topLocations.length > 0 ? (
                      <div className="flex items-center gap-1.5 font-bold text-white text-sm truncate">
                        <span>{summary.topLocations[0].flag}</span>
                        <span className="truncate">{summary.topLocations[0].name}</span>
                        <span className="text-[10px] text-slate-400">({summary.topLocations[0].count})</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs">Belum ada lokasi</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Berdasarkan IP Geolocation</p>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex-1 relative max-w-md">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari ID, IP, Kota, Perangkat, Browser..."
                    className="w-full h-11 pl-10 pr-4 bg-surface-dark border border-white/10 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-primary focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-surface-dark border border-white/10 rounded-xl p-0.5">
                    {(['all', 'mobile', 'desktop', 'tablet'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setFilterDevice(tab)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          filterDevice === tab 
                            ? 'bg-primary text-background-dark shadow-sm' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleClearAnalytics}
                    className="h-10 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    title="Hapus semua log tracking pengguna"
                  >
                    <span className="material-symbols-outlined text-base">delete_sweep</span>
                    <span className="hidden sm:inline">Hapus Log</span>
                  </button>
                </div>
              </div>

              {/* Users & Devices Table */}
              <div className="bg-surface-dark border border-border-dark rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10">
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pengguna (Who)</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Perangkat & OS</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Lokasi & IP</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Aktivitas / Halaman</th>
                        <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Terakhir Aktif</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {loading && (!analytics || analytics.sessions.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                            <div className="flex flex-col items-center gap-3">
                              <div className="size-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                              <span>Memuat data tracking pengguna...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredSessions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                            Tidak ada data pengguna yang cocok
                          </td>
                        </tr>
                      ) : (
                        filteredSessions.map((s) => {
                          const online = isOnline(s.lastActive);
                          return (
                            <tr key={s.visitorId} className="hover:bg-white/[0.03] transition-colors">
                              {/* 1. Pengguna */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                                      <span className="material-symbols-outlined text-lg">
                                        {s.device?.type === 'Mobile' ? 'smartphone' : s.device?.type === 'Tablet' ? 'tablet' : 'computer'}
                                      </span>
                                    </div>
                                    <span 
                                      className={`absolute -top-1 -right-1 size-3 rounded-full border-2 border-surface-dark ${
                                        online ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-slate-600'
                                      }`}
                                      title={online ? 'Online' : 'Offline'}
                                    />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-white">{s.userName || 'Pengguna'}</p>
                                      {s.role && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                                          {s.role}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono tracking-tight">{s.visitorId}</p>
                                    <span className="text-[9px] text-slate-500">Kunjungan: {s.visitCount || 1}x</span>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Perangkat & OS */}
                              <td className="px-5 py-4">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">{s.device?.os || 'Unknown OS'}</span>
                                    <span className="text-slate-400 text-[10px]">({s.device?.browser || 'Browser'})</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    Layar: <span className="font-mono text-slate-300">{s.device?.screen || '-'}</span>
                                  </p>
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] font-bold uppercase tracking-wider text-slate-400 border border-white/5">
                                    {s.device?.type || 'Desktop'}
                                  </span>
                                </div>
                              </td>

                              {/* 3. Lokasi & IP */}
                              <td className="px-5 py-4">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-bold text-white">
                                    <span className="text-sm">{s.location?.flag || '📍'}</span>
                                    <span>
                                      {s.location?.city ? `${s.location.city}, ${s.location.country}` : (s.location?.country || 'Indonesia')}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    IP: <span className="text-slate-300">{s.location?.ip || '127.0.0.1'}</span>
                                  </p>
                                  {s.location?.isp && (
                                    <p className="text-[9px] text-slate-500 truncate max-w-[200px]" title={s.location.isp}>
                                      ISP: {s.location.isp}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* 4. Aktivitas & Halaman */}
                              <td className="px-5 py-4">
                                <div className="space-y-1">
                                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold inline-block">
                                    {s.action || 'Buka Aplikasi'}
                                  </span>
                                  <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                    Halaman: <span className="text-white capitalize">{s.currentView || 'Dashboard'}</span>
                                  </p>
                                </div>
                              </td>

                              {/* 5. Terakhir Aktif */}
                              <td className="px-5 py-4 text-right">
                                <p className={`font-bold ${online ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {formatTimeAgo(s.lastActive)}
                                </p>
                                <p className="text-[9px] text-slate-500 font-mono">
                                  {s.lastActive ? new Date(s.lastActive).toLocaleTimeString() : '-'}
                                </p>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: GLOBAL TOURNAMENTS */}
          {activeTab === 'tournaments' && (
            <div className="bg-surface-dark border border-border-dark rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Tournament Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Shortcode</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Courts</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Last Activity</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {loading && tournaments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                          Loading global data...
                        </td>
                      </tr>
                    ) : tournaments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold uppercase tracking-widest">
                          No tournaments found on server
                        </td>
                      </tr>
                    ) : (
                      tournaments.map(t => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-white">{t.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{t.id}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-black text-xs tracking-widest border border-primary/20">
                              {t.shortcode || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border ${
                              t.status === 'active' 
                                ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold">
                            {t.activeCourts} / {t.courts}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {t.lastActivity ? new Date(t.lastActivity).toLocaleString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => onView(t.id)}
                                className="bg-primary text-background-dark px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                              >
                                View
                              </button>
                              {t.status === 'active' && (
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to FORCE FINISH "${t.name}"? This will kick all users.`)) {
                                      onFinish(t.id);
                                      setTimeout(fetchTournaments, 500);
                                    }
                                  }}
                                  className="bg-red-500 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                                >
                                  Force Finish
                                </button>
                              )}
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

        </div>
      </main>
    </div>
  );
};

export default SuperAdmin;
