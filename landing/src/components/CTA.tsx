import React from 'react';

const CTA: React.FC = () => {
  return (
    <div className="w-full p-2 sm:p-2.5 bg-white">
      <section className="py-20 md:py-28 relative text-center text-white bg-sky-brand bg-[url('/sky-clouds.png')] bg-bottom bg-cover bg-no-repeat rounded-[20px] sm:rounded-[24px] md:rounded-[28px] overflow-hidden" id="cta">
        <div className="max-w-[1240px] mx-auto px-6 relative z-10">
          <span className="font-mono text-[11.5px] tracking-[0.14em] uppercase font-bold text-white/90 block mb-3">Free forever · open source</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[56px] leading-[1.08] tracking-[-0.03em] font-extrabold mt-4 text-white drop-shadow-sm">
            Stop guessing.<br />Start seeing.
          </h2>
          <p className="max-w-md mx-auto mt-4 text-white/95 text-base sm:text-lg leading-relaxed font-normal">
            One click and the next codebase you open comes with a complete, interactive map.
          </p>
          <div className="flex items-center justify-center gap-3.5 mt-8 flex-wrap">
            <a 
              href="#" 
              className="group font-mono text-xs font-bold tracking-wider uppercase py-2 pl-6 pr-2 rounded-full bg-[#D9F65A] text-[#1E2405] inline-flex items-center gap-3 shadow-[0_12px_28px_rgba(30,36,5,0.22)] hover:scale-105 transition-all"
            >
              <span>Install for VS Code</span>
              <span className="w-8 h-8 rounded-full bg-[#1E2405] text-[#D9F65A] flex items-center justify-center transition-transform group-hover:rotate-45">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </a>
            <a 
              href="https://github.com/wealthypeople/scope" 
              target="_blank" 
              rel="noopener" 
              className="font-mono text-xs font-semibold tracking-wider uppercase py-3.5 px-7 rounded-full bg-slate-950/40 hover:bg-slate-950/60 text-white border border-white/30 backdrop-blur-md transition-all hover:-translate-y-0.5"
            >
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CTA;
