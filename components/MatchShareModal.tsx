import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Match, Tournament } from '../types';
import { buildPublicTournamentUrl } from '../utils/shareUrl';

interface MatchShareModalProps {
  match: Match;
  tournament: Tournament;
  onClose: () => void;
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

export const MatchShareModal: React.FC<MatchShareModalProps> = ({ match, tournament, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const playersList = tournament.players || [];
  const getPlayer = (id: string) => playersList.find(p => p && p.id === id);

  const teamAPlayers = (match?.teamA?.playerIds || []).map(getPlayer).filter(Boolean);
  const teamBPlayers = (match?.teamB?.playerIds || []).map(getPlayer).filter(Boolean);

  const teamANames = teamAPlayers.length > 0 ? teamAPlayers.map(p => p?.name).join(' / ') : 'Team A';
  const teamBNames = teamBPlayers.length > 0 ? teamBPlayers.map(p => p?.name).join(' / ') : 'Team B';

  const isRally = tournament.scoring === 'Rally Points';
  const scoreA = isRally ? (match?.teamA?.score ?? 0) : (match?.teamA?.games ?? match?.teamA?.score ?? 0);
  const scoreB = isRally ? (match?.teamB?.score ?? 0) : (match?.teamB?.games ?? match?.teamB?.score ?? 0);

  const isWinnerA = scoreA > scoreB;
  const isWinnerB = scoreB > scoreA;
  const isDraw = scoreA === scoreB;

  const winnerText = isDraw ? "IT'S A DRAW" : (isWinnerA ? "TEAM A WINS" : "TEAM B WINS");

  // Tournament Public URL
  const publicUrl = useMemo(() => buildPublicTournamentUrl(tournament), [tournament]);

  const captionText = `🎾 *PADELSCORE PRO MATCH RESULT*\n🏆 *${tournament.name}* (Court ${match.court || 1} • Round ${match.round || 1})\n\n🔹 *${teamANames}* [ ${scoreA} ]\n🔸 *${teamBNames}* [ ${scoreB} ]\n\n⭐ *${winnerText}!*\n📊 Lihat klasemen & live score: ${publicUrl}`;

  // Generate High-Res Image on Canvas (1080 x 1080 Square)
  useEffect(() => {
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

      // Subtle Cyber Grid & Ambient Glow
      const glowGrad = ctx.createRadialGradient(540, 540, 50, 540, 540, 600);
      glowGrad.addColorStop(0, 'rgba(0, 255, 204, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Outer Border Glow
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, 1020, 1020);

      // Corner Accents
      const cornerSize = 40;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 6;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(30, 30 + cornerSize);
      ctx.lineTo(30, 30);
      ctx.lineTo(30 + cornerSize, 30);
      ctx.stroke();
      // Top Right
      ctx.beginPath();
      ctx.moveTo(1050 - cornerSize, 30);
      ctx.lineTo(1050, 30);
      ctx.lineTo(1050, 30 + cornerSize);
      ctx.stroke();
      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(30, 1050 - cornerSize);
      ctx.lineTo(30, 1050);
      ctx.lineTo(30 + cornerSize, 1050);
      ctx.stroke();
      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(1050 - cornerSize, 1050);
      ctx.lineTo(1050, 1050);
      ctx.lineTo(1050, 1050 - cornerSize);
      ctx.stroke();

      // 2. Header: App Branding & Tournament Name
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00ffcc';
      ctx.font = '900 28px sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('PADELSCORE PRO', 540, 95);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 900 48px sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(tournament.name.toUpperCase(), 540, 160);

      // Pill: Court & Round
      const pillText = `COURT ${match.court || 1}  •  ROUND ${match.round || 1}  •  ${tournament.type.toUpperCase()}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      drawRoundRect(ctx, 320, 185, 440, 42, 21);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 16px sans-serif';
      ctx.fillText(pillText, 540, 212);

      // 3. Match Card Container
      ctx.fillStyle = 'rgba(18, 26, 32, 0.85)';
      drawRoundRect(ctx, 80, 260, 920, 560, 36);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // VS in Center
      ctx.fillStyle = 'rgba(0, 255, 204, 0.12)';
      ctx.font = 'italic 900 110px sans-serif';
      ctx.fillText('VS', 540, 565);

      // Team A Section (Left)
      // Winner Badge if Team A
      if (isWinnerA) {
        ctx.fillStyle = '#00ffcc';
        drawRoundRect(ctx, 140, 290, 180, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#090d10';
        ctx.font = '900 15px sans-serif';
        ctx.fillText('★ WINNER', 230, 313);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = isWinnerA ? '#00ffcc' : '#ffffff';
      ctx.font = '800 24px sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('TEAM A', 290, 365);

      // Player names Team A
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px sans-serif';
      ctx.letterSpacing = '0px';
      const pA1 = teamAPlayers[0]?.name || 'Player 1';
      const pA2 = teamAPlayers[1]?.name || '';
      ctx.fillText(pA1, 290, 420);
      if (pA2) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 22px sans-serif';
        ctx.fillText('&', 290, 455);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px sans-serif';
        ctx.fillText(pA2, 290, 495);
      }

      // Team A Score
      ctx.fillStyle = isWinnerA ? '#00ffcc' : '#ffffff';
      ctx.font = '900 150px sans-serif';
      ctx.letterSpacing = '-4px';
      ctx.fillText(String(scoreA), 290, pA2 ? 690 : 620);

      // Team B Section (Right)
      // Winner Badge if Team B
      if (isWinnerB) {
        ctx.fillStyle = '#00ffcc';
        drawRoundRect(ctx, 760, 290, 180, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#090d10';
        ctx.font = '900 15px sans-serif';
        ctx.fillText('★ WINNER', 850, 313);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = isWinnerB ? '#00ffcc' : '#ffffff';
      ctx.font = '800 24px sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('TEAM B', 790, 365);

      // Player names Team B
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px sans-serif';
      ctx.letterSpacing = '0px';
      const pB1 = teamBPlayers[0]?.name || 'Player 3';
      const pB2 = teamBPlayers[1]?.name || '';
      ctx.fillText(pB1, 790, 420);
      if (pB2) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 22px sans-serif';
        ctx.fillText('&', 790, 455);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px sans-serif';
        ctx.fillText(pB2, 790, 495);
      }

      // Team B Score
      ctx.fillStyle = isWinnerB ? '#00ffcc' : '#ffffff';
      ctx.font = '900 150px sans-serif';
      ctx.letterSpacing = '-4px';
      ctx.fillText(String(scoreB), 790, pB2 ? 690 : 620);

      // Sets / Match Type Details below score card
      if (match?.teamA?.sets !== undefined && match?.teamB?.sets !== undefined && tournament.scoring !== 'Rally Points') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        drawRoundRect(ctx, 380, 740, 320, 50, 12);
        ctx.fill();
        ctx.fillStyle = '#00ffcc';
        ctx.font = '700 18px sans-serif';
        ctx.fillText(`SETS: ${match.teamA.sets} - ${match.teamB.sets}`, 540, 772);
      }

      // 4. Footer Banner: Result Announcement
      ctx.fillStyle = isDraw ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 255, 204, 0.12)';
      drawRoundRect(ctx, 80, 850, 920, 100, 24);
      ctx.fill();
      ctx.strokeStyle = isDraw ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 255, 204, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isDraw ? '#ffffff' : '#00ffcc';
      ctx.font = 'italic 900 36px sans-serif';
      ctx.fillText(winnerText, 540, 912);

      // 5. Watermark / Link footer
      ctx.fillStyle = '#64748b';
      ctx.font = '600 16px sans-serif';
      ctx.fillText(`Official Live Tournament Scoreboard • ${publicUrl}`, 540, 995);

      // Export to Data URI
      try {
        const dataUri = canvas.toDataURL('image/png');
        setImageUri(dataUri);
      } catch (e) {
        console.warn("Match card export warning:", e);
      } finally {
        setIsGenerating(false);
      }
    };

    generateCanvas().catch(err => {
      console.error("Match canvas error:", err);
      setIsGenerating(false);
    });
  }, [match, tournament]);

  // Handle Native Web Share API
  const handleShare = async () => {
    if (!imageUri) return;

    try {
      // Convert Data URI to Blob
      const res = await fetch(imageUri);
      const blob = await res.blob();
      const file = new File([blob], `padel-match-court-${match?.court || 1}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Match Result - ${tournament.name}`,
          text: captionText,
          files: [file]
        });
        setShareSuccess('Berhasil dibagikan!');
        setTimeout(() => setShareSuccess(null), 3000);
      } else {
        // Fallback: Download file & copy caption
        handleDownload();
        await navigator.clipboard.writeText(captionText);
        setShareSuccess('Gambar diunduh & teks disalin ke clipboard!');
        setTimeout(() => setShareSuccess(null), 4000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        handleDownload();
      }
    }
  };

  const handleDownload = () => {
    if (!imageUri) return;
    const a = document.createElement('a');
    a.href = imageUri;
    a.download = `padelscore-court-${match?.court || 1}-round-${match?.round || 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-background-dark/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-surface-dark border border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,255,204,0.15)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg">share</span>
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black uppercase italic text-white leading-tight">
                Bagikan Hasil Pertandingan
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Court {match.court || 1} • Round {match.round || 1}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="size-8 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content: Image Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center gap-4 custom-scrollbar">
          {/* Hidden Canvas for High-DPI Rendering */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Card Preview */}
          <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl relative bg-background-dark flex items-center justify-center">
            {isGenerating || !imageUri ? (
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Merender Kartu Skor...
                </span>
              </div>
            ) : (
              <img src={imageUri} alt="Match Scorecard" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Feedback message */}
          {shareSuccess && (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold animate-in fade-in">
              {shareSuccess}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 md:p-5 border-t border-white/10 bg-white/[0.02] flex flex-col gap-2.5">
          <button
            onClick={handleShare}
            disabled={isGenerating || !imageUri}
            className="w-full h-13 rounded-xl bg-primary text-background-dark font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,255,204,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            <span>Bagikan ke WhatsApp / Medsos</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              disabled={isGenerating || !imageUri}
              className="h-11 rounded-xl bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Download PNG</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="h-11 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-sm">
                {copiedLink ? 'check' : 'link'}
              </span>
              <span>{copiedLink ? 'Tersalin!' : 'Salin Link Web'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchShareModal;
