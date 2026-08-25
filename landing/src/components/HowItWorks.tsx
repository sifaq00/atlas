import React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <section className="py-[100px] bg-ink text-white rounded-none lg:rounded-[34px] mx-0 lg:mx-3" id="how-it-works">
      <div className="max-w-[1220px] mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-lime-brand mb-6">
            <span className="w-1.5 h-1.5 bg-lime-brand rounded-full"></span>
            How it works
            <span className="w-1.5 h-1.5 bg-lime-brand rounded-full"></span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.02em] text-white">
            Clone. Open. See.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-ink-soft border border-white/10 rounded-2xl p-8 flex flex-col">
            <div className="font-mono text-[13px] font-bold text-lime-brand mb-4 tracking-[0.05em]">01 / INDEX</div>
            <h3 className="text-2xl font-bold mb-3 text-white">AST, not AI</h3>
            <p className="text-[15px] leading-[1.6] opacity-80 mb-6 flex-1 text-slate-200">
              Atlas parses your imports with an AST parser in WebAssembly. No LLM hallucinations, zero cost, deterministic accuracy.
            </p>
            <div className="bg-[#0A121C] border border-[#1D2B3A] rounded-[10px] p-3.5 font-mono text-xs text-[#B9E8FF] leading-[1.8]">
              $ atlas init
              <br/><span className="text-slate-500">Parsing syntax trees...</span>
              <br/><span className="text-lime-brand">✓ Indexed 1,240 files</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-ink-soft border border-white/10 rounded-2xl p-8 flex flex-col">
            <div className="font-mono text-[13px] font-bold text-lime-brand mb-4 tracking-[0.05em]">02 / GRAPH</div>
            <h3 className="text-2xl font-bold mb-3 text-white">Dependency graph</h3>
            <p className="text-[15px] leading-[1.6] opacity-80 mb-6 flex-1 text-slate-200">
              Every import statement becomes a directed edge. Dynamic imports, re-exports, barrel files, and path aliases are resolved automatically.
            </p>
            <div className="bg-[#0A121C] border border-[#1D2B3A] rounded-[10px] p-3.5 font-mono text-xs text-[#B9E8FF] leading-[1.8]">
              $ atlas map
              <br/><span className="text-slate-500">Resolving imports...</span>
              <br/><span className="text-lime-brand">✓ Graph built locally</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-ink-soft border border-white/10 rounded-2xl p-8 flex flex-col">
            <div className="font-mono text-[13px] font-bold text-lime-brand mb-4 tracking-[0.05em]">03 / PANEL</div>
            <h3 className="text-2xl font-bold mb-3 text-white">Live in your editor</h3>
            <p className="text-[15px] leading-[1.6] opacity-80 mb-6 flex-1 text-slate-200">
              A Webview panel rendered right next to your code. Click a node, open the file. Highlight a file, see its blast radius.
            </p>
            <div className="bg-[#0A121C] border border-[#1D2B3A] rounded-[10px] p-3.5 font-mono text-xs text-[#B9E8FF] leading-[1.8]">
              $ code .
              <br/><span className="text-slate-500">Opening VS Code...</span>
              <br/><span className="text-lime-brand">✓ Atlas panel ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
