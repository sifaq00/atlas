import React, { useState, useMemo } from 'react';
import { DependencyGraph } from './types';
import { CATEGORY_COLORS } from './GraphCanvas';
import { ImpactAnalyzer } from './blast';
import {
  Compass,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';

interface PathTracerDrawerProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  tracedPath: string[] | null;
  onTracePath: (path: string[] | null) => void;
  onSelectFile: (fileId: string) => void;
  onClose: () => void;
}

export const PathTracerDrawer: React.FC<PathTracerDrawerProps> = ({
  graph,
  activeFileId,
  tracedPath,
  onTracePath,
  onSelectFile,
  onClose,
}) => {
  const [sourceId, setSourceId] = useState<string>(activeFileId || '');
  const [targetId, setTargetId] = useState<string>('');

  const allFiles = useMemo(() => {
    if (!graph) return [];
    return Object.values(graph.nodes).sort((a, b) => a.name.localeCompare(b.name));
  }, [graph]);

  // Compute shortest path result
  const pathResult = useMemo(() => {
    if (!graph || !sourceId || !targetId) return null;
    return ImpactAnalyzer.findShortestPath(graph, sourceId, targetId);
  }, [graph, sourceId, targetId]);

  const handleSwap = () => {
    const temp = sourceId;
    setSourceId(targetId);
    setTargetId(temp);
  };

  const handleApplyTrace = () => {
    if (pathResult && pathResult.found) {
      onTracePath(pathResult.path);
    }
  };

  const handleClearTrace = () => {
    onTracePath(null);
  };

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl p-4 backdrop-blur-xl font-mono text-xs text-slate-200 animate-in fade-in slide-in-from-top-4 duration-200"
      data-lenis-prevent
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-[#D9F65A]" />
          <span className="font-bold text-white text-sm">Path Finder & Dependency Tracer</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
        {/* Source selector */}
        <div className="flex-1 w-full flex flex-col gap-1">
          <span className="text-[10.5px] text-slate-400">Source Module (Caller):</span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D9F65A]/50 font-mono cursor-pointer"
          >
            <option value="">-- Select Source File --</option>
            {allFiles.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.relativePath})
              </option>
            ))}
          </select>
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwap}
          className="p-2 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Swap Source & Target"
        >
          <ArrowLeftRight size={14} />
        </button>

        {/* Target selector */}
        <div className="flex-1 w-full flex flex-col gap-1">
          <span className="text-[10.5px] text-slate-400">Target Module (Callee):</span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D9F65A]/50 font-mono cursor-pointer"
          >
            <option value="">-- Select Target File --</option>
            {allFiles.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.relativePath})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Path Trace Result */}
      {pathResult && (
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-3">
          {pathResult.found ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 size={15} />
                  <span>Path Found ({pathResult.path.length - 1} hops)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyTrace}
                    className="px-3 py-1 bg-[#D9F65A] hover:bg-[#c8e64c] text-slate-950 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles size={13} />
                    <span>Highlight on Map</span>
                  </button>

                  {tracedPath && (
                    <button
                      onClick={handleClearTrace}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Clear Trace
                    </button>
                  )}
                </div>
              </div>

              {/* Breadcrumb Steps */}
              <div className="flex items-center gap-2 overflow-x-auto p-3 bg-slate-900/80 rounded-xl border border-white/10">
                {pathResult.path.map((nodeId, idx) => {
                  const node = graph?.nodes[nodeId];
                  const colors = node ? CATEGORY_COLORS[node.category] || CATEGORY_COLORS.other : CATEGORY_COLORS.other;

                  return (
                    <React.Fragment key={nodeId}>
                      <button
                        onClick={() => onSelectFile(nodeId)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
                        title={node?.relativePath}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: colors.bg }}
                        />
                        <span className="font-bold text-slate-200">{node?.name || nodeId}</span>
                        <span className="text-[10px] text-slate-500">#{idx + 1}</span>
                      </button>

                      {idx < pathResult.path.length - 1 && (
                        <ArrowRight size={13} className="text-[#D9F65A] shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
              <AlertCircle size={15} className="shrink-0" />
              <span>
                No dependency call path connects <strong>{sourceId}</strong> to <strong>{targetId}</strong>.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
