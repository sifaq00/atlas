import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface CTAProps {
  onOpenApp?: () => void;
}

const CTA: React.FC<CTAProps> = ({ onOpenApp }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const textY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.97]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6]);

  return (
    <div className="w-full p-2 sm:p-2.5 bg-white" ref={ref}>
      <motion.section
        style={{ scale, opacity }}
        className="py-16 sm:py-24 md:py-28 relative text-center text-white bg-sky-brand bg-[url('/sky-clouds.webp')] bg-bottom bg-cover bg-no-repeat rounded-[20px] sm:rounded-[24px] md:rounded-[28px] overflow-hidden"
        id="cta"
      >
        {/* Parallax background layer */}
        <motion.div
          style={{ y: bgY }}
          className="absolute inset-0 bg-[url('/sky-clouds.webp')] bg-bottom bg-cover bg-no-repeat -z-10 scale-110"
        />

        <motion.div
          style={{ y: textY }}
          className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10"
        >
          <span className="font-mono text-[11px] sm:text-[11.5px] tracking-[0.14em] uppercase font-bold text-white/90 block mb-2 sm:mb-3">
            Free forever · open source
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] leading-[1.1] tracking-[-0.03em] font-extrabold mt-3 sm:mt-4 text-white drop-shadow-sm">
            Stop guessing.<br />Start seeing.
          </h2>
          <p className="max-w-md mx-auto mt-3 sm:mt-4 text-white/95 text-sm sm:text-base md:text-lg leading-relaxed font-normal px-2">
            One click and the next codebase you open comes with a complete, interactive map.
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 mt-6 sm:mt-8 flex-wrap">
            <motion.button
              onClick={onOpenApp}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className="group font-mono text-[11px] sm:text-xs font-bold tracking-wider uppercase py-2 pl-5 sm:pl-6 pr-2 rounded-full bg-[#D9F65A] text-[#1E2405] inline-flex items-center gap-2.5 sm:gap-3 shadow-[0_12px_28px_rgba(30,36,5,0.22)] transition-shadow"
            >
              <span>Explore Atlas</span>
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1E2405] text-[#D9F65A] flex items-center justify-center transition-transform group-hover:rotate-45">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </motion.button>
            <motion.a
              href="/atlas-map-0.1.1.vsix"
              download
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="font-mono text-[11px] sm:text-xs font-semibold tracking-wider uppercase py-3 sm:py-3.5 px-6 sm:px-7 rounded-full bg-slate-950/40 hover:bg-slate-950/60 text-white border border-white/30 backdrop-blur-md transition-colors"
            >
              Download Extension (.vsix)
            </motion.a>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
};

export default CTA;
