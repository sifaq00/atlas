import React from 'react';

const Features: React.FC = () => {
  return (
    <section className="py-16 sm:py-24" id="features">
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div>
            <span className="font-mono text-[11px] sm:text-[11.5px] tracking-[0.14em] uppercase font-semibold text-ink-soft block mb-2">Features</span>
            <h2 className="text-2xl sm:text-4xl lg:text-[46px] leading-[1.12] tracking-[-0.03em] font-bold mt-2 sm:mt-3.5 text-ink">
              Three answers to<br /><span className="text-[#9AA7B4] font-semibold">"where do I even start?"</span>
            </h2>
          </div>
          <a className="btn-lime" href="#">
            <span>Try it on your repo</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10 L10 2 M4 2 h6 v6" stroke="currentColor" strokeWidth="1.6"/></svg>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-[18px] mt-8 sm:mt-[46px]">
          {/* Feature 1 */}
          <div className="rounded-[22px] border border-line p-6 sm:p-7 bg-white transition-all duration-200 ease-in-out flex flex-col hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(9,40,72,0.10)]">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-lime-brand rounded-xl flex items-center justify-center mb-4 sm:mb-5 shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 20L3 17V4L9 7M9 20L15 17M9 20V7M15 17L21 20V7L15 4M15 17V4M9 7L15 4" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg sm:text-[21px] tracking-[-0.02em] font-bold text-ink">The Map</h3>
            <p className="text-sm sm:text-[14.5px] leading-[1.6] text-ink-soft mt-2 flex-1">
              Every file as a node, every import as an edge, colored by architectural layer — UI, services, data, utils. The shape of the codebase, at a glance.
            </p>
            <span className="mt-5 sm:mt-6 inline-block font-mono text-[10px] sm:text-[10.5px] tracking-[0.1em] uppercase bg-mist rounded-full py-1 sm:py-1.5 px-3 text-ink-soft w-fit">Sidebar panel</span>
          </div>

          {/* Feature 2 */}
          <div className="rounded-[22px] border border-line p-6 sm:p-7 bg-white transition-all duration-200 ease-in-out flex flex-col hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(9,40,72,0.10)]">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-lime-brand rounded-xl flex items-center justify-center mb-4 sm:mb-5 shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg sm:text-[21px] tracking-[-0.02em] font-bold text-ink">Start Here</h3>
            <p className="text-sm sm:text-[14.5px] leading-[1.6] text-ink-soft mt-2 flex-1">
              Atlas ranks the four or five files that explain the whole project — entry points and the most-imported modules — so day one feels like day thirty.
            </p>
            <span className="mt-5 sm:mt-6 inline-block font-mono text-[10px] sm:text-[10.5px] tracking-[0.1em] uppercase bg-mist rounded-full py-1 sm:py-1.5 px-3 text-ink-soft w-fit">Ranked list</span>
          </div>

          {/* Feature 3 */}
          <div className="rounded-[22px] border border-line p-6 sm:p-7 bg-white transition-all duration-200 ease-in-out flex flex-col hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(9,40,72,0.10)]">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-lime-brand rounded-xl flex items-center justify-center mb-4 sm:mb-5 shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="#1E2405" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg sm:text-[21px] tracking-[-0.02em] font-bold text-ink">Blast Radius</h3>
            <p className="text-sm sm:text-[14.5px] leading-[1.6] text-ink-soft mt-2 flex-1">
              Change one file and instantly see every downstream file that imports it — directly or through three layers of re-exports.
            </p>
            <span className="mt-5 sm:mt-6 inline-block font-mono text-[10px] sm:text-[10.5px] tracking-[0.1em] uppercase bg-mist rounded-full py-1 sm:py-1.5 px-3 text-ink-soft w-fit">Impact preview</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
