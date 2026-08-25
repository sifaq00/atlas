import React from 'react';

const Navbar: React.FC = () => {
  return (
    <header className="relative z-50 bg-sky-brand py-4">
      <div className="max-w-[1220px] mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/icon.png" alt="Atlas" className="w-7 h-7 object-contain" />
          <span className="font-bold text-[19px] tracking-[-0.01em] text-white">Atlas</span>
        </div>
        
        <nav className="hidden md:flex gap-[30px] font-mono text-[11.5px] tracking-[0.14em] uppercase font-medium">
          <a href="#features" className="text-white opacity-90 hover:opacity-100 hover:underline transition-opacity">Features</a>
          <a href="#how-it-works" className="text-white opacity-90 hover:opacity-100 hover:underline transition-opacity">How it works</a>
          <a href="#why-atlas" className="text-white opacity-90 hover:opacity-100 hover:underline transition-opacity">Why Atlas</a>
          <a href="https://github.com/wealthypeople/scope" target="_blank" rel="noopener" className="text-white opacity-90 hover:opacity-100 hover:underline transition-opacity">GitHub</a>
        </nav>
        
        <div className="flex items-center gap-3">
          <button className="btn-lime">Install free</button>
          <button className="md:hidden text-white p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
