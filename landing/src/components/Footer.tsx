import React from 'react';
import { motion, useInView } from 'framer-motion';

interface FooterProps {
  onOpenApp?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenApp }) => {
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <footer className="bg-[#0B1420] text-white pt-16 sm:pt-20 pb-8" ref={ref}>
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        {/* Top section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row justify-between gap-10 md:gap-8"
        >
          {/* Logo + tagline */}
          <div className="max-w-xs">
            <a href="#" className="flex items-center gap-2.5 no-underline group mb-4 text-white">
              <img src="/icon.webp" alt="Atlas" className="w-8 h-8 object-contain" />
              <img src="/atlasss.webp" alt="Atlas" className="h-6 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            </a>
            <p className="text-sm text-slate-400 leading-relaxed">
              Codebase architecture visualizer for VS Code & Web. Understand any repo in minutes, not days.
            </p>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12">
            <div>
              <h4 className="font-mono text-[10px] sm:text-[11px] tracking-[0.14em] uppercase font-semibold text-white mb-3 sm:mb-4">Product</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                <li><button onClick={onOpenApp} className="text-sm text-[#D9F65A] hover:underline transition-colors font-medium">Launch Web App</button></li>
                <li><a href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">How it works</a></li>
                <li><a href="#why-atlas" className="text-sm text-slate-400 hover:text-white transition-colors">Why Atlas</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[10px] sm:text-[11px] tracking-[0.14em] uppercase font-semibold text-white mb-3 sm:mb-4">Resources</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                <li><a href="https://github.com/sifaq00/atlas" target="_blank" rel="noopener" className="text-sm text-slate-400 hover:text-white transition-colors">GitHub</a></li>
                <li><a href="/atlas-map-0.1.1.vsix" download className="text-sm text-slate-400 hover:text-white transition-colors">Download</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[10px] sm:text-[11px] tracking-[0.14em] uppercase font-semibold text-white mb-3 sm:mb-4">Install</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                <li><a href="/atlas-map-0.1.1.vsix" download className="text-sm text-slate-400 hover:text-white transition-colors">VS Code Extension</a></li>
                <li><button onClick={onOpenApp} className="text-sm text-slate-400 hover:text-white transition-colors">Web Visualizer</button></li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="border-t border-white/10 mt-10 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500 font-mono tracking-wider">
            © {new Date().getFullYear()} Atlas. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a href="https://github.com/sifaq00/atlas" target="_blank" rel="noopener" className="text-slate-500 hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
