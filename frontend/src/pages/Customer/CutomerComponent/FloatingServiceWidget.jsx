import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bell,
  Droplets,
  Receipt,
  Hand,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import API from '../../../services/api'; // আপনার api.js এর পাথ অনুযায়ী ঠিক করে নিন

/* ------------------------------------------------------------------ */
/*  কনফিগ — backend এর সাথে মিলিয়ে এখানে বদলান                      */
/* ------------------------------------------------------------------ */
const ENDPOINT = '/service-requests'; // dashboard এর handleServiceRequest এও এটাই ছিল
const BTN = 56; // বাটনের সাইজ (px)
const EDGE = 12; // স্ক্রিনের কিনারা থেকে দূরত্ব
const TOP_LIMIT = 80; // navbar এর নিচে থাকবে
const BOTTOM_GAP = 24;
const DRAG_THRESHOLD = 6; // এর বেশি নড়লে ড্র্যাগ ধরা হবে, নইলে ক্লিক
const COOLDOWN_MS = 20000; // একই রিকোয়েস্ট ২০ সেকেন্ড আবার পাঠানো যাবে না
const TOAST_MS = 3200;

const SERVICES = [
  { type: 'WATER', label: 'Pani Lagbe', sub: 'Request Water', icon: Droplets },
  { type: 'CALL_WAITER', label: 'Waiter Dakun', sub: 'Call Waiter', icon: Bell },
  { type: 'BILL', label: 'Bill Din', sub: 'Request Bill', icon: Receipt },
];

/* ------------------------------------------------------------------ */
/*  অ্যানিমেশন (keyframes) — আলাদা CSS ফাইল লাগবে না                  */
/* ------------------------------------------------------------------ */
const STYLES = `
@keyframes fsw-ring {
  0%   { transform: scale(1);   opacity: .55; }
  100% { transform: scale(1.95); opacity: 0; }
}
@keyframes fsw-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-5px); }
}
@keyframes fsw-wave {
  0%, 62%, 100% { transform: rotate(0deg); }
  68% { transform: rotate(16deg); }
  74% { transform: rotate(-12deg); }
  80% { transform: rotate(14deg); }
  86% { transform: rotate(-8deg); }
  92% { transform: rotate(6deg); }
}
@keyframes fsw-menu {
  0%   { opacity: 0; transform: scale(.55) translateY(14px); }
  60%  { opacity: 1; transform: scale(1.04) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes fsw-item {
  0%   { opacity: 0; transform: translateX(var(--fsw-dx, 16px)) scale(.94); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes fsw-backdrop {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes fsw-toast {
  0%   { opacity: 0; transform: translate(-50%, -24px) scale(.9); }
  60%  { opacity: 1; transform: translate(-50%, 4px) scale(1.02); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
@keyframes fsw-progress {
  from { transform: scaleX(1); } to { transform: scaleX(0); }
}
@keyframes fsw-check {
  0%   { transform: scale(0) rotate(-45deg); }
  60%  { transform: scale(1.3) rotate(8deg); }
  100% { transform: scale(1) rotate(0); }
}
@keyframes fsw-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
@keyframes fsw-burst {
  0%   { transform: scale(.6); opacity: .9; }
  100% { transform: scale(2.4); opacity: 0; }
}

.fsw-ring     { animation: fsw-ring 2.4s cubic-bezier(.2,.6,.3,1) infinite; }
.fsw-ring-2   { animation-delay: 1.2s; }
.fsw-float    { animation: fsw-float 3.6s ease-in-out infinite; }
.fsw-wave     { transform-origin: 70% 80%; animation: fsw-wave 5s ease-in-out infinite; }
.fsw-menu     { animation: fsw-menu .42s cubic-bezier(.22,1.2,.36,1) both; }
.fsw-item     { animation: fsw-item .4s cubic-bezier(.22,1.2,.36,1) both; }
.fsw-backdrop { animation: fsw-backdrop .25s ease-out both; }
.fsw-toast    { animation: fsw-toast .5s cubic-bezier(.22,1.2,.36,1) both; }
.fsw-progress { transform-origin: left; animation: fsw-progress ${TOAST_MS}ms linear forwards; }
.fsw-check    { animation: fsw-check .45s cubic-bezier(.22,1.4,.36,1) both; }
.fsw-shake    { animation: fsw-shake .4s ease-in-out; }
.fsw-burst    { animation: fsw-burst .6s ease-out forwards; }

@media (prefers-reduced-motion: reduce) {
  .fsw-ring, .fsw-float, .fsw-wave, .fsw-menu, .fsw-item,
  .fsw-backdrop, .fsw-toast, .fsw-progress, .fsw-check,
  .fsw-shake, .fsw-burst { animation: none !important; }
}
`;

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */
const leftX = () => EDGE;
const rightX = () => window.innerWidth - BTN - EDGE;
const clampY = (y) =>
  Math.max(TOP_LIMIT, Math.min(window.innerHeight - BTN - BOTTOM_GAP, y));

