import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white text-ink-soft py-8 border-t border-line">
      <div className="max-w-[1240px] mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-mono text-[11.5px] tracking-[0.1em] uppercase">
        <div className="text-ink font-semibold">Atlas — Codebase Architecture Visualizer</div>
        <div>MIT License · Wealthy People</div>
        <div>
          <a href="https://github.com/wealthypeople/scope" target="_blank" rel="noopener" className="text-ink hover:text-sky-brand transition-colors">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
