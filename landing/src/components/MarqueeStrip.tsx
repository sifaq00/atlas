import React from 'react';

interface TechItem {
  name: string;
  icons: React.ReactNode[];
}

const TECHS: TechItem[] = [
  {
    name: 'TypeScript',
    icons: [
      <svg key="ts" className="w-[18px] h-[18px] rounded-[4px] shrink-0 shadow-xs" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#3178C6"/>
        <path d="M14.7 15.6c.4.8 1.1 1.3 2 1.3.9 0 1.5-.5 1.5-1.2 0-.8-.7-1.1-1.8-1.6-1.6-.7-2.6-1.5-2.6-3.2 0-1.8 1.4-3.2 3.5-3.2 1.5 0 2.6.6 3.3 1.8l-1.6 1c-.4-.7-.9-1-1.7-1-.7 0-1.3.4-1.3 1 0 .7.5 1 1.6 1.4 1.8.8 2.9 1.6 2.9 3.4 0 2-1.6 3.4-3.8 3.4-2.1 0-3.4-1.1-4-2.3l2-1.2zm-8.2-5.4H9v9.5H6.5v-9.5H4V8h7.5v2.2z" fill="#FFFFFF"/>
      </svg>
    ]
  },
  {
    name: 'JavaScript (ES6+)',
    icons: [
      <svg key="js" className="w-[18px] h-[18px] rounded-[4px] shrink-0 shadow-xs" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#F7DF1E"/>
        <path d="M7 16.5c.3.5.7.9 1.4.9.7 0 1.1-.3 1.1-1.1V8.5h2.1v7.8c0 2-1.2 3-3 3-1.6 0-2.6-.9-3-2.1l1.4-.7zm6.7-.2c.5.8 1.2 1.4 2.4 1.4 1 0 1.7-.5 1.7-1.3 0-.9-.7-1.3-1.9-1.8-1.6-.7-2.6-1.4-2.6-3.1 0-1.7 1.3-3 3.3-3 1.4 0 2.4.5 3.1 1.7l-1.6 1c-.4-.6-.8-.9-1.5-.9-.7 0-1.1.4-1.1.9 0 .6.4.9 1.4 1.3 1.7.7 2.9 1.5 2.9 3.3 0 1.9-1.5 3.1-3.7 3.1-2.1 0-3.3-.9-4-2.3l1.6-1.3z" fill="#000000"/>
      </svg>
    ]
  },
  {
    name: 'React & Next.js',
    icons: [
      // React
      <svg key="react" className="w-[19px] h-[19px] shrink-0" viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" stroke="#61DAFB" strokeWidth="1.5" transform="rotate(120 12 12)" />
        <circle cx="12" cy="12" r="1.8" fill="#61DAFB" />
      </svg>,
      // Next.js
      <svg key="next" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="black"/>
        <path d="M15.5 8.5v7m-7-7v7l7.5-8" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.5 12.5L16.2 13.5" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ]
  },
  {
    name: 'Node.js & Express',
    icons: [
      // Node.js
      <svg key="node" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 7.2v10.4L12 22.8l9-5.2V7.2L12 2z" fill="#339933"/>
        <path d="M12 4.6l6.6 3.8v7.6L12 19.8l-6.6-3.8V8.4L12 4.6z" fill="#215732"/>
        <path d="M12 8v8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>,
      // Express
      <svg key="express" className="w-[18px] h-[18px] shrink-0 rounded-[4px] bg-black flex items-center justify-center" viewBox="0 0 24 24">
        <text x="12" y="16" fill="white" fontSize="11.5" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="700" textAnchor="middle">ex</text>
      </svg>
    ]
  },
  {
    name: 'Vue & Nuxt',
    icons: [
      // Vue
      <svg key="vue" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
        <path d="M2 3h4.2l5.8 10L17.8 3H22L12 20.5 2 3z" fill="#42B883"/>
        <path d="M6.2 3h3.6L12 6.8 14.2 3h3.6L12 12.8 6.2 3z" fill="#35495E"/>
      </svg>,
      // Nuxt
      <svg key="nuxt" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M10.8 19.5H2.4a1 1 0 0 1-.87-1.5l6.5-11.2a1.8 1.8 0 0 1 3.12 0l2.3 4a1.8 1.8 0 0 1 0 1.8l-2.65 4.6" stroke="#00DC82" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.5 19.5h8.1a1 1 0 0 0 .87-1.5l-4.5-7.8a1.8 1.8 0 0 0-3.12 0l-2 3.5" stroke="#00DC82" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ]
  },
  {
    name: 'Svelte & SvelteKit',
    icons: [
      <svg key="svelte" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M19.4 6.7a4.9 4.9 0 0 0-7.3-3.8L6.8 6.4A4.9 4.9 0 0 0 4.6 13l2 3.4a4.9 4.9 0 0 0 6.6 1.7l1.7-1a1.2 1.2 0 0 0 .5-1.5 1.2 1.2 0 0 0-1.5-.5l-1.7 1a2.5 2.5 0 0 1-3.3-.9l-2-3.4a2.5 2.5 0 0 1 1.1-3.4l5.3-3.5a2.5 2.5 0 0 1 3.7 2l-.1 1.3a1.2 1.2 0 1 0 2.4.2l.1-1.4a4.8 4.8 0 0 0-.5-2.7z" fill="#FF3E00"/>
        <path d="M4.6 17.3a4.9 4.9 0 0 0 7.3 3.8l5.3-3.5a4.9 4.9 0 0 0 2.2-6.6l-2-3.4a4.9 4.9 0 0 0-6.6-1.7l-1.7 1a1.2 1.2 0 1 0 1.1 2l1.7-1a2.5 2.5 0 0 1 3.3.9l2 3.4a2.5 2.5 0 0 1-1.1 3.4l-5.3 3.5a2.5 2.5 0 0 1-3.7-2l.1-1.3a1.2 1.2 0 1 0-2.4-.2l-.1 1.4c0 .9.2 1.8.6 2.7z" fill="#FF3E00"/>
      </svg>
    ]
  },
  {
    name: 'NestJS & Fastify',
    icons: [
      // NestJS
      <svg key="nest" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M12 2c-3.5 0-6.4 2.4-7.5 5.7C3.4 8.2 2 9.8 2 12c0 2.5 1.8 4.6 4.2 5 1.2 3.2 4.1 5 7.8 5 4.5 0 8-3.6 8-8s-3.5-12-10-12z" fill="#E0234E"/>
        <path d="M16 11c-1.5-2-3.5-3-6-3-2 0-3.5.8-4.5 2 1.5.5 3 1.5 4.5 3 1.5 1.5 3.5 2 6-2z" fill="white"/>
      </svg>,
      // Fastify
      <svg key="fastify" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#000000"/>
        <path d="M12 6v6l4 2" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="1.5" fill="#20EEB0"/>
      </svg>
    ]
  },
  {
    name: 'Monorepos & Turborepo',
    icons: [
      <svg key="turbo" className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="url(#turbo-grad)"/>
        <path d="M8 12a4 4 0 0 1 8 0 4 4 0 0 1-8 0z" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="turbo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0099FF"/>
            <stop offset="1" stopColor="#FF007A"/>
          </linearGradient>
        </defs>
      </svg>
    ]
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
                <div className="flex items-center gap-1.5">
                  {tech.icons}
                </div>
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
