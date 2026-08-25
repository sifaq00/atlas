import React, { useMemo } from 'react';
import { DependencyGraph, FileCategory } from './types';
import { Search, Filter, Sparkles, FileCode } from 'lucide-react';

interface SidebarProps {
  graph: DependencyGraph;
  activeFileId: string | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggleCategory: (cat: FileCategory) => void;
  onSelectFile: (fileId: string) => void;
}

const CATEGORIES: Array<{ key: FileCategory; label: string; color: string }> = [
  { key: 'ui', label: 'UI / Components', color: '#38bdf8' },
  { key: 'service', label: 'Services / API', color: '#a855f7' },
  { key: 'data', label: 'Data / Models', color: '#22c55e' },
  { key: 'util', label: 'Utils / Helpers', color: '#f59e0b' },
  { key: 'config', label: 'Config / JSON', color: '#94a3b8' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  graph,
  activeFileId,
  selectedCategories,
  searchTerm,
  onSearchChange,
  onToggleCategory,
  onSelectFile,
}) => {
  // Compute "Start Here" top entry points (ranked by in-degree / centrality / key entry paths)
  const startHereList = useMemo(() => {
    const list = Object.values(graph.nodes).map((node) => {
      // Score based on fanIn, exports, and entry name relevance
      let score = node.importedBy.length * 3;
      const lower = node.relativePath.toLowerCase();
      if (lower.includes('app.') || lower.includes('main.') || lower.includes('index.')) score += 10;
      if (lower.includes('router') || lower.includes('routes')) score += 8;
      if (node.category === 'data' || node.category === 'service') score += 5;
      return { node, score };
    });

    list.sort((a, b) => b.score - a.score);
    return list.slice(0, 6).map((item) => item.node);
  }, [graph]);

  // Filtered files list
  const filteredFiles = useMemo(() => {
    return Object.values(graph.nodes)
      .filter((n) => selectedCategories.has(n.category))
      .filter((n) => !searchTerm || n.relativePath.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.importedBy.length - a.importedBy.length);
  }, [graph, selectedCategories, searchTerm]);

  return (
    <div className="w-72 sm:w-80 h-full bg-slate-950/90 border-r border-white/10 flex flex-col backdrop-blur-xl z-20 text-white select-none">
      {/* Search Bar */}
      <div className="p-3.5 border-b border-white/10">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files or modules..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D9F65A]/50 focus:ring-1 focus:ring-[#D9F65A]/50 font-mono transition-all"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <Filter size={11} /> Filters
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {filteredFiles.length} / {graph.totalFiles} files
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.has(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => onToggleCategory(cat.key)}
                className={`px-2 py-1 rounded-md text-[10.5px] font-mono flex items-center gap-1.5 border transition-all ${
                  isSelected
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/[0.02] border-transparent text-slate-500 hover:text-slate-400'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: cat.color, opacity: isSelected ? 1 : 0.4 }}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Start Here Recommendations */}
        {!searchTerm && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1 text-slate-300 font-mono text-[10.5px] uppercase tracking-wider font-semibold">
              <Sparkles size={13} className="text-[#D9F65A]" />
              <span>Start Here (Key Modules)</span>
            </div>
            <div className="space-y-1">
              {startHereList.map((node) => {
                const isActive = activeFileId === node.id;
                return (
                  <button
                    key={node.id}
                    onClick={() => onSelectFile(node.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-[#D9F65A]/15 border-[#D9F65A]/40 text-[#D9F65A]'
                        : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-mono text-xs font-semibold truncate">{node.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate opacity-80">
                        {node.relativePath}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400 shrink-0">
                      {node.importedBy.length} deps
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* All Files List */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1 text-slate-400 font-mono text-[10.5px] uppercase tracking-wider font-semibold">
            <FileCode size={13} />
            <span>Files ({filteredFiles.length})</span>
          </div>
          <div className="space-y-0.5 max-h-80 overflow-y-auto custom-scrollbar">
            {filteredFiles.map((node) => {
              const isActive = activeFileId === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => onSelectFile(node.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-mono transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="truncate pr-2">{node.relativePath}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{node.lineCount}L</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-white/10 bg-black/20 text-[10.5px] font-mono text-slate-400 flex items-center justify-between">
        <span>{graph.totalFiles} files scanned</span>
        <span>{graph.totalDependencies} connections</span>
      </div>
    </div>
  );
};
