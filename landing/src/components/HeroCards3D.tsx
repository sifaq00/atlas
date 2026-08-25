import React, { useRef, useState, useCallback } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';

interface CardData {
  id: string;
  content: React.ReactNode;
}

const CARDS: CardData[] = [
  // 1. Code Health - Square 1:1
  {
    id: 'health',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-white rounded-[20px] border border-white/90 shadow-[0_12px_30px_rgba(7,40,74,0.12)]">
        <div>
          <div className="font-mono text-[8.5px] tracking-wider uppercase font-semibold text-slate-400">Code Health</div>
          <div className="text-xl font-bold tracking-tight text-sky-600 mt-0.5">
            98% <span className="text-[10px] font-normal text-slate-400">clean</span>
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
        <div className="text-[9px] text-slate-400 font-mono flex justify-between font-medium">
          <span>0 Loops</span>
          <span>Rust</span>
          <span>Zero-Copy</span>
        </div>
      </div>
    ),
  },

  // 2. Dependency Graph - Square 1:1
  {
    id: 'graph',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-white rounded-[20px] border border-white/90 shadow-[0_12px_30px_rgba(7,40,74,0.12)]">
        <div>
          <div className="font-mono text-[8.5px] tracking-wider uppercase font-semibold text-slate-400">Dependency Graph</div>
          <div className="text-[12.5px] font-bold text-slate-900 leading-snug mt-0.5">AST Parsing Engine</div>
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
        <div className="text-[8.5px] text-slate-400 font-mono flex justify-between font-medium">
          <span>UI</span>
          <span>API</span>
          <span>DB</span>
          <span>Core</span>
        </div>
      </div>
    ),
  },

  // 3. Live Map (Glassmorphic) - Square 1:1
  {
    id: 'live-map',
    content: (
      <div className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between select-none bg-white/50 backdrop-blur-xl rounded-[20px] border border-white/70 text-slate-900 shadow-[0_12px_30px_rgba(7,40,74,0.12)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8.5px] font-semibold uppercase tracking-wider text-slate-700">Live Map</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="space-y-1.5 my-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] font-medium text-slate-800 flex items-center justify-between shadow-sm border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span className="font-mono text-[9.5px]">router.ts</span>
            </div>
            <span className="text-[7.5px] font-mono font-semibold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">AST</span>
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] font-medium text-slate-800 flex items-center justify-between shadow-sm border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-[9.5px]">db/client.ts</span>
            </div>
            <span className="text-[7.5px] font-mono font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Live</span>
          </div>
        </div>
        <div className="text-[9px] text-slate-600 font-medium">Auto-synced on save</div>
      </div>
    ),
  },

  // 4. Blast Radius - Square 1:1
  {
    id: 'blast-radius',
    content: (
      <div className="w-full h-full flex flex-col justify-between select-none bg-white rounded-[20px] border border-white/90 shadow-[0_12px_30px_rgba(7,40,74,0.15)] overflow-hidden">
        <div className="bg-[#0f172a] text-white p-2.5 flex items-center justify-between">
          <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400 font-medium">Blast Radius</span>
          <span className="text-rose-400 font-mono text-[7.5px] bg-rose-950/80 px-1.5 py-0.5 rounded font-bold border border-rose-800/40">Impact</span>
        </div>
        <div className="p-3 flex flex-col justify-between flex-1 bg-white">
          <div>
            <div className="text-[24px] font-extrabold tracking-tight text-slate-900 leading-none">
              23 files
            </div>
            <div className="text-[9.5px] text-slate-500 mt-0.5 font-medium">downstream dependent</div>
          </div>
          <div className="flex gap-1 flex-wrap mt-1">
            <span className="font-mono text-[7.5px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">auth/*</span>
            <span className="font-mono text-[7.5px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">session</span>
          </div>
        </div>
      </div>
    ),
  },

  // 5. Data Points 520k+ - Square 1:1
  {
    id: 'datapoints',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-white rounded-[20px] border border-white/90 shadow-[0_12px_30px_rgba(7,40,74,0.12)]">
        <div className="flex gap-1 flex-wrap">
          <span className="font-mono text-[7.5px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">AST</span>
          <span className="font-mono text-[7.5px] font-semibold bg-[#D9F65A] text-[#1E2405] px-2 py-0.5 rounded-full">Rust</span>
        </div>
        <div className="my-auto text-left">
          <div className="font-mono text-[8.5px] uppercase font-semibold text-slate-400">Data Points</div>
          <div className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-none mt-0.5">520k+</div>
        </div>
        <div className="text-[9.5px] text-slate-500 font-medium leading-tight">Nodes mapped in memory</div>
      </div>
    ),
  },

  // 6. AST Engine - Square 1:1
  {
    id: 'ast-engine',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-gradient-to-b from-sky-400/90 to-sky-600/95 backdrop-blur-xl border border-white/50 text-white rounded-[20px] shadow-[0_12px_30px_rgba(7,40,74,0.14)]">
        <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white font-bold text-sm shadow-sm">
          +
        </div>
        <div className="my-auto">
          <div className="text-[15px] font-bold text-white leading-snug">AST Engine</div>
          <div className="text-[10px] text-sky-100 mt-0.5 leading-tight">Deterministic WASM parser</div>
        </div>
        <span className="font-mono text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full w-fit">100% Local</span>
      </div>
    ),
  },

  // 7. Architecture Layer - Square 1:1
  {
    id: 'architecture',
    content: (
      <div className="w-full h-full p-4 flex flex-col justify-between select-none bg-[#0B1420]/95 backdrop-blur-xl border border-white/15 text-white rounded-[20px] shadow-[0_12px_30px_rgba(7,40,74,0.18)]">
        <div>
          <span className="font-mono text-[8px] uppercase font-bold text-emerald-400">Architecture</span>
          <div className="text-[12px] font-medium leading-snug text-slate-100 mt-1">
            Layered: <span className="text-[#D9F65A]">UI</span>, <span className="text-sky-300">Services</span>, & Data
          </div>
        </div>
        <div className="text-[9px] text-slate-400 mt-auto font-medium">Instant graph navigation</div>
      </div>
    ),
  },
];

// Duplicate items 3× for seamless infinite marquee
const ALL_CARDS = [...CARDS, ...CARDS, ...CARDS];
const CARD_SIZE = 175; // Perfect 1:1 Square (175px x 175px)
const CARD_GAP = 16;
const SINGLE_SET_W = CARDS.length * (CARD_SIZE + CARD_GAP);

export const HeroCards3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);

  const setCardRef = useCallback((el: HTMLDivElement | null, i: number) => {
    cardRefs.current[i] = el;
  }, []);

  // Continuous marquee animation
  useAnimationFrame((_, delta) => {
    if (isHovered) return;
    const cur = x.get();
    let next = cur - (42 * delta) / 1000;
    if (Math.abs(next) >= SINGLE_SET_W) next += SINGLE_SET_W;
    x.set(next);
  });

  // Direct DOM 3D arc transform calculation for butter-smooth 60fps performance
  useAnimationFrame(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const cCenter = cRect.left + cRect.width / 2;

    cardRefs.current.forEach((card) => {
      if (!card) return;
      const r = card.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;

      // Normalised -1.0 to 1.0 from center
      const raw = (cardCenter - cCenter) / (cRect.width / 2);
      const d = Math.max(-1.4, Math.min(1.4, raw));

      // 1. 3D Yaw rotation towards center
      const rotateY = -d * 22;

      // 2. Subtle 2D tilt following rainbow arch
      const rotateZ = d * 4.5;

      // 3. Subtle vertical arch (stays clean within hero container)
      const translateY = Math.pow(Math.abs(d), 1.5) * 16;

      // 4. Depth into screen at edges
      const translateZ = -Math.pow(Math.abs(d), 1.5) * 65;

      // 5. Scale (center 1.05x, edges 0.90x)
      const scale = Math.max(0.88, 1.05 - Math.abs(d) * 0.12);

      // 6. Opacity fade at far boundaries
      const opacity = Math.max(0.45, 1 - Math.pow(Math.abs(d) / 1.6, 3));

      card.style.transform = `perspective(1000px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      card.style.opacity = String(opacity);
    });
  });

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden py-1 relative select-none bg-transparent"
      style={{ perspective: '1200px', perspectiveOrigin: 'center 75%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        ref={trackRef}
        className="flex items-center bg-transparent"
        style={{ x, transformStyle: 'preserve-3d', width: 'max-content' }}
      >
        {ALL_CARDS.map((card, i) => (
          <div
            key={`${card.id}-${i}`}
            ref={(el) => setCardRef(el, i)}
            style={{
              width: `${CARD_SIZE}px`,
              height: `${CARD_SIZE}px`,
              marginRight: `${CARD_GAP}px`,
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
              transition: 'transform 0.08s ease-out, opacity 0.08s ease-out',
            }}
            className="shrink-0 bg-transparent flex flex-col justify-between cursor-pointer"
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'perspective(1000px) translateY(0px) translateZ(60px) rotateY(0deg) rotateZ(0deg) scale(1.1)';
              el.style.opacity = '1';
              el.style.zIndex = '20';
              el.style.boxShadow = '0 25px 50px -12px rgba(7,40,74,0.35)';
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
