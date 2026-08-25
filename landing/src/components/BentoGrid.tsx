import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const useCountUp = (target: number, inView: boolean, duration = 1400, prefix = '', suffix = '') => {
  const [value, setValue] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.round(target * eased);
      setValue(`${prefix}${current}${suffix}`);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration, prefix, suffix]);

  return value;
};

const BentoGrid: React.FC = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const mentalModel = useCountUp(5, inView, 1200, '~', ' min');
  const analysisSpeed = useCountUp(10, inView, 1000, '<', 's');
  const servers = useCountUp(0, inView, 800);

  return (
    <section className="py-16 sm:py-24 bg-white" id="why-atlas" ref={ref}>
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-semibold uppercase tracking-[0.1em] text-ink-soft mb-4 sm:mb-6">
            <motion.span
              className="w-1.5 h-1.5 bg-lime-brand rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            Why Atlas
            <motion.span
              className="w-1.5 h-1.5 bg-lime-brand rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl leading-[1.2] font-extrabold tracking-[-0.02em] text-ink">
            A map of any repo,<br />
            drawn right where you code
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.05fr_1fr_1fr] auto-rows-auto md:auto-rows-[minmax(220px,auto)] gap-4 sm:gap-6">
          {/* Cell 1 - Live Dependency Graph */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] p-6 sm:p-8 flex flex-col relative overflow-hidden bg-gradient-to-br from-sky-brand to-sky-light text-white md:col-span-2 lg:col-span-1 lg:row-span-2 group hover:shadow-[0_20px_60px_rgba(2,132,199,0.25)] transition-shadow duration-500"
          >
            {/* Animated glow pulse */}
            <motion.div
              className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <h3 className="text-xl sm:text-2xl lg:text-[30px] font-bold mb-2 sm:mb-3">Live dependency graph</h3>
              <p className="text-white/90 text-sm sm:text-[15px]">Visualizes your architecture as it evolves.</p>
            </div>
            <div className="my-6 sm:my-8 flex justify-center items-center flex-1 relative">
              <motion.img
                src="/images/robot-mascot.png"
                alt="Atlas robot mascot holding a globe"
                className="max-w-[180px] w-full h-auto object-contain"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div className="text-xs sm:text-[13px] opacity-75 leading-[1.5] mt-auto relative">
              Click any file to open it. Drag, zoom, explore. Updates every time you save.
            </div>
          </motion.div>

          {/* Cell 2 - Mental Model */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] p-6 sm:p-8 flex flex-col relative overflow-hidden bg-white border border-line group hover:border-sky-brand/30 hover:shadow-[0_12px_32px_rgba(2,132,199,0.08)] transition-all duration-400"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm sm:text-[15px] opacity-80 mb-2 font-semibold text-ink">Time to first mental model</p>
                <h3 className="text-3xl sm:text-[44px] font-extrabold font-mono mb-2 text-ink leading-none">{mentalModel}</h3>
                <p className="text-xs sm:text-sm leading-[1.5] text-ink-soft">instead of days of grep and guesswork on an unfamiliar repo.</p>
              </div>
              <motion.svg
                width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-sky-brand shrink-0 mt-1"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </motion.svg>
            </div>
          </motion.div>

          {/* Cell 3 - Analysis Speed */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.19, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] p-6 sm:p-8 flex flex-col relative overflow-hidden bg-lime-brand text-lime-ink group hover:shadow-[0_12px_32px_rgba(217,246,90,0.25)] transition-shadow duration-400"
          >
            {/* Sheen sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.4) 55%, transparent 60%)' }}
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
            />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-sm sm:text-[15px] font-semibold mb-2 text-lime-ink/90">Analysis speed</p>
                <h3 className="text-3xl sm:text-[44px] font-extrabold font-mono mb-2 text-lime-ink leading-none">{analysisSpeed}</h3>
                <p className="text-xs sm:text-sm leading-[1.5] text-lime-ink/90">for repos up to ~2,000 files — then cached, so every next open is instant.</p>
              </div>
              <motion.svg
                width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-lime-ink shrink-0 mt-1"
                animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </motion.svg>
            </div>
          </motion.div>

          {/* Cell 4 - Quote */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] p-6 sm:p-8 flex flex-col relative overflow-hidden bg-mist border border-line group hover:border-lime-brand/30 transition-colors duration-400"
          >
            <motion.div
              className="text-4xl sm:text-[56px] leading-none text-lime-brand font-serif -mb-1 sm:-mb-2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              "
            </motion.div>
            <p className="text-base sm:text-lg italic font-medium leading-[1.5] text-ink">
              Opened a repo I'd never seen, Atlas pointed me at three files, and I shipped my first fix the same afternoon.
            </p>
          </motion.div>

          {/* Cell 5 - Zero Server */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.33, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[22px] p-6 sm:p-8 flex flex-col relative overflow-hidden bg-ink text-white group"
          >
            {/* Scan line */}
            <motion.div
              className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-lime-brand/40 to-transparent pointer-events-none"
              animate={{ top: ['-5%', '105%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
            />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-sm sm:text-[15px] opacity-80 mb-2 font-semibold text-white">Servers touching your code</p>
                <h3 className="text-3xl sm:text-[44px] font-extrabold font-mono mb-2 text-white leading-none">{servers}</h3>
                <p className="text-xs sm:text-sm leading-[1.5] text-slate-300">Everything runs inside your editor. Nothing is uploaded, ever.</p>
              </div>
              <motion.svg
                width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white shrink-0 mt-1"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
              </motion.svg>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
