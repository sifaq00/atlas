import React, { useRef, useCallback } from 'react';
import { motion, useAnimationFrame, useMotionValue } from 'framer-motion';

interface CardData {
  id: string;
  content: React.ReactNode;
}

const CARDS: CardData[] = [
  // 1. Start Here Ranking
  {
    id: 'start-here',
    content: (
      <div className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between select-none bg-white rounded-[18px] sm:rounded-[20px] border border-white/90">
        <div>
          <div className="font-mono text-[8px] sm:text-[8.5px] tracking-wider uppercase font-semibold text-slate-400">Start Here</div>
          <div className="text-[11.5px] sm:text-[12.5px] font-bold text-slate-900 leading-snug mt-0.5">Top Entry Points</div>
        </div>
        <div className="space-y-1.5 my-auto">
          {[
            { name: 'main.ts', score: '3.0', color: 'bg-lime-brand' },
            { name: 'App.tsx', score: '2.7', color: 'bg-sky-400' },
            { name: 'router.ts', score: '2.1', color: 'bg-sky-300' },
            { name: 'index.tsx', score: '1.8', color: 'bg-sky-200' },
          ].map((f, i) => (
            <div key={i} className="bg-white/95 backdrop-blur-md rounded-full px-2 py-1 text-[9.5px] sm:text-[10px] font-medium text-slate-800 flex items-center justify-between shadow-sm border border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${f.color}`}></span>
                <span className="font-mono text-[9px] sm:text-[9.5px]">{f.name}</span>
              </div>
              <span className="text-[7px] sm:text-[7.5px] font-mono font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{f.score}</span>
            </div>
          ))}
        </div>
        <div className="text-[8.5px] sm:text-[9px] text-slate-400 font-mono">Ranked by fan-in + entry weight</div>
      </div>
    ),
  },

  // 2. Dependency Graph
  {
    id: 'graph',
    content: (
      <div className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between select-none bg-white rounded-[18px] sm:rounded-[20px] border border-white/90">
        <div>
          <div className="font-mono text-[8px] sm:text-[8.5px] tracking-wider uppercase font-semibold text-slate-400">Dependency Graph</div>
          <div className="text-[11.5px] sm:text-[12.5px] font-bold text-slate-900 leading-snug mt-0.5">Architecture Map</div>
        </div>
        <div className="h-12 sm:h-14 flex items-end justify-between gap-1.5 my-auto px-1">
          <div className="w-full bg-purple-300 rounded-t h-[30%]"></div>
          <div className="w-full bg-purple-400 rounded-t h-[45%]"></div>
          <div className="w-full bg-sky-300 rounded-t h-[60%]"></div>
          <div className="w-full bg-sky-400 rounded-t h-[75%]"></div>
          <div className="w-full bg-amber-400 rounded-t h-[90%]"></div>
          <div className="w-full bg-emerald-400 rounded-t h-[100%]"></div>
          <div className="w-full bg-slate-300 rounded-t h-[80%]"></div>
        </div>
        <div className="text-[8px] sm:text-[8.5px] text-slate-400 font-mono flex justify-between font-medium">
          <span>UI</span>
          <span>Svc</span>
          <span>Data</span>
          <span>Util</span>
          <span>Config</span>
        </div>
      </div>
    ),
  },

  // 3. Live Map
  {
    id: 'live-map',
    content: (
      <div className="w-full h-full p-3 sm:p-3.5 flex flex-col justify-between select-none bg-white/55 backdrop-blur-xl rounded-[18px] sm:rounded-[20px] border border-white/70 text-slate-900">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] sm:text-[8.5px] font-semibold uppercase tracking-wider text-slate-700">Live Map</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <div className="space-y-1.5 my-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-full px-2 py-1 text-[9.5px] sm:text-[10px] font-medium text-slate-800 flex items-center justify-between shadow-sm border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span className="font-mono text-[9px] sm:text-[9.5px]">router.ts</span>
            </div>
            <span className="text-[7px] sm:text-[7.5px] font-mono font-semibold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">AST</span>
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-full px-2 py-1 text-[9.5px] sm:text-[10px] font-medium text-slate-800 flex items-center justify-between shadow-sm border border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-[9px] sm:text-[9.5px]">db/client.ts</span>
            </div>
            <span className="text-[7px] sm:text-[7.5px] font-mono font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Live</span>
          </div>
        </div>
        <div className="text-[8.5px] sm:text-[9px] text-slate-600 font-medium">Auto-synced on save</div>
      </div>
    ),
  },

  // 4. Blast Radius
  {
    id: 'blast-radius',
    content: (
      <div className="w-full h-full flex flex-col justify-between select-none bg-white rounded-[18px] sm:rounded-[20px] border border-white/90 overflow-hidden">
        <div className="bg-[#0f172a] text-white p-2 sm:p-2.5 flex items-center justify-between">
          <span className="font-mono text-[7.5px] sm:text-[8px] uppercase tracking-wider text-slate-400 font-medium">Blast Radius</span>
          <span className="text-rose-400 font-mono text-[7px] sm:text-[7.5px] bg-rose-950/80 px-1.5 py-0.5 rounded font-bold border border-rose-800/40">Impact</span>
        </div>
        <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 bg-white">
          <div>
            <div className="text-[21px] sm:text-[24px] font-extrabold tracking-tight text-slate-900 leading-none">
              23 files
            </div>
            <div className="text-[8.5px] sm:text-[9.5px] text-slate-500 mt-0.5 font-medium">downstream dependent</div>
          </div>
          <div className="flex gap-1 flex-wrap mt-1">
            <span className="font-mono text-[7px] sm:text-[7.5px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-medium border border-rose-200">L1 direct</span>
            <span className="font-mono text-[7px] sm:text-[7.5px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">L2+ cascade</span>
          </div>
        </div>
      </div>
    ),
  },

  // 5. Circular Dependency Detection
  {
    id: 'circular',
    content: (
      <div className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between select-none bg-white rounded-[18px] sm:rounded-[20px] border border-white/90">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[8px] sm:text-[8.5px] tracking-wider uppercase font-semibold text-slate-400">Circular Deps</div>
            <div className="text-[11.5px] sm:text-[12.5px] font-bold text-slate-900 leading-snug mt-0.5">Tarjan SCC</div>
          </div>
          <span className="text-rose-500 font-mono text-[7px] sm:text-[7.5px] bg-rose-50 px-1.5 py-0.5 rounded font-bold border border-rose-200">2 found</span>
        </div>
        <div className="space-y-1 my-auto mt-2">
          <div className="bg-white/95 backdrop-blur-md rounded-full px-2 py-1 text-[9px] sm:text-[9.5px] font-medium text-slate-700 flex items-center gap-1.5 shadow-sm border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span className="font-mono">auth → user → auth</span>
          </div>
          <div className="bg-white/95 backdrop-blur-md rounded-full px-2 py-1 text-[9px] sm:text-[9.5px] font-medium text-slate-700 flex items-center gap-1.5 shadow-sm border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className="font-mono">db → model → db</span>
          </div>
        </div>
        <div className="text-[8.5px] sm:text-[9px] text-slate-400 font-mono">SCC cycle detection</div>
      </div>
    ),
  },

  // 6. AST Engine
  {
    id: 'ast-engine',
    content: (
      <div className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between select-none bg-gradient-to-b from-sky-400/90 to-sky-600/95 backdrop-blur-xl border border-white/50 text-white rounded-[18px] sm:rounded-[20px]">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm">
          +
        </div>
        <div className="my-auto">
          <div className="text-[13.5px] sm:text-[15px] font-bold text-white leading-snug">AST Engine</div>
          <div className="text-[9.5px] sm:text-[10px] text-sky-100 mt-0.5 leading-tight">Rust OXC Parser</div>
        </div>
        <span className="font-mono text-[7.5px] sm:text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full w-fit">100% Local</span>
      </div>
    ),
  },

  // 7. Architecture Layer
  {
    id: 'architecture',
    content: (
      <div className="w-full h-full p-3.5 sm:p-4 flex flex-col justify-between select-none bg-[#0B1420]/95 backdrop-blur-xl border border-white/15 text-white rounded-[18px] sm:rounded-[20px]">
        <div>
          <span className="font-mono text-[7.5px] sm:text-[8px] uppercase font-bold text-emerald-400">Architecture</span>
          <div className="text-[11px] sm:text-[12px] font-medium leading-snug text-slate-100 mt-1">
            Layered: <span className="text-purple-400">UI</span>, <span className="text-sky-300">Services</span>, <span className="text-amber-300">Data</span>
          </div>
        </div>
        <div className="text-[8.5px] sm:text-[9px] text-slate-400 mt-auto font-medium">Auto-classified by imports</div>
      </div>
    ),
  },
];

