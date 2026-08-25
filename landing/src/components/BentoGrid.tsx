import React from 'react';

const BentoGrid: React.FC = () => {
  return (
    <section className="py-[100px] bg-white" id="why-atlas">
      <div className="max-w-[1220px] mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-ink-soft mb-6">
            <span className="w-1.5 h-1.5 bg-lime-brand rounded-full"></span>
            Why Atlas
            <span className="w-1.5 h-1.5 bg-lime-brand rounded-full"></span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl leading-[1.2] font-extrabold tracking-[-0.02em] text-ink">
            A map of any repo,
            <br />
            drawn right where you code
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.05fr_1fr_1fr] auto-rows-[minmax(240px,auto)] gap-6">
          {/* Cell 1 - Live Dependency Graph */}
          <div className="rounded-[22px] p-8 flex flex-col relative overflow-hidden bg-gradient-to-br from-sky-brand to-sky-light text-white md:col-span-2 lg:col-span-1 lg:row-span-2">
            <div>
              <h3 className="text-2xl sm:text-[32px] font-bold mb-3">Live dependency graph</h3>
              <p className="text-white/90 text-[15px]">Visualizes your architecture as it evolves.</p>
            </div>
            <div className="my-8 flex justify-center items-center flex-1">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="40" fill="white" opacity="0.2" />
                <circle cx="100" cy="100" r="20" fill="white" />
                <circle cx="40" cy="50" r="15" fill="white" />
                <circle cx="160" cy="60" r="15" fill="white" />
                <circle cx="50" cy="150" r="15" fill="white" />
                <circle cx="150" cy="160" r="15" fill="white" />
                <path d="M40 50 L100 100 L160 60" stroke="white" strokeWidth="2" opacity="0.5" fill="none" />
                <path d="M50 150 L100 100 L150 160" stroke="white" strokeWidth="2" opacity="0.5" fill="none" />
              </svg>
            </div>
            <div className="text-[13px] opacity-75 leading-[1.5] mt-auto">
              Click any file to open it. Drag, zoom, explore. Updates every time you save.
            </div>
          </div>

          {/* Cell 2 - Mental Model */}
          <div className="rounded-[22px] p-8 flex flex-col relative overflow-hidden bg-white border border-line">
            <p className="text-[15px] opacity-80 mb-3 font-semibold text-ink">Time to first mental model</p>
            <h3 className="text-[44px] font-extrabold font-mono mb-3 text-ink leading-none">~5 min</h3>
            <p className="text-sm leading-[1.5] text-ink-soft">instead of days of grep and guesswork on an unfamiliar repo.</p>
          </div>
          
          {/* Cell 3 - Analysis Speed */}
          <div className="rounded-[22px] p-8 flex flex-col relative overflow-hidden bg-lime-brand text-lime-ink">
            <p className="text-[15px] font-semibold mb-3 text-lime-ink/90">Analysis speed</p>
            <h3 className="text-[44px] font-extrabold font-mono mb-3 text-lime-ink leading-none">&lt;10s</h3>
            <p className="text-sm leading-[1.5] text-lime-ink/90">for repos up to ~2,000 files — then cached, so every next open is instant.</p>
          </div>

          {/* Cell 4 - Quote */}
          <div className="rounded-[22px] p-8 flex flex-col relative overflow-hidden bg-mist border border-line">
            <div className="text-[56px] leading-none text-lime-brand font-serif -mb-2">"</div>
            <p className="text-lg italic font-medium leading-[1.5] text-ink">
              Opened a repo I'd never seen, Atlas pointed me at three files, and I shipped my first fix the same afternoon.
            </p>
          </div>
          
          {/* Cell 5 - Zero Server */}
          <div className="rounded-[22px] p-8 flex flex-col relative overflow-hidden bg-ink text-white">
            <p className="text-[15px] opacity-80 mb-3 font-semibold text-white">Servers touching your code</p>
            <h3 className="text-[44px] font-extrabold font-mono mb-3 text-white leading-none">0</h3>
            <p className="text-sm leading-[1.5] text-slate-300">Everything runs inside your editor. Nothing is uploaded, ever.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BentoGrid;
