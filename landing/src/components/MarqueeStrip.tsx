import React from 'react';

const MarqueeStrip: React.FC = () => {
  const techs = [
    { name: 'TypeScript', color: '#3178C6' },
    { name: 'JavaScript (ES6+)', color: '#F7DF1E' },
    { name: 'React & Next.js', color: '#61DAFB' },
    { name: 'Node.js & Express', color: '#339933' },
    { name: 'Vue & Nuxt', color: '#4FC08D' },
    { name: 'Svelte & SvelteKit', color: '#FF3E00' },
    { name: 'NestJS & Fastify', color: '#E0234E' },
    { name: 'Monorepos & Turborepo', color: '#EF4444' },
  ];

  return (
    <div className="w-full overflow-hidden bg-white py-10 relative flex">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 w-[100px] h-full z-[2] bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 w-[100px] h-full z-[2] bg-gradient-to-l from-white to-transparent" />

      <div className="flex w-max animate-scroll hover:[animation-play-state:paused]">
        {/* Render 3 times for seamless infinite scroll */}
        {[1, 2, 3].map((group) => (
          <div key={group} className="flex gap-4 px-2">
            {techs.map((tech, i) => (
              <div key={i} className="flex items-center gap-2 py-3 px-6 bg-mist rounded-full border border-line whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tech.color }}></span>
                <span className="font-semibold text-[15px] text-ink">{tech.name}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarqueeStrip;
