import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const FEATURES = [
  {
    title: 'Interactive architecture graph',
    desc: 'Every file as a node, every import as an edge. D3-force physics layout, double-click to open, focus mode to isolate 1-hop neighborhoods. Two views: Focus and Full Map with folder grouping.',
    tag: 'd3-force · Focus Mode',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="19" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7.5 7.5L10.5 16M16.5 7.5L13.5 16M8 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Start Here ranking',
    desc: 'Scores the top 5 onboarding entry points using fan-in count, entry point detection, and file weight. No more grepping for "main" — the answer is already ranked.',
    tag: 'Scored by fan-in + weight',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Blast radius analyzer',
    desc: 'Click any file, see every downstream consumer. Reverse BFS traces L1 direct and L2+ cascade dependencies. Risk scoring from Low to Critical. Keyboard shortcut: Ctrl+Shift+I.',
    tag: 'BFS · Risk scoring',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12 2v7M12 15v7M2 12h7M15 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

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
            >
              <div className="rounded-[22px] border border-line p-6 sm:p-7 bg-white flex flex-col h-full hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(9,40,72,0.08)] transition-all duration-300">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mb-4 sm:mb-5 shrink-0 text-ink">
                  {f.icon}
                </div>
                <h3 className="text-lg sm:text-[21px] tracking-[-0.02em] font-bold text-ink">{f.title}</h3>
                <p className="text-sm sm:text-[14.5px] leading-[1.6] text-ink-soft mt-2 flex-1">
                  {f.desc}
                </p>
                <span className="mt-5 sm:mt-6 inline-block font-mono text-[10px] sm:text-[10.5px] tracking-[0.1em] text-slate-400">{f.tag}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
