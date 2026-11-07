import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Tournament, Match, Player, PlayerTournamentStats } from '../types';
import { calculatePlayerStats, getMaxMatchesPlayed } from '../utils/gameLogic';
import MatchShareModal from './MatchShareModal';

interface LeaderboardShareModalProps {
  tournament: Tournament;
  onClose: () => void;
  initialTab?: 'leaderboard' | 'matches';
}

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof ctx.roundRect === 'function') {
    try {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    } catch {}
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const LeaderboardShareModal: React.FC<LeaderboardShareModalProps> = ({ 
  tournament, 
  onClose,
  initialTab = 'leaderboard'
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'matches'>(initialTab);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Compute player tournament statistics defensively
  const maxMatches = useMemo(() => {
    return getMaxMatchesPlayed(tournament.players || [], tournament.matches || []);
  }, [tournament.players, tournament.matches]);

  const playersWithStats = useMemo(() => {
    return (tournament.players || []).map(player => ({
      ...player,
      stats: calculatePlayerStats(
        player,
        tournament.matches || [],
        tournament.scoring,
        maxMatches
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
  }, [tournament.players, tournament.matches, maxMatches, tournament.scoring]);

  // All completed matches
  const finishedMatches = useMemo(() => {
    return tournament.matches
      .filter(m => m.status === 'finished')
      .sort((a, b) => b.round - a.round || b.court - a.court);
  }, [tournament.matches]);

  const publicUrl = tournament.shortcode 
    ? `${window.location.origin}/live?code=${tournament.shortcode}`
    : `${window.location.origin}/t/${tournament.id}`;

  const getPlayer = (id: string): Player | undefined => {
    return tournament.players.find(p => p.id === id);
  };

  const getPlayerNames = (ids: string[]) => {
    return ids.map(id => getPlayer(id)?.name || 'Unknown').join(' / ');
  };

  // Generate Leaderboard Image on Canvas (1080 x 1080 Square)
  useEffect(() => {
    if (activeTab !== 'leaderboard') return;

    let isMounted = true;
    const generateCanvas = async () => {
      setIsGenerating(true);
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Dark Futuristic Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
      bgGrad.addColorStop(0, '#090d10');
      bgGrad.addColorStop(0.5, '#0d1318');
      bgGrad.addColorStop(1, '#080a0c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Subtle Glow
      const glowGrad = ctx.createRadialGradient(540, 300, 50, 540, 300, 550);
      glowGrad.addColorStop(0, 'rgba(0, 255, 204, 0.09)');
      glowGrad.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Border & Corner Accents
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, 1020, 1020);

      const cornerSize = 40;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 6;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(30, 30 + cornerSize); ctx.lineTo(30, 30); ctx.lineTo(30 + cornerSize, 30); ctx.stroke();
      // Top Right
      ctx.beginPath();
      ctx.moveTo(1050 - cornerSize, 30); ctx.lineTo(1050, 30); ctx.lineTo(1050, 30 + cornerSize); ctx.stroke();
      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(30, 1050 - cornerSize); ctx.lineTo(30, 1050); ctx.lineTo(30 + cornerSize, 1050); ctx.stroke();
      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(1050 - cornerSize, 1050); ctx.lineTo(1050, 1050); ctx.lineTo(1050, 1050 - cornerSize); ctx.stroke();

      // 2. Header Branding
      ctx.fillStyle = '#00ffcc';
      ctx.font = '900 24px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText('PADELSCORE PRO', 540, 80);

      // Tournament Name
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px Montserrat, sans-serif';
      ctx.letterSpacing = '1px';
      const tName = tournament.name.length > 28 ? tournament.name.substring(0, 25) + '...' : tournament.name;
      ctx.fillText(tName.toUpperCase(), 540, 135);

      // Subtitle Pill
      const statusText = tournament.status === 'finished' ? 'FINAL LEADERBOARD' : 'CURRENT STANDINGS';
      const subInfo = `${statusText} • ${tournament.type.toUpperCase()}`;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 18px Montserrat, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(subInfo, 540, 170);

      // Helper for loading images
      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = url;
        });
      };

      // 3. Top 3 Podium Cards (Rank 2, Rank 1, Rank 3)
      const top3 = playersWithStats.slice(0, 3);
      const podiumConfigs = [
        { player: top3[1], rank: '2', title: 'RUNNER UP', color: '#94a3b8', x: 230, y: 310, r: 48, scale: 0.9 },
        { player: top3[0], rank: '1', title: 'CHAMPION 👑', color: '#00ffcc', x: 540, y: 295, r: 60, scale: 1.1 },
        { player: top3[2], rank: '3', title: '3RD PLACE', color: '#f59e0b', x: 850, y: 310, r: 48, scale: 0.9 }
      ];

      for (const p of podiumConfigs) {
        if (!p.player) continue;

        // Podium container box
        const boxWidth = 260;
        const boxHeight = 190;
        const boxX = p.x - boxWidth / 2;
        const boxY = p.y - 85;

        ctx.save();
        ctx.fillStyle = p.rank === '1' ? 'rgba(0, 255, 204, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = p.rank === '1' ? 'rgba(0, 255, 204, 0.4)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
        ctx.fill();
        ctx.stroke();

        // Avatar
        const avatarUrl = p.player.avatarUrl;
        let drawn = false;
        if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
          try {
            const img = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y - 15, p.r, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, p.x - p.r, p.y - 15 - p.r, p.r * 2, p.r * 2);
            ctx.restore();
            drawn = true;
          } catch {}
        }
        if (!drawn) {
          ctx.beginPath();
          ctx.arc(p.x, p.y - 15, p.r, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.fillStyle = p.color;
          ctx.font = '900 24px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          const initials = (p.player.name || '?').substring(0, 2).toUpperCase();
          ctx.fillText(initials, p.x, p.y - 6);
        }

        // Border on Avatar
        ctx.beginPath();
        ctx.arc(p.x, p.y - 15, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.rank === '1' ? 4 : 3;
        ctx.stroke();

        // Rank Badge
        ctx.fillStyle = p.color;
        ctx.font = '900 14px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.title, p.x, p.y + 45);

        // Player Name
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 18px Montserrat, sans-serif';
        const pName = p.player.name?.length > 14 ? p.player.name.substring(0, 12) + '...' : (p.player.name || 'Player');
        ctx.fillText(pName.toUpperCase(), p.x, p.y + 70);

        // Score
        ctx.fillStyle = p.color;
        ctx.font = '900 22px Montserrat, sans-serif';
        const pScore = p.player.stats?.totalPoints ?? p.player.points ?? 0;
        ctx.fillText(`${pScore} PTS`, p.x, p.y + 95);

        ctx.restore();
      }

      // 4. Standings Table Header
      const tableStartY = 430;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(80, tableStartY, 920, 42);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '800 15px Montserrat, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('RANK', 105, tableStartY + 27);
      ctx.fillText('PLAYER', 200, tableStartY + 27);
      ctx.textAlign = 'center';
      ctx.fillText('G', 610, tableStartY + 27);
      ctx.fillText('W-L-T', 710, tableStartY + 27);
      ctx.fillText('DIFF', 810, tableStartY + 27);
      ctx.textAlign = 'right';
      ctx.fillText('POINTS', 975, tableStartY + 27);

      // 5. Standings Table Rows (Top 8 players)
      const rowsToShow = playersWithStats.slice(0, 8);
      const rowHeight = 56;

      rowsToShow.forEach((player, idx) => {
        const rowY = tableStartY + 45 + idx * rowHeight;
        const isTop3 = idx < 3;

        // Row background alternating
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(80, rowY, 920, rowHeight - 4);

        // Rank Number
        ctx.textAlign = 'left';
        ctx.font = '900 18px Montserrat, sans-serif';
        ctx.fillStyle = isTop3 ? '#00ffcc' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillText((idx + 1).toString().padStart(2, '0'), 115, rowY + 34);

        // Player Name
        ctx.font = '700 18px Montserrat, sans-serif';
        ctx.fillStyle = '#ffffff';
        const displayName = player.name.length > 20 ? player.name.substring(0, 18) + '...' : player.name;
        ctx.fillText(displayName.toUpperCase(), 200, rowY + 34);

        // G (Games)
        ctx.textAlign = 'center';
        ctx.font = '700 17px Montserrat, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(player.stats.gamesPlayed.toString(), 610, rowY + 34);

        // W-L-T
        ctx.fillText(`${player.stats.wins}-${player.stats.losses}-${player.stats.ties}`, 710, rowY + 34);

        // Diff
        const diffText = player.stats.diff > 0 ? `+${player.stats.diff}` : `${player.stats.diff}`;
        ctx.fillStyle = player.stats.diff > 0 ? '#00ffcc' : (player.stats.diff < 0 ? '#f87171' : '#94a3b8');
        ctx.fillText(diffText, 810, rowY + 34);

        // Points
        ctx.textAlign = 'right';
        ctx.font = '900 22px Montserrat, sans-serif';
        ctx.fillStyle = isTop3 ? '#00ffcc' : '#ffffff';
        ctx.fillText(player.stats.totalPoints.toString(), 975, rowY + 36);
      });

      // 6. Watermark Footer
      ctx.fillStyle = '#64748b';
      ctx.font = '600 15px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Lihat riwayat pertandingan & live score: ${publicUrl}`, 540, 995);

      ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
      ctx.font = '800 13px Montserrat, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('PADELSCORE PRO • STADIUM ENGINE', 540, 1025);

      try {
        if (isMounted) {
          setImageUri(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        console.warn("Canvas export fallback:", err);
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    generateCanvas().catch(err => {
      console.error("Canvas generation error:", err);
      if (isMounted) setIsGenerating(false);
    });
    return () => { isMounted = false; };
  }, [activeTab, playersWithStats, tournament, publicUrl]);

  // Web Share API handler
  const handleNativeShare = async () => {
    if (!imageUri) return;
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const file = new File([blob], `leaderboard-${tournament.name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${tournament.name} - Klasemen Akhir`,
          text: `🏆 Hasil klasemen turnamen ${tournament.name}!\nCek detail: ${publicUrl}`
        });
        setShareSuccess("Berhasil dibagikan!");
        setTimeout(() => setShareSuccess(null), 3000);
      } else if (navigator.share) {
        await navigator.share({
          title: `${tournament.name} - Klasemen Akhir`,
          text: `🏆 Hasil klasemen turnamen ${tournament.name}!\nCek detail: ${publicUrl}`,
          url: publicUrl
        });
        setShareSuccess("Link berhasil dibagikan!");
        setTimeout(() => setShareSuccess(null), 3000);
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!imageUri) return;
    const a = document.createElement('a');
    a.href = imageUri;
    a.download = `leaderboard-${tournament.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setShareSuccess("Gambar berhasil di-download!");
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 md:p-6 bg-background-dark/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-surface-dark border border-primary/20 rounded-2xl md:rounded-3xl shadow-[0_0_100px_rgba(0,255,204,0.15)] overflow-hidden flex flex-col max-h-[95dvh]">
        {/* Modal Header */}
        <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-background-dark/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">share</span>
            </div>
            <div>
              <h2 className="text-base md:text-xl font-black uppercase italic tracking-tight text-white">
                Bagikan Hasil Turnamen
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {tournament.name}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab Switcher: Leaderboard vs Match Results */}
        <div className="flex px-4 md:px-6 pt-3 pb-2 bg-background-dark/30 border-b border-white/5 shrink-0">
          <div className="flex bg-surface p-1 rounded-xl border border-white/10 w-full max-w-md mx-auto">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'leaderboard' ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-sm">leaderboard</span>
              <span>Kartu Klasemen</span>
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'matches' ? 'bg-primary text-background-dark shadow-md shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-sm">sports_tennis</span>
              <span>Skor Pertandingan ({finishedMatches.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'leaderboard' ? (
            /* TAB 1: LEADERBOARD GRAPHIC CARD */
            <div className="flex flex-col lg:flex-row gap-6 items-center">
              {/* Canvas Preview */}
              <div className="w-full lg:w-1/2 flex flex-col items-center">
                <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 shadow-[0_0_50px_rgba(0,255,204,0.15)] relative bg-black">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="size-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                        Membuat Kartu Grafis...
                      </span>
                    </div>
                  ) : (
                    imageUri && (
                      <img 
                        src={imageUri} 
                        alt="Leaderboard Card Preview" 
                        className="w-full h-full object-cover" 
                      />
                    )
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-2">
                  Preview 1080 × 1080 (Instagram / WhatsApp)
                </span>
              </div>

              {/* Share Actions */}
              <div className="w-full lg:w-1/2 flex flex-col gap-3">
                <div className="bg-surface p-4 rounded-2xl border border-white/5 space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">emoji_events</span>
                    <span>Ringkasan Juara</span>
                  </h3>
                  {playersWithStats[0] && (
                    <p className="text-xs text-slate-300">
                      Juara 1: <strong className="text-primary">{playersWithStats[0].name}</strong> ({playersWithStats[0].stats?.totalPoints ?? playersWithStats[0].points ?? 0} PTS)
                    </p>
                  )}
                  {playersWithStats[1] && (
                    <p className="text-xs text-slate-300">
                      Runner-up: <strong className="text-slate-200">{playersWithStats[1].name}</strong> ({playersWithStats[1].stats?.totalPoints ?? playersWithStats[1].points ?? 0} PTS)
                    </p>
                  )}
                </div>

                {shareSuccess && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>{shareSuccess}</span>
                  </div>
                )}

                <button
                  onClick={handleNativeShare}
                  disabled={isGenerating}
                  className="w-full h-14 bg-primary text-background-dark font-black uppercase tracking-widest text-xs md:text-sm rounded-xl shadow-[0_0_30px_rgba(0,255,204,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  <span>Bagikan Gambar (WhatsApp / IG)</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-wider text-[11px] rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    <span>Download PNG</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-wider text-[11px] rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">
                      {copiedLink ? 'done' : 'link'}
                    </span>
                    <span>{copiedLink ? 'Link Disalin!' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: FINISHED MATCH RESULTS */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Daftar Pertandingan yang Sudah Selesai ({finishedMatches.length})
                </p>
                <span className="text-[10px] text-primary font-bold uppercase">
                  Klik "Bagikan Skor" untuk export kartu laga
                </span>
              </div>

              {finishedMatches.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <span className="material-symbols-outlined text-5xl mb-2 opacity-40">sports_tennis</span>
                  <p className="text-xs uppercase font-bold tracking-wider">Belum ada pertandingan yang selesai</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {finishedMatches.map(match => {
                    const scoreA = isRally ? (match.teamA?.score ?? 0) : (match.teamA?.games ?? match.teamA?.score ?? 0);
                    const scoreB = isRally ? (match.teamB?.score ?? 0) : (match.teamB?.games ?? match.teamB?.score ?? 0);
                    const isWinnerA = scoreA > scoreB;
                    const isWinnerB = scoreB > scoreA;

                    const teamAName = getPlayerNames(match.teamA?.playerIds || []);
                    const teamBName = getPlayerNames(match.teamB?.playerIds || []);

                    return (
                      <div 
                        key={match.id}
                        className="bg-surface border border-white/5 hover:border-primary/30 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                          <span className="bg-white/5 px-2 py-0.5 rounded text-slate-400">
                            Round {match.round} • Lapangan {match.court}
                          </span>
                          <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            Selesai
                          </span>
                        </div>

                        {/* Matchup */}
                        <div className="space-y-1.5">
                          <div className={`flex items-center justify-between p-2 rounded-lg ${isWinnerA ? 'bg-primary/10 border border-primary/20 font-bold text-primary' : 'bg-background-dark/40 text-slate-300'}`}>
                            <span className="text-xs uppercase truncate max-w-[75%]">{teamAName}</span>
                            <span className="text-base font-black">{scoreA}</span>
                          </div>
                          <div className={`flex items-center justify-between p-2 rounded-lg ${isWinnerB ? 'bg-primary/10 border border-primary/20 font-bold text-primary' : 'bg-background-dark/40 text-slate-300'}`}>
                            <span className="text-xs uppercase truncate max-w-[75%]">{teamBName}</span>
                            <span className="text-base font-black">{scoreB}</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => setSelectedMatch(match)}
                          className="w-full h-10 bg-primary/10 hover:bg-primary text-primary hover:text-background-dark border border-primary/30 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">share</span>
                          <span>Bagikan Kartu Skor Ini</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal: Single Match Share Modal */}
      {selectedMatch && (
        <MatchShareModal
          match={selectedMatch}
          tournament={tournament}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
};

export default LeaderboardShareModal;
