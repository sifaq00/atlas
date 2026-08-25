import React, { useRef, useState, useCallback } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';

interface CardData {
  id: string;
  content: React.ReactNode;
}

const CARDS: CardData[] = [
  {
    id: 'health',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none">
        <div>
          <div className="font-mono text-[9px] tracking-wider uppercase font-semibold text-slate-400">Code Health</div>
          <div className="text-2xl font-bold tracking-tight text-sky-600 mt-0.5">
            98% <span className="text-[11px] font-normal text-slate-400">clean</span>
          </div>
        </div>
        <div className="space-y-1.5 my-auto">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full w-[92%]"></div>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full w-[78%]"></div>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-300 rounded-full w-[60%]"></div>
          </div>
        </div>
        <div className="text-[9.5px] text-slate-400 font-mono flex justify-between font-medium">
          <span>0 Loops</span>
          <span>Rust</span>
          <span>Zero-Copy</span>
        </div>
      </div>
    ),
  },
  {
    id: 'graph',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none">
        <div>
          <div className="font-mono text-[9px] tracking-wider uppercase font-semibold text-slate-400">Dependency Graph</div>
          <div className="text-[13px] font-bold text-slate-900 leading-snug mt-0.5">AST Parsing Engine</div>
        </div>
        <div className="h-14 flex items-end justify-between gap-1.5 my-auto px-1">
          <div className="w-full bg-sky-100 rounded-t h-[30%]"></div>
          <div className="w-full bg-sky-200 rounded-t h-[45%]"></div>
          <div className="w-full bg-sky-300 rounded-t h-[60%]"></div>
          <div className="w-full bg-sky-400 rounded-t h-[75%]"></div>
          <div className="w-full bg-sky-500 rounded-t h-[90%]"></div>
          <div className="w-full bg-sky-600 rounded-t h-[100%]"></div>
          <div className="w-full bg-[#D9F65A] rounded-t h-[80%]"></div>
        </div>
        <div className="text-[9px] text-slate-400 font-mono flex justify-between font-medium">
          <span>UI</span>
          <span>API</span>
          <span>DB</span>
          <span>Core</span>
        </div>
      </div>
    ),
  },
  {
    id: 'live-map',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-gradient-to-b from-white/90 to-sky-50/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-500">Live Map</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[8px] font-mono text-emerald-600 font-bold">LIVE</span>
          </span>
        </div>
        <div className="space-y-2 my-auto">
          <div className="bg-white rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-slate-800 flex items-center justify-between shadow-sm border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span className="font-mono text-[10px]">router.ts</span>
            </div>
            <span className="text-[8px] font-mono font-semibold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">AST</span>
          </div>
          <div className="bg-white rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-slate-800 flex items-center justify-between shadow-sm border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-[10px]">db/client.ts</span>
            </div>
            <span className="text-[8px] font-mono font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Active</span>
          </div>
        </div>
        <div className="text-[9.5px] text-slate-500 font-medium">Auto-synced on save</div>
      </div>
    ),
  },
  {
    id: 'blast-radius',
    content: (
      <div className="w-full h-full flex flex-col justify-between select-none overflow-hidden rounded-[22px]">
        <div className="bg-[#0f172a] text-white p-3 flex items-center justify-between">
          <span className="font-mono text-[8.5px] uppercase tracking-wider text-slate-400 font-medium">Blast Radius</span>
          <span className="text-rose-400 font-mono text-[8px] bg-rose-950/80 px-1.5 py-0.5 rounded font-bold border border-rose-800/40">Impact</span>
        </div>
        <div className="p-3.5 flex flex-col justify-between flex-1 bg-white">
          <div>
            <div className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-none">
              23 files
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">downstream dependent</div>
          </div>
          <div className="flex gap-1 flex-wrap mt-2">
            <span className="font-mono text-[8px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">auth/*</span>
            <span className="font-mono text-[8px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">session</span>
            <span className="font-mono text-[8px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium">+21</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'datapoints',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-white">
        <div className="flex gap-1 flex-wrap">
          <span className="font-mono text-[8px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">AST</span>
          <span className="font-mono text-[8px] font-semibold bg-[#D9F65A] text-[#1E2405] px-2 py-0.5 rounded-full">Rust Engine</span>
        </div>
        <div className="my-auto text-left">
          <div className="font-mono text-[9px] uppercase font-semibold text-slate-400">Data Points</div>
          <div className="text-[34px] font-extrabold tracking-tight text-slate-900 leading-none mt-1">520k+</div>
        </div>
        <div className="text-[10px] text-slate-500 font-medium leading-tight">Nodes mapped in memory</div>
      </div>
    ),
  },
  {
    id: 'ast-engine',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-gradient-to-br from-sky-500 to-sky-700 text-white rounded-[22px]">
        <div className="flex items-center justify-between">
          <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-sm shadow-sm">
            ⚡
          </div>
          <span className="font-mono text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">WASM</span>
        </div>
        <div className="my-auto">
          <div className="text-[16px] font-bold text-white leading-snug">AST Engine</div>
          <div className="text-[10.5px] text-sky-100 mt-0.5 leading-tight">Deterministic OXC parser</div>
        </div>
        <span className="font-mono text-[8.5px] bg-[#D9F65A] text-[#1E2405] font-bold px-2 py-0.5 rounded-full w-fit">100% Local</span>
      </div>
    ),
  },
  {
    id: 'architecture',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-[#0B1420] text-white rounded-[22px] border border-white/10">
        <div>
          <span className="font-mono text-[8.5px] uppercase font-bold text-[#D9F65A]">Architecture</span>
          <div className="text-[13px] font-semibold leading-snug text-slate-100 mt-1">
            Layered: <span className="text-[#D9F65A]">UI</span>, <span className="text-sky-400">Services</span>, & Data
          </div>
        </div>
        <div className="flex items-center gap-1.5 my-auto">
          <span className="w-2 h-2 rounded-full bg-[#D9F65A]"></span>
          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
        </div>
        <div className="text-[9.5px] text-slate-400 font-mono font-medium">Instant graph navigation</div>
      </div>
    ),
  },
];

/* Duplicate items 3× for seamless infinite marquee */
const ALL_CARDS = [...CARDS, ...CARDS, ...CARDS];
const CARD_W = 190;
const CARD_GAP = 18;
const SINGLE_SET_W = CARDS.length * (CARD_W + CARD_GAP);

export const HeroCards3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);

  const setCardRef = useCallback((el: HTMLDivElement | null, i: number) => {
    cardRefs.current[i] = el;
  }, []);

  /* ── continuous leftward scroll via framer-motion x ── */
  useAnimationFrame((_, delta) => {
    if (isHovered) return;
    const cur = x.get();
    let next = cur - (48 * delta) / 1000;
    if (Math.abs(next) >= SINGLE_SET_W) next += SINGLE_SET_W;
    x.set(next);
  });

  /* ── 3D arc transforms via direct DOM ── */
  useAnimationFrame(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const cCenter = cRect.left + cRect.width / 2;

    cardRefs.current.forEach((card) => {
      if (!card) return;
      const r = card.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;

      // normalised –1 … 1
      const raw = (cardCenter - cCenter) / (cRect.width / 2);
      const d = Math.max(-1.3, Math.min(1.3, raw));

      const rotateY = -d * 30;                                       // max ±30°
      const translateZ = -Math.pow(Math.abs(d), 1.6) * 140;         // depth
      const scale = Math.max(0.82, 1.08 - Math.abs(d) * 0.19);     // centre bigger
      const opacity = Math.max(0.3, 1 - Math.pow(Math.abs(d) / 1.5, 3));

      card.style.transform =
        `perspective(900px) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
      card.style.opacity = String(opacity);
    });
  });

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden py-3 relative select-none"
      style={{ perspective: '1400px', perspectiveOrigin: 'center 75%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* soft edge fade */}
      <div className="pointer-events-none absolute left-0 top-0 w-28 h-full z-30 bg-gradient-to-r from-sky-brand/60 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 w-28 h-full z-30 bg-gradient-to-l from-sky-brand/60 to-transparent" />

      <motion.div
        ref={trackRef}
        className="flex items-center"
        style={{ x, transformStyle: 'preserve-3d', width: 'max-content' }}
      >
        {ALL_CARDS.map((card, i) => (
          <div
            key={`${card.id}-${i}`}
            ref={(el) => setCardRef(el, i)}
            style={{
              width: CARD_W,
              height: CARD_W,
              marginRight: CARD_GAP,
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
              transition: 'transform 0.08s ease-out, opacity 0.08s ease-out',
            }}
            className="shrink-0 rounded-[22px] bg-white border border-white/80 shadow-[0_16px_36px_rgba(7,40,74,0.18)] overflow-hidden flex flex-col justify-between cursor-pointer"
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'perspective(900px) rotateY(0deg) translateZ(60px) scale(1.14)';
              el.style.opacity = '1';
              el.style.zIndex = '10';
              el.style.boxShadow = '0 30px 60px -15px rgba(7,40,74,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.zIndex = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            {card.content}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default HeroCards3D;
