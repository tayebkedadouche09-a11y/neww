import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Share2, 
  Sparkles, 
  Check, 
  Palette, 
  Flame
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export const ShareStoryModal: React.FC = () => {
  const { isShareModalOpen, setIsShareModalOpen, shareTargetPlace, activePlan, showToast } = useData();
  const { currentUser } = useAuth();
  
  const [themeGradient, setThemeGradient] = useState<'neon-acid' | 'cyber-sunset' | 'hyper-violet' | 'dark-obsidian'>('neon-acid');
  const [selectedSticker, setSelectedSticker] = useState('🔥 MUST TRY');
  const [isCopied, setIsCopied] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsShareModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsShareModalOpen]);

  if (!isShareModalOpen) return null;

  const target = shareTargetPlace;

  const gradientClasses = {
    'neon-acid': 'from-black via-[#090A0F] to-[#1a2b00] border-vybe-lime',
    'cyber-sunset': 'from-black via-[#1f0b00] to-[#3b1200] border-vybe-citrus',
    'hyper-violet': 'from-black via-[#1a0033] to-[#2d004d] border-vybe-violet',
    'dark-obsidian': 'from-[#07080C] via-[#0E1017] to-[#161922] border-white/20'
  };

  const getShareUrl = () => {
    const url = new URL(window.location.origin);
    if (target?.id) {
      url.searchParams.set('place', target.id);
    } else if (activePlan?.id) {
      url.searchParams.set('plan', activePlan.id);
    }
    return url.toString();
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsCopied(true);
      showToast('Copied a direct VYBE link to clipboard!', '🔗', 'success');
      window.setTimeout(() => setIsCopied(false), 2500);
    } catch (error) {
      console.error('[ShareStoryModal] Failed to copy link:', error);
      showToast('Could not copy the link on this device.', '⚠️', 'info');
    }
  };

  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    if (themeGradient === 'neon-acid') {
      grad.addColorStop(0, '#090A0F');
      grad.addColorStop(0.5, '#121609');
      grad.addColorStop(1, '#050608');
    } else if (themeGradient === 'cyber-sunset') {
      grad.addColorStop(0, '#090A0F');
      grad.addColorStop(0.5, '#260c02');
      grad.addColorStop(1, '#050608');
    } else if (themeGradient === 'hyper-violet') {
      grad.addColorStop(0, '#090A0F');
      grad.addColorStop(0.5, '#1a0033');
      grad.addColorStop(1, '#050608');
    } else {
      grad.addColorStop(0, '#07080C');
      grad.addColorStop(0.5, '#0E1017');
      grad.addColorStop(1, '#161922');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.beginPath();
    ctx.arc(540, 600, 450, 0, Math.PI * 2);
    ctx.fillStyle = themeGradient === 'neon-acid' ? 'rgba(204, 255, 0, 0.15)' : 'rgba(255, 85, 0, 0.15)';
    ctx.fill();

    ctx.fillStyle = '#CCFF00';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('VYBE // DISCOVERY', 80, 140);

    ctx.fillStyle = '#8E94A8';
    ctx.font = '28px monospace';
    ctx.fillText(`CURATED BY @${currentUser?.username || 'kaivybes'}`, 80, 190);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 80px sans-serif';
    const name = target ? target.name : (activePlan?.title || 'My VYBE Plan');
    ctx.fillText(name.slice(0, 24), 80, 360);

    ctx.fillStyle = '#D1D5DB';
    ctx.font = '40px sans-serif';
    const tag = target ? target.tagline : 'Curated Outing Itinerary';
    ctx.fillText(tag.slice(0, 45), 80, 440);

    ctx.fillStyle = '#000000';
    ctx.fillRect(80, 520, 280, 80);
    ctx.fillStyle = '#CCFF00';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(`⚡ ${target?.baseVybeScore || 97} VYBE`, 110, 575);

    ctx.fillStyle = '#FF5500';
    ctx.fillRect(80, 640, 320, 65);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(selectedSticker, 100, 685);

    ctx.fillStyle = '#6B7280';
    ctx.font = '32px monospace';
    ctx.fillText('FIND YOUR NEXT VIBE — VYBE.APP', 80, 1820);

    const link = document.createElement('a');
    link.download = `vybe-story-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Story card downloaded in 1080x1920!', '📸', 'success');
  };

  return (
    <div 
      data-testid="share-story-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn cursor-pointer"
      onClick={() => setIsShareModalOpen(false)}
    >
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setIsShareModalOpen(false)}
          className="absolute top-4 right-4 p-2.5 rounded-full text-slate-400 hover:text-white bg-slate-100 dark:bg-vybe-dark-surface transition-colors"
          aria-label="Close share dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-vybe-citrus/15 text-vybe-citrus font-mono font-bold text-xs mb-1">
            <Share2 className="w-3.5 h-3.5" />
            <span>SOCIAL STORY GENERATOR</span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
            Generate Shareable VYBE Card
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The copied link opens the exact place or outing plan you are sharing.
          </p>
        </div>

        <div className="flex justify-center py-2">
          <div
            className={`w-72 sm:w-80 aspect-[9/16] rounded-3xl p-6 flex flex-col justify-between text-white border-2 shadow-2xl bg-gradient-to-br ${gradientClasses[themeGradient]} relative overflow-hidden transition-all`}
          >
            <div className="absolute top-1/3 -right-10 w-48 h-48 bg-vybe-lime/20 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-1 relative z-10">
              <div className="flex items-center justify-between">
                <span className="font-display font-black text-xl text-white tracking-tight">
                  VYBE <span className="text-vybe-lime">.</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-vybe-lime">STORY</span>
              </div>
              <p className="text-[10px] font-mono text-slate-400">Curated by @{currentUser?.username || 'kaivybes'}</p>
            </div>

            <div className="space-y-3 relative z-10">
              {target?.images[0] && (
                <div className="w-full h-36 rounded-2xl overflow-hidden border border-white/20 shadow-lg">
                  <img src={target.images[0]} alt={target.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 text-vybe-lime font-mono text-[10px] font-bold border border-vybe-lime/40">
                  <Sparkles className="w-3 h-3" />
                  <span>{target?.baseVybeScore || 97} VYBE MATCH</span>
                </div>

                <h3 className="font-display font-extrabold text-xl text-white leading-tight">
                  {target?.name || activePlan?.title || 'My Friday VYBE'}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {target?.tagline || '3 unforgettable spots to hit with friends'}
                </p>
              </div>

              <div className="inline-block px-3 py-1 rounded-xl bg-vybe-citrus text-white font-display font-extrabold text-xs shadow-neon-citrus rotate-2">
                {selectedSticker}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-slate-400 relative z-10">
              <span>SCAN / FIND YOUR NEXT VIBE</span>
              <span className="text-vybe-lime font-bold">VYBE.APP</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-vybe-lime" />
              <span>Card Gradient Theme</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'neon-acid', label: 'Neon Acid', color: 'bg-[#CCFF00]' },
                { id: 'cyber-sunset', label: 'Sunset Tangerine', color: 'bg-[#FF5500]' },
                { id: 'hyper-violet', label: 'Hyper Violet', color: 'bg-[#8A2BE2]' },
                { id: 'dark-obsidian', label: 'Dark Obsidian', color: 'bg-slate-700' }
              ].map(g => (
                <button key={g.id} onClick={() => setThemeGradient(g.id as 'neon-acid' | 'cyber-sunset' | 'hyper-violet' | 'dark-obsidian')} className={`p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${themeGradient === g.id ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-md' : 'bg-slate-100 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300'}`}>
                  <span className={`w-3 h-3 rounded-full ${g.color}`} />
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-vybe-citrus" />
              <span>Story Sticker</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {['🔥 MUST TRY', '🌙 10/10 VIBE', '🚀 SQUAD APPROVED', '✨ SECRET SPOT', '🍜 BEST EATS'].map(s => (
                <button key={s} onClick={() => setSelectedSticker(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedSticker === s ? 'bg-vybe-citrus text-white border-vybe-citrus shadow-neon-citrus' : 'bg-slate-100 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <button onClick={handleCopyLink} className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime flex items-center justify-center gap-2 transition-all">
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Link Copied!' : 'Copy Direct Link'}</span>
          </button>

          <button onClick={handleDownloadCard} className="flex-1 py-3 px-4 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-xs uppercase tracking-wider shadow-neon-lime hover:scale-105 flex items-center justify-center gap-2 transition-all">
            <Download className="w-4 h-4" />
            <span>Download 1080x1920</span>
          </button>
        </div>
      </div>
    </div>
  );
};
