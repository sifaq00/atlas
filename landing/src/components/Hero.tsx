import React from 'react';
import HeroCards3D from './HeroCards3D';

const Hero: React.FC = () => {
  return (
    <div className="w-full h-screen min-h-[640px] p-2 sm:p-2.5 bg-white box-border flex flex-col">
      <header className="relative w-full h-full bg-sky-brand bg-[url('/sky-clouds.png')] bg-bottom bg-cover bg-no-repeat rounded-[20px] sm:rounded-[24px] md:rounded-[28px] overflow-hidden text-white flex flex-col justify-between shadow-sm">
        
        {/* 1. Top Navbar */}
        <div className="max-w-[1240px] w-full mx-auto px-6 pt-4 sm:pt-5 pb-1 relative z-20 shrink-0">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <a className="flex items-center gap-2.5 font-bold text-xl tracking-[-0.03em] text-white no-underline group" href="#">
              <img src="/icon.png" alt="Atlas" className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-300 group-hover:scale-110" />
              <span className="text-[20px] font-semibold tracking-[-0.03em]">Atlas</span>
            </a>

            {/* Center Nav Links */}
            <div className="hidden md:flex items-center gap-8 font-mono text-[11.5px] tracking-[0.14em] uppercase font-medium">
              <a href="#features" className="text-white/90 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-white/90 hover:text-white transition-colors">How it works</a>
              <a href="#why-atlas" className="text-white/90 hover:text-white transition-colors">Why Atlas</a>
              <a href="https://github.com/wealthypeople/scope" target="_blank" rel="noopener" className="text-white/90 hover:text-white transition-colors">GitHub</a>
            </div>

            {/* Right Action */}
            <a 
              href="#" 
              className="font-mono text-[11px] sm:text-[11.5px] font-medium tracking-[0.1em] uppercase py-2 sm:py-2.5 px-5 sm:px-6 rounded-full bg-[#D9F65A] text-[#1E2405] hover:brightness-105 transition-all shadow-[0_4px_16px_rgba(30,36,5,0.18)] hover:-translate-y-0.5"
            >
              Install Free
            </a>
          </nav>
        </div>

        {/* 2. Hero Central Content */}
        <div className="max-w-[1240px] w-full mx-auto px-6 text-center relative z-10 my-auto py-1 shrink-0">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] leading-[1.12] font-medium tracking-[-0.06em] max-w-4xl mx-auto text-white">
            Building clarity into<br />
            <span className="text-white/75">codebase architecture</span>
          </h1>
          
          <p className="max-w-[580px] mx-auto mt-2.5 text-xs sm:text-sm md:text-[15px] leading-relaxed text-white/85 font-normal tracking-[-0.02em]">
            Atlas turns any repository you open inside VS Code into an interactive architecture map — entry points, hot files, and blast radius mapped the moment you clone.
          </p>

          {/* Dual CTA Buttons */}
          <div className="flex items-center justify-center gap-3.5 mt-4 sm:mt-5 flex-wrap">
            <a 
              href="#how-it-works" 
              className="font-mono text-[11px] sm:text-xs font-medium tracking-[0.08em] uppercase py-3 px-6 rounded-full bg-slate-950/40 hover:bg-slate-950/60 text-white border border-white/30 backdrop-blur-md transition-all hover:-translate-y-0.5"
            >
              View Demo
            </a>

            <a 
              href="#" 
              className="group font-mono text-[11px] sm:text-xs font-medium tracking-[0.08em] uppercase py-1.5 pl-5 pr-1.5 rounded-full bg-[#D9F65A] text-[#1E2405] inline-flex items-center gap-2.5 shadow-[0_12px_28px_rgba(30,36,5,0.22)] hover:scale-105 transition-all"
            >
              <span>Get Started</span>
              <span className="w-7 h-7 rounded-full bg-[#1E2405] text-[#D9F65A] flex items-center justify-center transition-transform group-hover:rotate-45">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </a>
          </div>
        </div>

        {/* 3. 3D Curved Moving Cards Marquee */}
        <div className="relative z-10 w-full flex flex-col justify-end items-center pb-3 pt-0 shrink-0">
          <HeroCards3D />

          {/* Rating text on top of clouds */}
          <div className="flex flex-col items-center justify-center gap-0.5 text-[10.5px] sm:text-[11px] text-white/90 mt-1 relative z-20">
            <span>Rated 4.9/5 by 4,900+ developers</span>
            <div className="text-amber-300 tracking-[2px] text-[10px] sm:text-[11px]">★★★★★</div>
          </div>
        </div>

      </header>
    </div>
  );
};

export default Hero;
