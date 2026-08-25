import React, { useMemo, useState } from 'react';
import { DependencyGraph, FileCategory, FileNode } from './types';
import { CATEGORY_COLORS } from './GraphCanvas';
import { Folder, Layers, FileCode } from 'lucide-react';

interface TreemapViewProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  onSelectFile: (fileId: string) => void;
}

export const TreemapView: React.FC<TreemapViewProps> = ({
  graph,
  activeFileId,
  selectedCategories,
  searchTerm,
  onSelectFile,
}) => {
  const [hoveredFile, setHoveredFile] = useState<FileNode | null>(null);

  // Group and compute squarified treemap layout
  const { treemapNodes, folderGroups, totalLines } = useMemo(() => {
    if (!graph || Object.keys(graph.nodes).length === 0) {
      return { treemapNodes: [], folderGroups: {}, totalLines: 0 };
    }

    const filteredNodes = Object.values(graph.nodes).filter((node) => {
      if (!selectedCategories.has(node.category)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = node.id.toLowerCase().includes(q) || node.name.toLowerCase().includes(q) || node.relativePath.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    const sumLines = filteredNodes.reduce((acc, n) => acc + Math.max(10, n.lineCount), 0);
    const groups: Record<string, FileNode[]> = {};

    for (const node of filteredNodes) {
      const parts = node.relativePath.split('/');
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(node);
    }

    return {
      treemapNodes: filteredNodes,
      folderGroups: groups,
      totalLines: sumLines,
    };
  }, [graph, selectedCategories, searchTerm]);

  return (
    <div className="w-full h-full bg-[#0B1420] p-4 sm:p-6 overflow-y-auto flex flex-col gap-6 select-none" data-lenis-prevent>
      {/* Top Header stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
            <Layers size={16} className="text-[#D9F65A]" />
            <span>Codebase Complexity Treemap</span>
          </div>
          <p className="text-slate-400 text-xs font-mono mt-0.5">
            Proportional file size and line density grouped by architectural modules
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-300">
            Files: <strong className="text-[#D9F65A]">{treemapNodes.length}</strong>
          </span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-300">
            Total Lines: <strong className="text-sky-400">{totalLines.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Folders grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {Object.entries(folderGroups).map(([folderName, files]) => {
          const folderLines = files.reduce((acc, f) => acc + f.lineCount, 0);

          return (
            <div
              key={folderName}
              className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-xl backdrop-blur-sm"
            >
              {/* Folder header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-200 font-bold truncate">
                  <Folder size={14} className="text-[#D9F65A] shrink-0" />
                  <span className="truncate">{folderName}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {files.length} files • {folderLines.toLocaleString()} lines
                </span>
              </div>

              {/* Files blocks */}
              <div className="flex flex-wrap gap-2 pt-1">
                {files.map((file) => {
                  const colors = CATEGORY_COLORS[file.category] || CATEGORY_COLORS.other;
                  const isActive = activeFileId === file.id;
                  const ratio = Math.max(1, Math.min(6, Math.round((file.lineCount / 100) * 1.5)));

                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => onSelectFile(file.id)}
                      onMouseEnter={() => setHoveredFile(file)}
                      onMouseLeave={() => setHoveredFile(null)}
                      style={{
                        flexGrow: ratio,
                        minWidth: '110px',
                        backgroundColor: isActive ? colors.bg : 'rgba(255, 255, 255, 0.03)',
                        borderColor: isActive ? '#ffffff' : colors.border + '40',
                      }}
                      className={`h-20 p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
                        isActive ? 'ring-2 ring-white/50' : 'hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 w-full">
                        <span
                          className="text-xs font-mono font-bold truncate"
                          style={{ color: isActive ? '#ffffff' : colors.text }}
                        >
                          {file.name}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0 mt-1"
                          style={{ backgroundColor: colors.bg }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                        <span>{file.lineCount} lines</span>
                        <span className="text-slate-500">
                          {file.importedBy.length} deps
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Info Bar */}
      {hoveredFile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border border-white/20 rounded-xl px-4 py-2 text-xs font-mono text-white shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in zoom-in-95">
          <FileCode size={14} className="text-[#D9F65A]" />
          <span className="text-slate-300 font-bold">{hoveredFile.relativePath}</span>
          <span className="text-slate-500">•</span>
          <span>Lines: <strong className="text-sky-300">{hoveredFile.lineCount}</strong></span>
          <span className="text-slate-500">•</span>
          <span>Dependents: <strong className="text-emerald-400">{hoveredFile.importedBy.length}</strong></span>
          <span className="text-slate-500">•</span>
          <span>Category: <strong className="capitalize text-amber-300">{hoveredFile.category}</strong></span>
        </div>
      )}
    </div>
  );
};
