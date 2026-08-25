import React from 'react';

interface TechItem {
  name: string;
  icon: React.ReactNode;
}

const TECHS: TechItem[] = [
  {
    name: 'TypeScript',
    icon: (
      <svg className="w-5 h-5 rounded-[4px] shrink-0" viewBox="0 0 128 128">
        <path fill="#3178C6" d="M0 0h128v128H0z"/>
        <path fill="#FFF" d="m66.5 101.9c0-6 3.5-9.8 9.3-13.6 5.8-3.8 8.8-7.7 8.8-12.7 0-4.6-3.2-7.8-8.2-7.8-5.3 0-8.5 3.3-8.8 8.7l-10.4-1.6c1.1-10.3 8.9-16.7 19.3-16.7 11.6 0 18.7 7.1 18.7 17.2 0 7.3-4.1 12.3-10.7 16.6-5.1 3.4-7.2 5.9-7.5 9.7h18.9v9.7h-29.4v-.5zm-40.4-42.1h30.8v9.7h-10.1v42h-10.7v-42h-10z"/>
      </svg>
    ),
  },
  {
    name: 'JavaScript',
    icon: (
      <svg className="w-5 h-5 rounded-[4px] shrink-0" viewBox="0 0 128 128">
        <path fill="#F7DF1E" d="M0 0h128v128H0z"/>
        <path d="m67.3 100.8c0-6 3.5-9.8 9.3-13.6 5.8-3.8 8.8-7.7 8.8-12.7 0-4.6-3.2-7.8-8.2-7.8-5.3 0-8.5 3.3-8.8 8.7l-10.4-1.6c1.1-10.3 8.9-16.7 19.3-16.7 11.6 0 18.7 7.1 18.7 17.2 0 7.3-4.1 12.3-10.7 16.6-5.1 3.4-7.2 5.9-7.5 9.7h18.9v9.7h-29.4v-.5zm-33.8 4.2c0-8.8 3.5-14.7 10.3-17.8l6.8 5.7c-3.7 1.8-5.8 4.7-5.8 9.2 0 4.8 2.8 7.6 7.4 7.6 4.3 0 7.1-2.4 7.1-8.5V60.7h11.2v39.7c0 12.5-7.3 18.8-18.7 18.8-11.4 0-18.3-6.4-18.3-14.2z"/>
      </svg>
    ),
  },
  {
    name: 'React',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="-11.5 -10.23174 23 20.46348">
        <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
        <g stroke="#61dafb" strokeWidth="1" fill="none">
          <ellipse rx="11" ry="4.2"/>
          <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
          <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
        </g>
      </svg>
    ),
  },
  {
    name: 'Next.js',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 180 180" fill="none">
        <circle cx="90" cy="90" fill="black" r="90"/>
        <path d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z" fill="white"/>
        <rect fill="white" height="72" width="12" x="115" y="54"/>
      </svg>
    ),
  },
  {
    name: 'Node.js',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 256 289" fill="none">
        <path d="M128 0L256 73.9V215.1L128 289L0 215.1V73.9L128 0Z" fill="#539E43"/>
        <path d="M128 28.5L231.3 88.1V200.9L128 260.5L24.7 200.9V88.1L128 28.5Z" fill="#215732"/>
        <path d="M128 57L206.6 102.3V186.7L128 232L49.4 186.7V102.3L128 57Z" fill="#539E43"/>
      </svg>
    ),
  },
  {
    name: 'Express',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="5" fill="#000000"/>
        <text x="12" y="16.5" fill="white" fontSize="11" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" textAnchor="middle">ex</text>
      </svg>
    ),
  },
  {
    name: 'Vue.js',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 256 221">
        <path fill="#41B883" d="M204.8 0H256L128 220.8 0 0h97.92L128 51.2 157.44 0h47.36z"/>
        <path fill="#34495E" d="M0 0l128 220.8L256 0h-51.2L128 132.48 49.92 0H0z"/>
      </svg>
    ),
  },
  {
    name: 'Nuxt',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M10.5 19.5H2.4a1 1 0 0 1-.87-1.5l6.5-11.2a1.8 1.8 0 0 1 3.12 0l2.3 4a1.8 1.8 0 0 1 0 1.8l-2.65 4.6" stroke="#00DC82" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.5 19.5h8.1a1 1 0 0 0 .87-1.5l-4.5-7.8a1.8 1.8 0 0 0-3.12 0l-2 3.5" stroke="#00DC82" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    name: 'Svelte',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M19.4 6.7a4.9 4.9 0 0 0-7.3-3.8L6.8 6.4A4.9 4.9 0 0 0 4.6 13l2 3.4a4.9 4.9 0 0 0 6.6 1.7l1.7-1a1.2 1.2 0 0 0 .5-1.5 1.2 1.2 0 0 0-1.5-.5l-1.7 1a2.5 2.5 0 0 1-3.3-.9l-2-3.4a2.5 2.5 0 0 1 1.1-3.4l5.3-3.5a2.5 2.5 0 0 1 3.7 2l-.1 1.3a1.2 1.2 0 1 0 2.4.2l.1-1.4a4.8 4.8 0 0 0-.5-2.7z" fill="#FF3E00"/>
        <path d="M4.6 17.3a4.9 4.9 0 0 0 7.3 3.8l5.3-3.5a4.9 4.9 0 0 0 2.2-6.6l-2-3.4a4.9 4.9 0 0 0-6.6-1.7l-1.7 1a1.2 1.2 0 1 0 1.1 2l1.7-1a2.5 2.5 0 0 1 3.3.9l2 3.4a2.5 2.5 0 0 1-1.1 3.4l-5.3 3.5a2.5 2.5 0 0 1-3.7-2l.1-1.3a1.2 1.2 0 1 0-2.4-.2l-.1 1.4c0 .9.2 1.8.6 2.7z" fill="#FF3E00"/>
      </svg>
    ),
  },
  {
    name: 'NestJS',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 256 254" fill="none">
        <path d="M110.1 0C84.7 0 62.5 14.6 51.5 35.8 43 40.5 36.2 47.7 32 56.4 12.8 62.9 0 80.6 0 101.4c0 23.3 16.3 42.8 38.3 47.4 10.6 26.6 34.6 45.8 64 48.9 5.3 32.5 33.3 56.3 67.8 56.3 38.5 0 69.8-31.3 69.8-69.8 0-6.8-1-13.4-2.8-19.6C249.7 151.7 256 137.6 256 122c0-26.5-18.4-48.8-43.2-54.8C208.5 29.3 163.5 0 110.1 0z" fill="#E0234E"/>
        <path d="M158.4 102.5c-15.8-18.7-37.4-29.3-64.8-29.3-21.7 0-40.4 6.7-53.8 19.3 15.8 4.7 30.5 13.9 42.6 26 15.3 15.3 34.9 23.7 57.3 23.7 7.7 0 15.2-1 22.3-2.9-1.2-12.8-1.5-25.1-3.6-36.8z" fill="#FFFFFF"/>
      </svg>
    ),
  },
  {
    name: 'Fastify',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#000000"/>
        <path d="M12 5.5v6.5l4.5 2.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="1.8" fill="#20EEB0"/>
      </svg>
    ),
  },
  {
    name: 'Turborepo',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="url(#turbo-grad)"/>
        <path d="M8 12a4 4 0 0 1 8 0 4 4 0 0 1-8 0z" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="turbo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0099FF"/>
            <stop offset="1" stopColor="#FF007A"/>
          </linearGradient>
        </defs>
      </svg>
    ),
  },
];

const MarqueeStrip: React.FC = () => {
  return (
    <div className="w-full overflow-hidden bg-white py-8 sm:py-10 relative flex">
      {/* Edge gradient mask */}
      <div className="pointer-events-none absolute left-0 top-0 w-16 sm:w-28 h-full z-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 w-16 sm:w-28 h-full z-10 bg-gradient-to-l from-white to-transparent" />

      <div className="flex w-max animate-scroll hover:[animation-play-state:paused]">
        {/* Render 3 times for seamless infinite scroll */}
        {[1, 2, 3].map((group) => (
          <div key={group} className="flex gap-3 sm:gap-4 px-1.5 sm:px-2">
            {TECHS.map((tech, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 py-2.5 sm:py-3 px-4 sm:px-6 bg-mist hover:bg-[#E9EEF3] transition-colors rounded-full border border-line whitespace-nowrap shadow-2xs select-none"
              >
                {tech.icon}
                <span className="font-semibold text-xs sm:text-[14.5px] text-ink">{tech.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarqueeStrip;
