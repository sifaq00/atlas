import React from 'react';
import { motion } from 'framer-motion';

interface TechItem {
  name: string;
  logos: string[];
}

const TECHS: TechItem[] = [
  { name: 'TypeScript', logos: ['/logos/typescript.svg'] },
  { name: 'JavaScript (ES6+)', logos: ['/logos/javascript.svg'] },
  { name: 'React & Next.js', logos: ['/logos/react.svg', '/logos/nextjs.svg'] },
  { name: 'Node.js & Express', logos: ['/logos/nodejs.svg', '/logos/express.svg'] },
  { name: 'Vue & Nuxt', logos: ['/logos/vuejs.svg', '/logos/nuxtjs.svg'] },
  { name: 'Svelte & SvelteKit', logos: ['/logos/svelte.svg'] },
  { name: 'NestJS & Fastify', logos: ['/logos/nestjs.svg', '/logos/fastify.svg'] },
  { name: 'Monorepos & Turborepo', logos: ['/logos/turborepo.svg'] },
];

const TechStack: React.FC = () => {
  return (
    <div className="w-full overflow-hidden bg-white py-10 relative">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 w-[120px] h-full z-[2] bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 w-[120px] h-full z-[2] bg-gradient-to-l from-white to-transparent" />

      {/* Scrolling track */}
      <div className="flex w-max animate-scroll">
        {/* Render 3 times for seamless infinite scroll */}
        {[1, 2, 3].map((group) => (
          <div key={group} className="flex gap-4 px-2">
            {TECHS.map((tech, i) => (
              <motion.div
                key={`${group}-${i}`}
                whileHover={{ scale: 1.08, y: -4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="flex items-center gap-2.5 py-3 px-6 bg-mist rounded-full border border-line whitespace-nowrap cursor-default group hover:border-sky-brand/40 hover:shadow-[0_8px_24px_rgba(2,132,199,0.12)] transition-all duration-200"
              >
                <div className="flex items-center gap-1.5 shrink-0 transition-transform duration-200 group-hover:scale-110">
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
                <span className="font-semibold text-[15px] text-ink">{tech.name}</span>
              </motion.div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TechStack;
