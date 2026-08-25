import React, { useRef, useState, useCallback } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';

interface CardData {
  id: string;
  content: React.ReactNode;
}

const CARDS: CardData[] = [
  // 1. Health widget
  {
    id: 'health',
    content: (
      <div className="w-full h-full p-5 flex flex-col justify-between select-none bg-white rounded-[24px] border border-white/80 shadow-[0_20px_45px_rgba(7,40,74,0.18)]">
        <div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>Repository Health</span>
            <span className="text-emerald-500 font-bold">98/100</span>
          </div>
          <div className="text-xl font-extrabold tracking-tight text-slate-900 mt-1">
            98.4% <span className="text-xs font-normal text-slate-400">clean</span>
          </div>
        </div>

        <div className="space-y-2 my-auto">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>TypeScript AST</span>
              <span>100%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full w-full"></div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>Zero Circular Deps</span>
              <span>96%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#D9F65A] rounded-full w-[96%]"></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
          <span>0 Loops</span>
          <span className="text-sky-600 font-semibold">Zero-Copy</span>
        </div>
      </div>
    ),
  },

  // 2. Intelligence in Every Decision (Bar chart)
  {
    id: 'chart',
    content: (
      <div className="w-full h-full p-5 flex flex-col justify-between select-none bg-white rounded-[24px] border border-white/80 shadow-[0_20px_45px_rgba(7,40,74,0.18)]">
        <div>
          <div className="text-[14.5px] font-bold text-slate-900 leading-snug">
            Intelligence in<br />Every Decision
          </div>
        </div>

        <div className="h-24 flex items-end justify-between gap-2 px-1 my-auto">
          <div className="w-full bg-sky-100 rounded-t h-[25%]"></div>
          <div className="w-full bg-sky-200 rounded-t h-[40%]"></div>
          <div className="w-full bg-sky-300 rounded-t h-[55%]"></div>
          <div className="w-full bg-sky-400 rounded-t h-[70%]"></div>
          <div className="w-full bg-sky-500 rounded-t h-[88%]"></div>
          <div className="w-full bg-sky-600 rounded-t h-[100%]"></div>
        </div>

        <div className="text-[9px] text-slate-400 font-mono flex justify-between">
          <span>2021</span>
          <span>2022</span>
          <span>2023</span>
          <span>2024</span>
          <span>2025</span>
          <span>2026</span>
        </div>
      </div>
    ),
  },

  // 3. Floating Nature/Sky Live Map Widget
  {
    id: 'live-nodes',
    content: (
      <div className="w-full h-full p-5 flex flex-col justify-between select-none bg-gradient-to-b from-sky-400 to-emerald-400/90 text-white rounded-[24px] border border-white/40 shadow-[0_20px_45px_rgba(7,40,74,0.18)] relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/90">AST Scope</span>
          <span className="w-2 h-2 rounded-full bg-[#D9F65A] animate-pulse"></span>
        </div>

        <div className="space-y-2.5 my-auto relative z-10">
          <div className="bg-white/95 backdrop-blur-md rounded-full px-3.5 py-2 text-[11px] font-semibold text-slate-900 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span className="font-mono text-[10.5px]">App.tsx</span>
            </div>
            <span className="text-[8.5px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Entry</span>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-full px-3.5 py-2 text-[11px] font-semibold text-slate-900 flex items-center justify-between shadow-md ml-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9F65A] border border-black/20"></span>
              <span className="font-mono text-[10.5px]">router.ts</span>
            </div>
            <span className="text-[8.5px] font-mono bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">AST</span>
          </div>
        </div>

        <div className="text-[10px] text-white/90 font-medium relative z-10 flex justify-between">
          <span>Auto-sync</span>
          <span className="font-mono">0ms lag</span>
        </div>
      </div>
    ),
  },

  // 4. Center Highlight: Blast Radius & Impact (Dark top + sparkline + stats)
  {
    id: 'impact',
    content: (
      <div className="w-full h-full flex flex-col justify-between select-none bg-white rounded-[24px] border border-white/80 shadow-[0_20px_45px_rgba(7,40,74,0.18)] overflow-hidden">
        <div className="bg-[#0e1726] text-white p-3.5 flex items-center justify-between">
          <div>
            <div className="font-mono text-[8.5px] uppercase tracking-wider text-slate-400 font-medium">Blast Radius</div>
            <div className="text-[10px] text-slate-300 font-sans mt-0.5">Impact Analysis</div>
          </div>
          <svg width="28" height="16" viewBox="0 0 28 16" fill="none" className="text-emerald-400">
            <path d="M1 14L8 8L15 11L27 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="p-4 flex flex-col justify-between flex-1">
          <div>
            <div className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none">
              23 <span className="text-xs font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">+12%</span>
            </div>
            <div className="text-[10.5px] text-slate-500 mt-1 font-medium">Files downstream dependent</div>
          </div>

          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className="text-[8.5px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">auth/*</span>
            <span className="text-[8.5px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">session</span>
            <span className="text-[8.5px] font-mono bg-rose-100 text-rose-700 px-2 py-1 rounded-full font-bold">API</span>
          </div>
        </div>
      </div>
    ),
  },

  // 5. Data Points 520k+ (Tags + bold number)
  {
    id: 'datapoints',
    content: (
      <div className="w-full h-full p-5 flex flex-col justify-between select-none bg-white rounded-[24px] border border-white/80 shadow-[0_20px_45px_rgba(7,40,74,0.18)]">
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[8.5px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">Smarter</span>
          <span className="text-[8.5px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">GrowFaster</span>
          <span className="text-[8.5px] font-mono bg-[#D9F65A] text-[#1E2405] px-2.5 py-1 rounded-full font-bold">AST</span>
        </div>

        <div className="my-auto text-left">
          <div className="font-mono text-[9.5px] uppercase font-bold text-slate-400">Data Points</div>
          <div className="text-[38px] font-extrabold tracking-tight text-slate-900 leading-none mt-1">520k+</div>
        </div>

        <div className="text-[10px] text-slate-500 font-medium">Nodes & edges mapped in memory</div>
      </div>
    ),
  },

  // 6. Data Training / Blue Modern Widget
  {
    id: 'engine',
    content: (
      <div className="w-full h-full p-5 flex flex-col justify-between select-none bg-gradient-to-br from-sky-500 to-sky-700 text-white rounded-[24px] border border-white/30 shadow-[0_20px_45px_rgba(7,40,74,0.18)] relative overflow-hidden">
        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-lg shadow-sm">
          +
        </div>

        <div className="my-auto">
          <div className="text-[17px] font-extrabold text-white leading-tight">AST Engine</div>
          <div className="text-[11px] text-sky-100 mt-1 leading-snug">Deterministic OXC parser (zero LLM lag)</div>
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono text-white/80 border-t border-white/20 pt-2">
          <span>WebAssembly</span>
          <span className="bg-[#D9F65A] text-[#1E2405] font-bold px-2 py-0.5 rounded-full">100% Local</span>
        </div>
      </div>
    ),
  },

  // 7. Dark Sleek Card: Layered Architecture
  {
    id: 'architecture',
    content: (
      <div className="w-full h-full p-5 flex flex-col justify-between select-none bg-[#0B1420] text-white rounded-[24px] border border-white/10 shadow-[0_20px_45px_rgba(7,40,74,0.18)]">
        <div>
          <span className="font-mono text-[9px] uppercase font-bold text-[#D9F65A]">Architecture</span>
          <div className="text-[14px] font-bold leading-snug text-slate-100 mt-1.5">
            Layered: <span className="text-[#D9F65A]">UI</span>, <span className="text-sky-400">Services</span>, & Data
          </div>
        </div>

        <div className="space-y-2 my-auto">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#D9F65A] rounded-full w-[85%]"></div>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full w-[70%]"></div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-mono flex justify-between font-medium">
          <span>Visual Tree</span>
          <span className="text-emerald-400">Ready</span>
        </div>
      </div>
    ),
  },
];

// Duplicate items 3× for seamless infinite marquee
const ALL_CARDS = [...CARDS, ...CARDS, ...CARDS];
const CARD_W = 215;
const CARD_H = 255;
const CARD_GAP = 20;
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

  // Continuous marquee animation
  useAnimationFrame((_, delta) => {
    if (isHovered) return;
    const cur = x.get();
    let next = cur - (45 * delta) / 1000;
    if (Math.abs(next) >= SINGLE_SET_W) next += SINGLE_SET_W;
    x.set(next);
  });

  // Direct DOM 3D arc transform calculation for 60fps performance
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
      const rotateY = -d * 24;

      // 2. 2D Roll tilt following the rainbow arch
      const rotateZ = d * 7;

      // 3. Vertical arch / convex curve (center is highest, edges curve down)
      const translateY = Math.pow(Math.abs(d), 1.6) * 34;

      // 4. Depth (edges pushed back)
      const translateZ = -Math.pow(Math.abs(d), 1.6) * 90;

      // 5. Scale
      const scale = Math.max(0.88, 1.05 - Math.abs(d) * 0.12);

      // 6. Opacity
      const opacity = Math.max(0.5, 1 - Math.pow(Math.abs(d) / 1.6, 3));

      card.style.transform = `perspective(1000px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      card.style.opacity = String(opacity);
    });
  });

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden pt-2 pb-5 relative select-none bg-transparent"
      style={{ perspective: '1400px', perspectiveOrigin: 'center 80%' }}
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
              width: CARD_W,
              height: CARD_H,
              marginRight: CARD_GAP,
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
              transition: 'transform 0.08s ease-out, opacity 0.08s ease-out',
            }}
            className="shrink-0 bg-transparent flex flex-col justify-between cursor-pointer"
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'perspective(1000px) translateY(0px) translateZ(70px) rotateY(0deg) rotateZ(0deg) scale(1.12)';
              el.style.opacity = '1';
              el.style.zIndex = '20';
              el.style.boxShadow = '0 30px 60px -15px rgba(7,40,74,0.4)';
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
