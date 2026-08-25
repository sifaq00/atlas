import React, { useRef, useCallback, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const FEATURES = [
  {
    title: 'The Map',
    desc: 'Every file as a node, every import as an edge, colored by architectural layer — UI, services, data, utils. The shape of the codebase, at a glance.',
    tag: 'Sidebar panel',
    color: '#0284c7',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M9 20L3 17V4L9 7M9 20L15 17M9 20V7M15 17L21 20V7L15 4M15 17V4M9 7L15 4" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Start Here',
    desc: 'Atlas ranks the four or five files that explain the whole project — entry points and the most-imported modules — so day one feels like day thirty.',
    tag: 'Ranked list',
    color: '#D9F65A',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    title: 'Blast Radius',
    desc: 'Change one file and instantly see every downstream file that imports it — directly or through three layers of re-exports.',
    tag: 'Impact preview',
    color: '#E0234E',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const TiltCard = ({ children, className = '', color = '#0284c7' }: { children: React.ReactNode; className?: string; color?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px) scale(1.02)`;
    el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = '';
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      className={`tilt-card transition-transform duration-300 ease-out ${className}`}
      style={{ '--accent': color } as React.CSSProperties}
    >
      {children}
      {/* Spotlight glow */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-[22px] pointer-events-none opacity-60 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), ${color}15, transparent 50%)`,
          }}
        />
      )}
    </div>
  );
};

const FloatingDot = ({ delay, x, y, size = 4, color = '#D9F65A' }: { delay: number; x: string; y: string; size?: number; color?: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ left: x, top: y, width: size, height: size, backgroundColor: color }}
    animate={{
      y: [0, -10, 0],
      opacity: [0.3, 0.7, 0.3],
    }}
    transition={{
      duration: 3 + delay,
      repeat: Infinity,
      ease: 'easeInOut',
      delay,
    }}
  />
);

const Features: React.FC = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-16 sm:py-24 relative" id="features" ref={ref}>
      {/* Floating decorative dots */}
      <FloatingDot delay={0} x="5%" y="20%" size={5} color="#0284c730" />
      <FloatingDot delay={0.8} x="92%" y="15%" size={4} color="#D9F65A40" />
      <FloatingDot delay={1.5} x="88%" y="70%" size={6} color="#0284c720" />
      <FloatingDot delay={0.3} x="8%" y="75%" size={3} color="#D9F65A30" />

      <div className="max-w-[1220px] mx-auto px-4 sm:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6"
        >
          <div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-mono text-[11px] sm:text-[11.5px] tracking-[0.14em] uppercase font-semibold text-ink-soft block mb-2"
            >
              Features
            </motion.span>
            <h2 className="text-2xl sm:text-4xl lg:text-[46px] leading-[1.12] tracking-[-0.03em] font-bold mt-2 sm:mt-3.5 text-ink">
              Three answers to<br /><span className="text-[#9AA7B4] font-semibold">"where do I even start?"</span>
            </h2>
          </div>
          <div className="relative flex flex-col items-center">
            <img
              src="/images/robot-mascot.png"
              alt=""
              className="w-[50px] sm:w-[60px] h-auto object-contain relative z-10"
              style={{ marginTop: '-24px' }}
            />
            <motion.a
              className="btn-lime relative z-20"
              href="/atlas-map-0.1.1.vsix"
              download
              whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(217, 246, 90, 0.4)' }}
              whileTap={{ scale: 0.97 }}
            >
              <span>Try it on your repo</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10 L10 2 M4 2 h6 v6" stroke="currentColor" strokeWidth="1.6"/></svg>
            </motion.a>
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
              <TiltCard color={f.color} className="rounded-[22px] border border-line p-6 sm:p-7 bg-white flex flex-col h-full group">
                <motion.div
                  className="w-10 h-10 sm:w-11 sm:h-11 bg-lime-brand rounded-xl flex items-center justify-center mb-4 sm:mb-5 shrink-0"
                  whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  {f.icon}
                </motion.div>
                <h3 className="text-lg sm:text-[21px] tracking-[-0.02em] font-bold text-ink group-hover:text-sky-brand transition-colors duration-300">{f.title}</h3>
                <p className="text-sm sm:text-[14.5px] leading-[1.6] text-ink-soft mt-2 flex-1">
                  {f.desc}
                </p>
                <div className="mt-5 sm:mt-6 flex items-center gap-2">
                  <span className="font-mono text-[10px] sm:text-[10.5px] tracking-[0.1em] uppercase bg-mist rounded-full py-1 sm:py-1.5 px-3 text-ink-soft">{f.tag}</span>
                  <span className="text-ink-soft text-xs">→</span>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
