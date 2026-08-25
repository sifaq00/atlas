import React, { useState } from 'react';
import HeroCards3D from './HeroCards3D';

const Hero: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="w-full min-h-[640px] sm:min-h-[700px] lg:h-screen lg:min-h-[720px] max-h-[960px] p-2 sm:p-2.5 bg-white box-border flex flex-col">
      <header className="relative w-full h-full bg-sky-brand bg-[url('/sky-clouds.png')] bg-bottom bg-cover bg-no-repeat rounded-[20px] sm:rounded-[24px] md:rounded-[28px] overflow-hidden text-white flex flex-col justify-between shadow-sm">
        
        {/* 1. Top Navbar */}
        <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 pt-3.5 sm:pt-5 pb-1 relative z-30 shrink-0">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <a className="flex items-center gap-2 font-bold text-lg sm:text-xl tracking-[-0.03em] text-white no-underline group" href="#">
              <img src="/icon.png" alt="Atlas" className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-300 group-hover:scale-110" />
              <span className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.03em]">Atlas</span>
            </a>

            {/* Center Nav Links (Desktop) */}
            <div className="hidden md:flex items-center gap-7 lg:gap-8 font-mono text-[11px] lg:text-[11.5px] tracking-[0.14em] uppercase font-medium">
              <a href="#features" className="text-white/90 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-white/90 hover:text-white transition-colors">How it works</a>
              <a href="#why-atlas" className="text-white/90 hover:text-white transition-colors">Why Atlas</a>
              <a href="https://github.com/wealthypeople/scope" target="_blank" rel="noopener" className="text-white/90 hover:text-white transition-colors">GitHub</a>
            </div>

            {/* Right Action */}
            <div className="flex items-center gap-2">
              <a 
                href="#" 
                className="font-mono text-[10.5px] sm:text-[11.5px] font-semibold tracking-[0.08em] uppercase py-2 sm:py-2.5 px-4 sm:px-6 rounded-full bg-[#D9F65A] text-[#1E2405] hover:brightness-105 transition-all shadow-[0_4px_16px_rgba(30,36,5,0.18)] hover:-translate-y-0.5"
              >
                Install Free
              </a>

              {/* Mobile Menu Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-white/90 hover:text-white p-2 rounded-lg focus:outline-none"
                aria-label="Toggle menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {mobileMenuOpen ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </nav>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 p-4 bg-sky-900/90 backdrop-blur-xl rounded-2xl border border-white/20 flex flex-col gap-3 font-mono text-xs uppercase tracking-wider">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-white/90 hover:text-white py-1">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-white/90 hover:text-white py-1">How it works</a>
              <a href="#why-atlas" onClick={() => setMobileMenuOpen(false)} className="text-white/90 hover:text-white py-1">Why Atlas</a>
              <a href="https://github.com/wealthypeople/scope" target="_blank" rel="noopener" className="text-white/90 hover:text-white py-1">GitHub</a>
            </div>
          )}
        </div>

        {/* 2. Hero Central Content */}
        <div className="max-w-[1240px] w-full mx-auto px-4 sm:px-6 text-center relative z-10 my-auto py-1 sm:py-2 shrink-0">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[62px] leading-[1.12] font-medium tracking-[-0.05em] max-w-4xl mx-auto text-white">
            Building clarity into<br />
            <span className="text-white/75">codebase architecture</span>
          </h1>
          
          <p className="max-w-[560px] mx-auto mt-2 sm:mt-3 text-xs sm:text-sm md:text-[15px] leading-relaxed text-white/85 font-normal tracking-[-0.02em] px-2">
            Atlas turns any repository you open inside VS Code into an interactive architecture map — entry points, hot files, and blast radius mapped the moment you clone.
          </p>

          {/* Dual CTA Buttons */}
          <div className="flex items-center justify-center gap-3 sm:gap-3.5 mt-3.5 sm:mt-5 flex-wrap">
            <a 
              href="#how-it-works" 
              className="font-mono text-[10.5px] sm:text-xs font-medium tracking-[0.08em] uppercase py-2.5 sm:py-3 px-5 sm:px-6 rounded-full bg-slate-950/40 hover:bg-slate-950/60 text-white border border-white/30 backdrop-blur-md transition-all hover:-translate-y-0.5"
            >
              View Demo
            </a>

            <a 
              href="#" 
              className="group font-mono text-[10.5px] sm:text-xs font-medium tracking-[0.08em] uppercase py-1 pl-4 sm:pl-5 pr-1 sm:pr-1.5 rounded-full bg-[#D9F65A] text-[#1E2405] inline-flex items-center gap-2 sm:gap-2.5 shadow-[0_12px_28px_rgba(30,36,5,0.22)] hover:scale-105 transition-all"
            >
              <span>Get Started</span>
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#1E2405] text-[#D9F65A] flex items-center justify-center transition-transform group-hover:rotate-45">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </a>
          </div>
        </div>

        {/* 3. 3D Curved Moving Cards Marquee (Elevated & Separated) */}
        <div className="relative z-10 w-full flex flex-col justify-end items-center pb-3 sm:pb-4 pt-0 shrink-0 -mt-5 sm:-mt-8 md:-mt-10">
          <HeroCards3D />

          {/* Rating text on top of clouds with healthy spacing */}
          <div className="flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-[11px] text-white/90 mt-3 sm:mt-4 relative z-20">
            <span>Rated 4.9/5 by 4,900+ developers</span>
            <div className="text-amber-300 tracking-[2px] text-[9.5px] sm:text-[10.5px]">★★★★★</div>
          </div>
        </div>

      </header>
    </div>
  );
};

export default Hero;
