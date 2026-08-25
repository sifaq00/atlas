import React from 'react';

interface TechItem {
  name: string;
  logos: string[];
}

const TECHS: TechItem[] = [
  { name: 'TypeScript', logos: ['/logos/typescript.svg'] },
  { name: 'JavaScript', logos: ['/logos/javascript.svg'] },
  { name: 'React', logos: ['/logos/react.svg'] },
  { name: 'Next.js', logos: ['/logos/nextjs.svg'] },
  { name: 'Node.js', logos: ['/logos/nodejs.svg'] },
  { name: 'Express', logos: ['/logos/express.svg'] },
  { name: 'Vue.js', logos: ['/logos/vuejs.svg'] },
  { name: 'Nuxt', logos: ['/logos/nuxtjs.svg'] },
  { name: 'Svelte', logos: ['/logos/svelte.svg'] },
  { name: 'NestJS', logos: ['/logos/nestjs.svg'] },
  { name: 'Fastify', logos: ['/logos/fastify.svg'] },
  { name: 'Turborepo', logos: ['/logos/turborepo.svg'] },
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
                  {tech.logos.map((logo, j) => (
                    <img
                      key={j}
                      src={logo}
                      alt=""
                      className="w-5 h-5"
                      style={{ filter: 'brightness(0) saturate(100%)' }}
                    />
                  ))}
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
