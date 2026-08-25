import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DependencyGraph } from './types';
import { CATEGORY_COLORS } from './GraphCanvas';
import { Search, CornerDownLeft, X } from 'lucide-react';

interface QuickJumpModalProps {
  graph: DependencyGraph | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
}

export const QuickJumpModal: React.FC<QuickJumpModalProps> = ({
  graph,
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allFiles = useMemo(() => {
    if (!graph) return [];
    return Object.values(graph.nodes);
  }, [graph]);

  const filteredFiles = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 15);
    const q = query.toLowerCase();
    return allFiles
      .filter((f) => f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q))
      .slice(0, 25);
  }, [allFiles, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onSelectFile(filteredFiles[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150 font-mono"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3 bg-black/30">
          <Search size={18} className="text-[#D9F65A] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search module name or path... (↑ ↓ to navigate, ↵ to jump)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2 space-y-1 overscroll-contain"
          data-lenis-prevent
        >
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No matching modules found for "{query}"
            </div>
          ) : (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              const colors = CATEGORY_COLORS[file.category] || CATEGORY_COLORS.other;

              return (
                <div
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#D9F65A]/15 border border-[#D9F65A]/40 text-white'
                      : 'hover:bg-white/5 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {file.category}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-400 truncate max-w-sm">
                        {file.relativePath}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0 font-mono">
                    <span>{file.lineCount} lines</span>
                    <span>{file.importedBy.length} deps</span>
                    {isSelected && (
                      <CornerDownLeft size={13} className="text-[#D9F65A]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 border-t border-white/10 bg-black/40 flex items-center justify-between text-[10.5px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/15 text-slate-300">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/15 text-slate-300">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/15 text-slate-300">↵</kbd> Jump & Inspect</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/15 text-slate-300">ESC</kbd> Close</span>
          </div>
          <span>{filteredFiles.length} modules</span>
        </div>
      </div>
    </div>
  );
};
