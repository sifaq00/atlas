import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

const STEPS = [
  {
    num: '01 / INDEX',
    title: 'AST, not AI',
    desc: 'Atlas parses your imports with an AST parser in WebAssembly. No LLM hallucinations, zero cost, deterministic accuracy.',
    terminal: ['$ atlas init', 'Parsing syntax trees...', '✓ Indexed 1,240 files'],
  },
  {
    num: '02 / GRAPH',
    title: 'Dependency graph',
    desc: 'Every import statement becomes a directed edge. Dynamic imports, re-exports, barrel files, and path aliases are resolved automatically.',
    terminal: ['$ atlas map', 'Resolving imports...', '✓ Graph built locally'],
  },
  {
    num: '03 / PANEL',
    title: 'Live in your editor',
    desc: 'A Webview panel rendered right next to your code. Click a node, open the file. Highlight a file, see its blast radius.',
    terminal: ['$ code .', 'Opening VS Code...', '✓ Atlas panel ready'],
  },
];

const TerminalAnimation: React.FC<{ lines: string[]; delay: number; inView: boolean }> = ({ lines, delay, inView }) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorBlink, setCursorBlink] = useState(true);

  useEffect(() => {
    if (!inView) return;

    const showLine = (lineIndex: number) => {
      if (lineIndex >= lines.length) {
        // Pause then reset and loop
        const resetTimer = setTimeout(() => {
          setVisibleLines(0);
          // Start again after brief pause
          const restartTimer = setTimeout(() => showLine(0), 400);
          return () => clearTimeout(restartTimer);
        }, 2000);
        return () => clearTimeout(resetTimer);
      }

      // Type delay per line
      const lineDelay = lineIndex === 0 ? delay * 1000 : lines[lineIndex - 1].startsWith('$') ? 800 : lines[lineIndex - 1].startsWith('✓') ? 1200 : 600;

      const timer = setTimeout(() => {
        setVisibleLines(lineIndex + 1);
        showLine(lineIndex + 1);
      }, lineDelay);

      return () => clearTimeout(timer);
    };

    const timer = setTimeout(() => showLine(0), delay * 1000);
    return () => clearTimeout(timer);
  }, [inView, lines, delay]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setCursorBlink((b) => !b), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0A121C] border border-[#1D2B3A] rounded-[10px] p-3 sm:p-3.5 font-mono text-xs text-[#B9E8FF] leading-[1.8] overflow-x-auto min-h-[82px]">
      {lines.map((line, j) => {
        if (j >= visibleLines) return null;
        const isLast = j === visibleLines - 1 && j < lines.length - 1;

        return (
          <div key={j} className="whitespace-nowrap">
            {line.startsWith('✓') ? (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-lime-brand"
              >
                {line}
              </motion.span>
            ) : line.startsWith('$') ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
              >
                {line}
                {isLast && <span className={`inline-block w-[6px] h-[14px] bg-lime-brand ml-0.5 align-middle ${cursorBlink ? 'opacity-100' : 'opacity-0'}`} />}
              </motion.span>
            ) : (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="text-slate-500"
              >
                {line}
              </motion.span>
            )}
          </div>
        );
      })}
      {visibleLines === 0 && (
        <span className={`inline-block w-[6px] h-[14px] bg-lime-brand align-middle ${cursorBlink ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </div>
  );
};

const HowItWorks: React.FC = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-16 sm:py-24 bg-ink text-white rounded-none lg:rounded-[34px] mx-0 lg:mx-3" id="how-it-works" ref={ref}>
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 sm:mb-16"
        >
          <div className="inline-flex items-center gap-2 font-mono text-xs sm:text-sm font-semibold uppercase tracking-[0.1em] text-lime-brand mb-4 sm:mb-6">
            <motion.span
              className="w-1.5 h-1.5 bg-lime-brand rounded-full"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            How it works
            <motion.span
              className="w-1.5 h-1.5 bg-lime-brand rounded-full"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.02em] text-white">
            Clone. Open. See.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="bg-ink-soft border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col group hover:border-lime-brand/30 transition-colors duration-500"
            >
              {/* Pulsing step number */}
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <motion.div
                  className="w-2 h-2 bg-lime-brand rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                />
                <div className="font-mono text-xs sm:text-[13px] font-bold text-lime-brand tracking-[0.05em]">{step.num}</div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-white">{step.title}</h3>
              <p className="text-sm sm:text-[15px] leading-[1.6] opacity-80 mb-5 sm:mb-6 flex-1 text-slate-200">
                {step.desc}
              </p>
              <TerminalAnimation lines={step.terminal} delay={0.5 + i * 2.5} inView={inView} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
