import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const FEATURES = [
  {
    title: 'Interactive architecture graph',
    desc: 'D3-force physics layout. Double-click opens the file, focus mode isolates 1-hop neighborhoods. Folder grouping, two views — Focus and Full Map.',
    tag: 'd3-force · Focus Mode',
  },
  {
    title: 'Start Here ranking',
    desc: 'Top 5 onboarding entry points scored by fan-in count, entry detection, and file weight. No grepping for "main" — it is already ranked.',
    tag: 'Scored by fan-in + weight',
  },
  {
    title: 'Blast radius analyzer',
    desc: 'Reverse BFS traces L1 direct and L2+ cascade. Risk scoring from Low to Critical. Keyboard shortcut Ctrl+Shift+I.',
    tag: 'BFS · Risk scoring',
  },
];

const GraphDemo = ({ inView }: { inView: boolean }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => setKey(k => k + 1), 3500);
    return () => clearInterval(interval);
  }, [inView]);

  const nodes = [
    { x: 90, y: 40, r: 7, color: '#6366f1' },
    { x: 50, y: 22, r: 5, color: '#a78bfa' },
    { x: 130, y: 22, r: 5, color: '#38bdf8' },
    { x: 45, y: 60, r: 5, color: '#34d399' },
    { x: 135, y: 60, r: 5, color: '#fbbf24' },
    { x: 90, y: 14, r: 4, color: '#38bdf8' },
    { x: 90, y: 68, r: 4, color: '#34d399' },
  ];
  const edges = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,5],[2,4],[3,6],[5,2]];

  const highlightIdx = (key % nodes.length);

  return (
    <svg viewBox="0 0 180 82" className="w-full h-auto" key={key}>
      {edges.map(([a, b], i) => {
        const isActive = a === highlightIdx || b === highlightIdx;
        return (
          <motion.line
            key={`e-${key}-${i}`}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke={isActive ? '#6366f1' : '#e2e8f0'}
            strokeWidth={isActive ? 1.5 : 0.8}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
          />
        );
      })}
      {nodes.map((n, i) => (
        <motion.g key={`n-${key}-${i}`}>
          {i === highlightIdx && (
            <motion.circle
              cx={n.x} cy={n.y} r={n.r + 4}
              fill="none"
              stroke={n.color}
              strokeWidth="1.5"
              initial={{ r: n.r, opacity: 0.8 }}
              animate={{ r: n.r + 12, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <motion.circle
            cx={n.x} cy={n.y} r={n.r}
            fill={n.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.04, type: 'spring', stiffness: 300 }}
          />
        </motion.g>
      ))}
    </svg>
  );
};

const RankDemo = ({ inView }: { inView: boolean }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => setKey(k => k + 1), 3000);
    return () => clearInterval(interval);
  }, [inView]);

  const files = [
    { name: 'main.ts', bar: 100, color: '#D9F65A' },
    { name: 'App.tsx', bar: 78, color: '#38bdf8' },
    { name: 'router.ts', bar: 62, color: '#38bdf8' },
    { name: 'index.tsx', bar: 45, color: '#94a3b8' },
    { name: 'db.ts', bar: 31, color: '#94a3b8' },
  ];

  const highlighted = key % files.length;

  return (
    <div className="w-full space-y-2" key={key}>
      {files.map((f, i) => (
        <div key={`${f.name}-${key}`} className="flex items-center gap-2">
          <span className={`font-mono text-[9px] w-12 text-right shrink-0 transition-colors duration-300 ${i === highlighted ? 'text-slate-700 font-bold' : 'text-slate-400'}`}>{f.name}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: i === highlighted ? '#D9F65A' : f.color }}
              initial={{ width: 0 }}
              animate={{ width: `${f.bar}%` }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const BlastDemo = ({ inView }: { inView: boolean }) => {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => setCycle(c => c + 1), 2500);
    return () => clearInterval(interval);
  }, [inView]);

  const downstream = [
    { x: 25, y: 18, delay: 0.3 },
    { x: 60, y: 12, delay: 0.5 },
    { x: 18, y: 52, delay: 0.7 },
    { x: 65, y: 48, delay: 0.9 },
    { x: 40, y: 62, delay: 1.1 },
    { x: 75, y: 30, delay: 0.6 },
    { x: 10, y: 35, delay: 0.8 },
  ];

  return (
    <div className="relative w-full h-[85px] flex items-center justify-center" key={cycle}>
      {/* Ripple rings */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={`${cycle}-${i}`}
          className="absolute rounded-full border border-rose-200"
          initial={{ width: 16, height: 16, opacity: 0.5 }}
          animate={{ width: 110, height: 110, opacity: 0 }}
          transition={{ duration: 2, delay: i * 0.5, ease: 'easeOut' }}
        />
      ))}
      {/* Central node */}
      <motion.div
        className="w-4 h-4 rounded-full bg-rose-500 relative z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, type: 'spring' }}
      />
      {/* Downstream nodes appear staggered */}
      {downstream.map((n, i) => (
        <motion.div
          key={`d-${cycle}-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            width: 8,
            height: 8,
            backgroundColor: i < 4 ? '#fb923c' : '#94a3b8',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, delay: n.delay, type: 'spring', stiffness: 400 }}
        />
      ))}
      {/* Lines from center to downstream */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {downstream.map((n, i) => {
          const cx = 50;
          const cy = 50;
          const nx = n.x;
          const ny = n.y + 8;
          return (
            <motion.line
              key={`l-${cycle}-${i}`}
              x1={`${cx}%`} y1={`${cy}%`}
              x2={`${nx}%`} y2={`${ny}%`}
              stroke={i < 4 ? '#fed7aa' : '#e2e8f0'}
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.4, delay: n.delay - 0.1 }}
            />
          );
        })}
      </svg>
    </div>
  );
};

interface FeaturesProps {
  onOpenApp?: () => void;
}

const Features: React.FC<FeaturesProps> = ({ onOpenApp }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-16 sm:py-24" id="features" ref={ref}>
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6"
        >
          <div>
            <span className="font-mono text-[11px] sm:text-[11.5px] tracking-[0.14em] uppercase font-semibold text-ink-soft block mb-2">Features</span>
            <h2 className="text-2xl sm:text-4xl lg:text-[46px] leading-[1.12] tracking-[-0.03em] font-bold mt-2 sm:mt-3.5 text-ink">
              Three answers to<br /><span className="text-[#9AA7B4] font-semibold">"where do I even start?"</span>
            </h2>
          </div>
          <div className="relative flex flex-col items-center">
            <img
              src="/images/robot-mascot.webp"
              alt=""
              className="w-[50px] sm:w-[60px] h-auto object-contain relative z-10"
              style={{ marginTop: '-24px' }}
            />
            <motion.button
              className="btn-lime relative z-20"
              onClick={onOpenApp}
              whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(217, 246, 90, 0.4)' }}
              whileTap={{ scale: 0.97 }}
            >
              <span>Scan your repo</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10 L10 2 M4 2 h6 v6" stroke="currentColor" strokeWidth="1.6"/></svg>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-[18px] mt-8 sm:mt-[46px]">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[22px] border border-line bg-white overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(9,40,72,0.08)] transition-all duration-300 group"
            >
              {/* Mini demo area */}
              <div className="h-[110px] sm:h-[120px] bg-gradient-to-b from-slate-50 to-white border-b border-line/50 flex items-center justify-center p-4 overflow-visible">
                {i === 0 && <GraphDemo inView={inView} />}
                {i === 1 && <RankDemo inView={inView} />}
                {i === 2 && <BlastDemo inView={inView} />}
              </div>

              {/* Text content */}
              <div className="p-5 sm:p-6 flex flex-col flex-1">
                <h3 className="text-lg sm:text-[21px] tracking-[-0.02em] font-bold text-ink">{f.title}</h3>
                <p className="text-sm sm:text-[14.5px] leading-[1.6] text-ink-soft mt-2 flex-1">
                  {f.desc}
                </p>
                <span className="mt-4 sm:mt-5 inline-block font-mono text-[10px] sm:text-[10.5px] tracking-[0.1em] text-slate-400">{f.tag}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
