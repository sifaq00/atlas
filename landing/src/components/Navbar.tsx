import React, { useState, useRef } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';

const Navbar: React.FC = () => {
  const [state, setState] = useState<'hidden' | 'hero' | 'solid'>('hero');
  const lastScrollY = useRef(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const prev = lastScrollY.current;
    const diff = latest - prev;

    if (latest < 80) {
      setState('hero');
    } else if (diff > 5 && latest > 200) {
      setState('hidden');
    } else if (diff < -5 && latest > 200) {
      setState('solid');
    }

    lastScrollY.current = latest;
  });

  if (state === 'hero') return null;

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: state === 'hidden' ? -100 : 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-line shadow-[0_1px_12px_rgba(0,0,0,0.06)]"
    >
      <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 no-underline group">
          <img src="/icon.png" alt="Atlas" className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-110" />
          <img src="/atlasss.png" alt="Atlas" className="h-5 object-contain" />
        </a>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-[11px] tracking-[0.14em] uppercase font-medium">
          <a href="#features" className="text-ink-soft hover:text-ink transition-colors">Features</a>
          <a href="#how-it-works" className="text-ink-soft hover:text-ink transition-colors">How it works</a>
          <a href="#why-atlas" className="text-ink-soft hover:text-ink transition-colors">Why Atlas</a>
          <a href="https://github.com/sifaq00/atlas" target="_blank" rel="noopener" className="text-ink-soft hover:text-ink transition-colors">GitHub</a>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <a
            href="/atlas-map-0.1.1.vsix"
            download
            className="font-mono text-[10.5px] sm:text-[11px] font-semibold tracking-[0.08em] uppercase py-2 sm:py-2.5 px-5 sm:px-6 rounded-full bg-[#D9F65A] text-[#1E2405] hover:brightness-105 transition-all shadow-[0_2px_8px_rgba(217,246,90,0.25)]"
          >
            Install Free
          </a>

          <button className="md:hidden text-ink-soft hover:text-ink p-2 rounded-lg" aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
