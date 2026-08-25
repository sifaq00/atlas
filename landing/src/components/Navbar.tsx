import React, { useState, useRef } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';

interface NavbarProps {
  onOpenApp?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenApp }) => {
  const [state, setState] = useState<'hidden' | 'hero' | 'solid'>('hero');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const prev = lastScrollY.current;
    const diff = latest - prev;

    if (latest < 80) {
      setState('hero');
      setMobileMenuOpen(false);
    } else if (diff > 5 && latest > 200) {
      setState('hidden');
      setMobileMenuOpen(false);
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
          <img src="/icon.webp" alt="Atlas" className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-110" />
          <img src="/atlasss.webp" alt="Atlas" className="h-5 object-contain" />
        </a>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-[11px] tracking-[0.14em] uppercase font-medium">
          <a href="#features" className="text-ink-soft hover:text-ink transition-colors">Features</a>
          <a href="#how-it-works" className="text-ink-soft hover:text-ink transition-colors">How it works</a>
          <a href="#why-atlas" className="text-ink-soft hover:text-ink transition-colors">Why Atlas</a>
          <a href="https://github.com/sifaq00/atlas" target="_blank" rel="noopener" className="text-ink-soft hover:text-ink transition-colors">GitHub</a>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenApp}
            className="font-mono text-[10.5px] sm:text-[11px] font-semibold tracking-[0.08em] uppercase py-2 sm:py-2.5 px-4 sm:px-5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            Explore Atlas
          </button>
          <a
            href="/atlas-map-0.1.1.vsix"
            download
            className="hidden sm:inline-flex font-mono text-[10.5px] sm:text-[11px] font-semibold tracking-[0.08em] uppercase py-2 sm:py-2.5 px-4 sm:px-5 rounded-full bg-[#D9F65A] text-[#1E2405] hover:brightness-105 transition-all shadow-[0_2px_8px_rgba(217,246,90,0.25)]"
          >
            VS Code Extension
          </a>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-ink-soft hover:text-ink p-2 rounded-lg cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-6 py-4 bg-white border-t border-line flex flex-col gap-3 font-mono text-xs uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-150">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-ink-soft hover:text-ink py-1">Features</a>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-ink-soft hover:text-ink py-1">How it works</a>
          <a href="#why-atlas" onClick={() => setMobileMenuOpen(false)} className="text-ink-soft hover:text-ink py-1">Why Atlas</a>
          <a href="https://github.com/sifaq00/atlas" target="_blank" rel="noopener" className="text-ink-soft hover:text-ink py-1">GitHub</a>
          <div className="pt-2 border-t border-line flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenApp?.();
              }}
              className="w-full py-2.5 px-4 rounded-full bg-slate-900 text-white text-center font-bold"
            >
              Explore Atlas →
            </button>
            <a
              href="/atlas-map-0.1.1.vsix"
              download
              className="w-full py-2.5 px-4 rounded-full bg-[#D9F65A] text-[#1E2405] text-center font-bold"
            >
              Download VS Code Extension
            </a>
          </div>
        </div>
      )}
    </motion.header>
  );
};

export default Navbar;