// Duplicate items 3× for seamless infinite marquee
const ALL_CARDS = [...CARDS, ...CARDS, ...CARDS];
const CARD_SIZE = 172; // Responsive baseline 1:1 square
const CARD_GAP = 16;
const SINGLE_SET_W = CARDS.length * (CARD_SIZE + CARD_GAP);

export const HeroCards3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const x = useMotionValue(0);

  const setCardRef = useCallback((el: HTMLDivElement | null, i: number) => {
    cardRefs.current[i] = el;
  }, []);

  // Continuous marquee animation — never stops, moves right to left
  useAnimationFrame((_, delta) => {
    const cur = x.get();
    let next = cur - (40 * delta) / 1000;
    if (next <= -SINGLE_SET_W) next += SINGLE_SET_W;
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

      const raw = (cardCenter - cCenter) / (cRect.width / 2);
      const d = Math.max(-1.4, Math.min(1.4, raw));

      const rotateY = -d * 22;
      const rotateZ = d * 4.5;
      const translateY = Math.pow(Math.abs(d), 1.5) * 14;
      const translateZ = -Math.pow(Math.abs(d), 1.5) * 60;
      const scale = Math.max(0.88, 1.04 - Math.abs(d) * 0.12);
      const opacity = Math.max(0.45, 1 - Math.pow(Math.abs(d) / 1.6, 3));

      card.style.transform = `perspective(1000px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      card.style.opacity = String(opacity);
    });
  });

  return (
    <div
      ref={containerRef}
      className="max-w-[1140px] w-full mx-auto overflow-hidden pt-6 pb-2 relative select-none bg-transparent"
      style={{
        perspective: '1200px',
        perspectiveOrigin: 'center 75%',
        maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
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
            }}
            className="shrink-0 bg-transparent flex flex-col justify-between"
          >
            {card.content}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default HeroCards3D;
