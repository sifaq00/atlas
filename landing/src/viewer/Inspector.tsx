import React from 'react';
import { DependencyGraph, FileCategory, ImpactResult } from './types';
import { X, ExternalLink, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface InspectorProps {
  graph: DependencyGraph;
  activeFileId: string | null;
  impactResult: ImpactResult | null;
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
}

const CATEGORY_COLORS: Record<FileCategory, string> = {
  ui: '#38bdf8',
  service: '#a855f7',
  data: '#22c55e',
  util: '#f59e0b',
  config: '#94a3b8',
  other: '#64748b',
};

const RISK_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export const Inspector: React.FC<InspectorProps> = ({
  graph,
  activeFileId,
  impactResult,
  onClose,
  onSelectFile,
}) => {
  if (!activeFileId || !graph.nodes[activeFileId]) return null;

  const node = graph.nodes[activeFileId];
  const riskBadge = impactResult
    ? RISK_BADGES[impactResult.riskLevel] || RISK_BADGES.LOW
    : RISK_BADGES.LOW;

  const githubUrl = `https://github.com/${graph.rootPath}/blob/main/${node.relativePath}`;

  return (
    <div className="w-80 sm:w-96 h-full bg-slate-900/95 border-l border-white/10 flex flex-col backdrop-blur-xl shadow-2xl z-20 text-white overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[node.category] }}
            />
            <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-semibold">
              {node.category}
            </span>
          </div>
          <h3 className="font-mono text-base font-bold truncate text-white" title={node.name}>
            {node.name}
          </h3>
          <p className="font-mono text-[11px] text-slate-400 truncate mt-0.5" title={node.relativePath}>
            {node.relativePath}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="View on GitHub"
          >
            <ExternalLink size={16} />
          </a>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar text-xs">
        {/* Blast Radius / Risk Overview */}
        {impactResult && (
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">
                Blast Radius Risk
              </span>
              <span
                className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}
              >
                {impactResult.riskLevel} ({impactResult.riskScore}/100)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-base font-mono font-bold text-orange-400">
                  {impactResult.directDependentsCount}
                </div>
                <div className="text-[10px] text-slate-400">Direct</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-base font-mono font-bold text-orange-300">
                  {impactResult.indirectDependentsCount}
                </div>
                <div className="text-[10px] text-slate-400">Indirect</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="text-base font-mono font-bold text-sky-400">
                  {impactResult.maxDepth}
                </div>
                <div className="text-[10px] text-slate-400">Depth</div>
              </div>
            </div>

            {impactResult.hasCircularDependency && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-[11px]">
                <AlertTriangle size={14} className="shrink-0 text-red-400" />
                <span>Circular dependency detected in graph!</span>
              </div>
            )}
          </div>
        )}

        {/* Upstream Dependents (Who imports this file) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <ArrowUpRight size={14} className="text-orange-400" />
              Depended by ({node.importedBy.length})
            </span>
          </div>
          {node.importedBy.length === 0 ? (
            <p className="text-slate-500 italic py-1">No upstream files import this module (Leaf / Entry point).</p>
          ) : (
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
              {node.importedBy.map((importerId) => {
                const importer = graph.nodes[importerId];
                return (
                  <button
                    key={importerId}
                    onClick={() => onSelectFile(importerId)}
                    className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <span className="font-mono text-[11px] text-slate-300 group-hover:text-orange-300 truncate">
                      {importer ? importer.name : importerId}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {importer?.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Downstream Dependencies (Imports) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5">
              <ArrowDownRight size={14} className="text-sky-400" />
              Imports ({node.imports.length})
            </span>
          </div>
          {node.imports.length === 0 ? (
            <p className="text-slate-500 italic py-1">No internal file imports.</p>
          ) : (
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
              {node.imports.map((importId) => {
                const imported = graph.nodes[importId];
                return (
                  <button
                    key={importId}
                    onClick={() => onSelectFile(importId)}
                    className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-sky-500/10 hover:border-sky-500/30 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <span className="font-mono text-[11px] text-slate-300 group-hover:text-sky-300 truncate">
                      {imported ? imported.name : importId}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {imported?.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* External Packages */}
        {node.externalImports.length > 0 && (
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
              External Packages ({node.externalImports.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.externalImports.map((pkg) => (
                <span
                  key={pkg}
                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[10.5px]"
                >
                  {pkg}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Exports */}
        {node.exports.length > 0 && (
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
              Named Exports ({node.exports.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {node.exports.slice(0, 10).map((exp) => (
                <span
                  key={exp}
                  className="px-2 py-0.5 rounded-md bg-[#D9F65A]/10 border border-[#D9F65A]/20 text-[#D9F65A] font-mono text-[10px]"
                >
                  {exp}
                </span>
              ))}
              {node.exports.length > 10 && (
                <span className="text-[10px] text-slate-500 py-0.5">
                  +{node.exports.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
