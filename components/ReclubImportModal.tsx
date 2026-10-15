import React, { useState } from 'react';
import { Gender } from '../types';
import { getAvatarUrl } from '../utils/avatar';

interface ImportedPlayer {
  id: string;
  name: string;
  gender: Gender;
  avatarUrl: string;
}

interface ReclubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (players: ImportedPlayer[], suggestedName?: string) => void;
}

const ReclubImportModal: React.FC<ReclubImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [url, setUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string>('');
  const [importedPlayers, setImportedPlayers] = useState<ImportedPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerGender, setNewPlayerGender] = useState<Gender>('male');

  if (!isOpen) return null;

  const handleFetchUrl = async () => {
    if (!url.trim()) {
      setError('Masukkan link URL dari Reclub');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reclub/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengambil data pemain');
      }

      setEventName(data.eventName || '');

      const parsed: ImportedPlayer[] = data.players.map((p: any, idx: number) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: p.name,
        gender: p.gender || 'male',
        avatarUrl: p.avatarUrl || getAvatarUrl(p.name + idx)
      }));

      setImportedPlayers(parsed);
    } catch (err: any) {
      console.error('Fetch Reclub error:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses tautan Reclub.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseText = () => {
    if (!pasteText.trim()) {
      setError('Tempel teks daftar pemain terlebih dahulu');
      return;
    }

    setError(null);
    const lines = pasteText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const players: ImportedPlayer[] = [];
    lines.forEach((line, idx) => {
      // Remove numbering like "1.", "1)", "[1]"
      let clean = line.replace(/^[0-9]+[\.\)\-\:\s]+/g, '').trim();
      // Detect gender tags like (M), (F), [M], [F], - M, - F
      let gender: Gender = 'male';
      if (/\b(f|female|wanita|w|cewek)\b/i.test(clean)) {
        gender = 'female';
      }
      clean = clean.replace(/[\(\[\{]?(m|f|male|female|pria|wanita)[\)\]\}]?/gi, '').trim();

      if (clean.length >= 2) {
        players.push({
          id: Math.random().toString(36).substr(2, 9),
          name: clean,
          gender,
          avatarUrl: getAvatarUrl(clean + idx)
        });
      }
    });

    if (players.length === 0) {
      setError('Tidak ada nama pemain yang berhasil terbaca dari teks.');
      return;
    }

    setImportedPlayers(players);
  };

  const toggleGender = (id: string) => {
    setImportedPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, gender: p.gender === 'male' ? 'female' : 'male' } : p
    ));
  };

  const removePlayer = (id: string) => {
    setImportedPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setImportedPlayers(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: newPlayerName.trim(),
        gender: newPlayerGender,
        avatarUrl: getAvatarUrl(newPlayerName.trim())
      }
    ]);
    setNewPlayerName('');
  };

  const handleConfirm = () => {
    if (importedPlayers.length < 2) {
      setError('Daftar pemain minimal harus 2 orang!');
      return;
    }
    onImport(importedPlayers, eventName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-surface-dark border border-primary/30 rounded-[2rem] shadow-[0_0_100px_rgba(0,255,204,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0 bg-background-dark/50">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">download_for_offline</span>
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                Import Pemain dari Reclub
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Ambil nama pemain & foto profil langsung dari tautan Reclub
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="size-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-background-dark/30 px-6 pt-3 shrink-0">
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-3 px-4 font-black uppercase tracking-wider text-xs border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'url'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">link</span>
            Tautan Link URL Reclub
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-3 px-4 font-black uppercase tracking-wider text-xs border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'paste'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">content_paste</span>
            Tempel Teks Daftar
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
          {activeTab === 'url' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">attachment</span>
                  URL Reclub (Meet / Club / Event)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError(null);
                    }}
                    placeholder="Contoh: https://reclub.co/m/xyz atau https://reclub.co/clubs/@padel..."
                    className="flex-1 h-12 bg-background-dark border border-white/10 rounded-xl px-4 text-xs font-bold text-white focus:outline-none focus:border-primary placeholder:text-slate-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={isLoading}
                    className="h-12 px-6 rounded-xl bg-primary text-background-dark font-black uppercase tracking-wider text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="size-4 border-2 border-background-dark/20 border-t-background-dark rounded-full animate-spin" />
                        <span>Mengambil...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">sync</span>
                        <span>Tarik Pemain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">edit_note</span>
                  Tempel Daftar Nama Pemain (1 nama per baris)
                </label>
                <textarea
                  rows={5}
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    setError(null);
                  }}
                  placeholder={"1. Andi (M)\n2. Budi\n3. Cindy (F)\n4. Dian (F)"}
                  className="w-full bg-background-dark border border-white/10 rounded-xl p-3 text-xs font-bold text-white focus:outline-none focus:border-primary placeholder:text-slate-600 custom-scrollbar"
                />
                <button
                  onClick={handleParseText}
                  className="h-10 px-5 rounded-xl bg-primary text-background-dark font-black uppercase tracking-wider text-xs hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                  <span>Baca Nama Pemain</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {/* Results Section */}
          {importedPlayers.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <span>{eventName || 'Daftar Pemain'}</span>
                    <span className="text-primary text-xs bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                      {importedPlayers.length} Pemain
                    </span>
                  </h3>
                  <p className="text-[9px] text-slate-500 uppercase mt-0.5">
                    Klik tombol M/F untuk mengganti gender jika diperlukan
                  </p>
                </div>
              </div>

              {/* Player list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                {importedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="p-3 rounded-xl bg-surface border border-white/10 flex items-center justify-between gap-3 group hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="size-9 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                      <span className="text-xs font-bold text-white truncate">
                        {player.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleGender(player.id)}
                        className={`size-6 rounded-lg text-[9px] font-black flex items-center justify-center transition-all ${
                          player.gender === 'male'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-pink-500/20 text-pink-400 border border-pink-500/40'
                        }`}
                        title="Klik untuk ubah gender (Male/Female)"
                      >
                        {player.gender === 'male' ? 'M' : 'F'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="size-6 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-500 flex items-center justify-center transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add extra player manually */}
              <form onSubmit={handleAddManual} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Tambah nama pemain tambahan..."
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="flex-1 h-10 bg-background-dark border border-white/10 rounded-xl px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setNewPlayerGender(g => g === 'male' ? 'female' : 'male')}
                  className={`size-10 rounded-xl text-xs font-black flex items-center justify-center border transition-all ${
                    newPlayerGender === 'male'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                  }`}
                  title="Gender pemain baru"
                >
                  {newPlayerGender === 'male' ? 'M' : 'F'}
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-white/10 hover:bg-primary hover:text-background-dark text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Tambah</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-background-dark/80 border-t border-white/5 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl border border-white/10 text-slate-300 font-bold uppercase tracking-wider text-xs hover:bg-white/5 transition-all"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={importedPlayers.length < 2}
            className={`flex-1 h-12 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
              importedPlayers.length >= 2
                ? 'bg-primary text-background-dark shadow-primary/20 hover:brightness-110'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Gunakan {importedPlayers.length} Pemain</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReclubImportModal;