const FloatingServiceWidget = ({ tableId, tableNumber = 1 }) => {
  const [position, setPosition] = useState(() => ({
    x: rightX(),
    y: clampY(window.innerHeight - 220),
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [loadingType, setLoadingType] = useState(null); // কোন রিকোয়েস্ট যাচ্ছে
  const [sent, setSent] = useState({}); // { WATER: true } — cooldown এ থাকা রিকোয়েস্ট
  const [toast, setToast] = useState(null); // { id, kind: 'success' | 'error', text }
  const [shakeKey, setShakeKey] = useState(0);
  const [burstKey, setBurstKey] = useState(0);

  const posRef = useRef(position); // সবসময় সর্বশেষ position (stale closure এড়াতে)
  const dragRef = useRef({ active: false, moved: false, offX: 0, offY: 0, sx: 0, sy: 0 });
  const toastTimer = useRef(null);
  const cooldownTimers = useRef({});

  const updatePosition = useCallback((next) => {
    posRef.current = next;
    setPosition(next);
  }, []);

  /* resize হলে কিনারায় আটকে রাখা */
  useEffect(() => {
    const onResize = () => {
      const p = posRef.current;
      updatePosition({
        x: p.x > window.innerWidth / 2 - BTN / 2 ? rightX() : leftX(),
        y: clampY(p.y),
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updatePosition]);

  /* unmount এ সব timer পরিষ্কার */
  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      Object.values(cooldownTimers.current).forEach(clearTimeout);
    },
    []
  );

  /* Esc চাপলে মেনু বন্ধ */
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  /* ---------------- Drag (mouse + touch) ---------------- */
  const handlePointerDown = (e) => {
    dragRef.current = {
      active: true,
      moved: false,
      sx: e.clientX,
      sy: e.clientY,
      offX: e.clientX - posRef.current.x,
      offY: e.clientY - posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;

    if (!d.moved) {
      const dist = Math.hypot(e.clientX - d.sx, e.clientY - d.sy);
      if (dist < DRAG_THRESHOLD) return; // ছোট কাঁপুনি = ক্লিক
      d.moved = true;
      setIsDragging(true);
      setIsOpen(false);
    }

    updatePosition({
      x: Math.max(EDGE, Math.min(window.innerWidth - BTN - EDGE, e.clientX - d.offX)),
      y: clampY(e.clientY - d.offY),
    });
  };

  const handlePointerUp = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (d.moved) {
      setIsDragging(false);
      const p = posRef.current;
      // কাছের কিনারায় spring-এর মতো snap
      updatePosition({
        x: p.x + BTN / 2 < window.innerWidth / 2 ? leftX() : rightX(),
        y: p.y,
      });
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  /* ---------------- Toast ---------------- */
  const showToast = useCallback((kind, text) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), kind, text });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  /* ---------------- Request পাঠানো ---------------- */
  const handleSend = async (type, label) => {
    if (loadingType || sent[type]) return;
    setLoadingType(type);

    try {
      await API.post(ENDPOINT, {
        tableId,
        tableNumber,
        type,
        message: label,
      });

      setIsOpen(false);
      setCustomNote('');
      setBurstKey((k) => k + 1);
      showToast('success', `Table #${tableNumber}: "${label}" pathano hoyeche!`);

      // একই বাটন বারবার চাপা আটকাতে cooldown (custom note বাদে)
      if (type !== 'CUSTOM') {
        setSent((s) => ({ ...s, [type]: true }));
        clearTimeout(cooldownTimers.current[type]);
        cooldownTimers.current[type] = setTimeout(
          () => setSent((s) => ({ ...s, [type]: false })),
          COOLDOWN_MS
        );
      }
    } catch (error) {
      console.error('Service request failed:', error);
      setShakeKey((k) => k + 1);
      showToast('error', 'Request pathano shombhob hoyni. Abar chesta korun.');
    } finally {
      setLoadingType(null);
    }
  };

  /* মেনু কোন দিকে খুলবে */
  const isRight = position.x + BTN / 2 > window.innerWidth / 2;
  const isBottom = position.y + BTN / 2 > window.innerHeight / 2;
  const itemDx = isRight ? '18px' : '-18px';

  return (
    <>
      <style>{STYLES}</style>

      {/* ---------- Toast ---------- */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fsw-toast fixed top-20 left-1/2 z-[60] w-max max-w-[92vw] overflow-hidden rounded-2xl border bg-[#141923]/95 text-white shadow-2xl backdrop-blur-xl"
          style={{
            borderColor:
              toast.kind === 'success' ? 'rgba(249,115,22,.5)' : 'rgba(239,68,68,.55)',
          }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3 text-xs sm:text-sm">
            {toast.kind === 'success' ? (
              <CheckCircle2 className="fsw-check h-5 w-5 shrink-0 text-orange-500" />
            ) : (
              <AlertCircle className="fsw-check h-5 w-5 shrink-0 text-red-500" />
            )}
            <span>{toast.text}</span>
          </div>
          <div
            className={`fsw-progress h-0.5 ${
              toast.kind === 'success' ? 'bg-orange-500' : 'bg-red-500'
            }`}
          />
        </div>
      )}

      {/* ---------- Backdrop ---------- */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fsw-backdrop fixed inset-0 z-40 bg-black/45 backdrop-blur-[3px]"
        />
      )}

      {/* ---------- Draggable container ---------- */}
      <div
        className="fixed left-0 top-0 z-50"
        style={{
          width: BTN,
          height: BTN,
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          // ড্র্যাগের সময় transition নেই (smooth follow), ছাড়লে spring snap
          transition: isDragging
            ? 'none'
            : 'transform .5s cubic-bezier(.22,1.25,.36,1)',
          willChange: 'transform',
        }}
      >
        {/* ---------- Popover menu ---------- */}
        {isOpen && (
          <div
            key={shakeKey}
            className={`fsw-menu absolute w-64 rounded-2xl border border-slate-700/70 bg-[#141923]/95 p-3 text-white shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl ${
              isRight ? 'right-0' : 'left-0'
            } ${isBottom ? 'bottom-[68px]' : 'top-[68px]'}`}
            style={{
              transformOrigin: `${isRight ? 'right' : 'left'} ${isBottom ? 'bottom' : 'top'}`,
            }}
          >
            <div className="mb-2 flex items-center justify-between border-b border-slate-800 px-2 pb-2">
              <span className="text-xs font-semibold text-orange-400">
                Table #{tableNumber} • Quick Service
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-0.5 text-slate-400 transition hover:rotate-90 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {SERVICES.map(({ type, label, sub, icon: Icon }, i) => {
                const isLoading = loadingType === type;
                const isSent = !!sent[type];
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!!loadingType || isSent}
                    onClick={() => handleSend(type, label)}
                    className="fsw-item group flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition duration-200 hover:border-orange-500/30 hover:bg-orange-500/15 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ '--fsw-dx': itemDx, animationDelay: `${90 + i * 70}ms` }}
                  >
                    <div
                      className={`rounded-lg p-2 transition duration-200 group-hover:scale-110 ${
                        isSent
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isSent ? (
                        <Check className="fsw-check h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{label}</p>
                      <p className="text-[11px] text-slate-400">
                        {isSent ? 'Pathano hoyeche' : sub}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom note */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const note = customNote.trim();
                if (note) handleSend('CUSTOM', note);
              }}
              className="fsw-item mt-2.5 flex items-center gap-1.5 border-t border-slate-800 pt-2.5"
              style={{ '--fsw-dx': itemDx, animationDelay: `${90 + SERVICES.length * 70}ms` }}
            >
              <input
                type="text"
                value={customNote}
                maxLength={120}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Custom note likhun..."
                className="flex-1 rounded-lg border border-slate-700/80 bg-[#0B0E14] px-2.5 py-1.5 text-xs text-white transition placeholder:text-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="submit"
                aria-label="Send note"
                disabled={!!loadingType || !customNote.trim()}
                className="shrink-0 rounded-lg bg-orange-600 p-2 text-white transition hover:bg-orange-500 active:scale-90 disabled:opacity-50"
              >
                {loadingType === 'CUSTOM' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>
        )}

        {/* ---------- Floating button ---------- */}
        <div className={isDragging || isOpen ? '' : 'fsw-float'}>
          {/* ডাকার মতো pulse ring — শুধু বন্ধ অবস্থায় */}
          {!isOpen && !isDragging && (
            <>
              <span className="fsw-ring pointer-events-none absolute inset-0 rounded-full bg-orange-500/40" />
              <span className="fsw-ring fsw-ring-2 pointer-events-none absolute inset-0 rounded-full bg-orange-500/30" />
            </>
          )}

          {/* রিকোয়েস্ট সফল হলে burst */}
          {burstKey > 0 && (
            <span
              key={burstKey}
              className="fsw-burst pointer-events-none absolute inset-0 rounded-full border-2 border-orange-400"
            />
          )}

          <button
            type="button"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen((p) => !p);
              }
            }}
            aria-label="Quick service"
            aria-expanded={isOpen}
            title="Drag to move or tap for service"
            style={{ touchAction: 'none', width: BTN, height: BTN }}
            className={`relative flex cursor-grab items-center justify-center rounded-full border-2 border-orange-300/40 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 text-white shadow-[0_8px_25px_rgba(249,115,22,0.5)] outline-none transition-[transform,box-shadow] duration-300 focus-visible:ring-4 focus-visible:ring-orange-300/50 active:cursor-grabbing select-none ${
              isDragging
                ? 'scale-110 shadow-[0_16px_40px_rgba(249,115,22,0.65)]'
                : 'hover:scale-105'
            }`}
          >
            {/* Hand ↔ X : ঘুরে ঘুরে বদলায় */}
            <Hand
              className={`fsw-wave absolute h-6 w-6 transition-all duration-300 ${
                isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
              }`}
            />
            <X
              className={`absolute h-6 w-6 transition-all duration-300 ${
                isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
              }`}
            />
          </button>
        </div>
      </div>
    </>
  );
};

export default FloatingServiceWidget;