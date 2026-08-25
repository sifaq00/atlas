import React, { useState } from 'react';
import { DependencyGraph, FileCategory, ImpactResult } from './types';
import {
  X,
  ExternalLink,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Package,
  FileCode,
  Compass,
  Copy,
} from 'lucide-react';

interface InspectorProps {
  graph: DependencyGraph;
  activeFileId: string | null;
  impactResult: ImpactResult | null;
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
  onOpenPathTracer?: (sourceId: string) => void;
}

type Tab = 'blast' | 'deps' | 'overview';

const CATEGORY_COLORS: Record<FileCategory, string> = {
  ui: '#8b5cf6',
  service: '#06b6d4',
  data: '#f59e0b',
  util: '#10b981',
  config: '#64748b',
  other: '#71717a',
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
  onOpenPathTracer,
}) => {
  const [tab, setTab] = useState<Tab>('blast');

  if (!activeFileId || !graph.nodes[activeFileId]) return null;

  const node = graph.nodes[activeFileId];
  const riskBadge = impactResult
    ? RISK_BADGES[impactResult.riskLevel] || RISK_BADGES.LOW
    : RISK_BADGES.LOW;

  const githubUrl = `https://github.com/${graph.rootPath}/blob/main/${node.relativePath}`;

  return (
    <aside data-lenis-prevent className="w-80 sm:w-96 h-full max-h-full flex flex-col bg-slate-950/95 border-l border-white/10 shrink-0 z-20 text-white overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
      {/* 1. Header (Fixed height) */}
      <div className="p-3.5 border-b border-white/10 flex items-start justify-between gap-2 bg-black/20 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[node.category] }}
            />
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">
              {node.category}
            </span>
          </div>
          <h3 className="font-mono text-sm font-bold truncate text-white" title={node.name}>
            {node.name}
          </h3>
          <p className="font-mono text-[10.5px] text-slate-500 truncate mt-0.5" title={node.relativePath}>
            {node.relativePath}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onOpenPathTracer && (
            <button
              type="button"
              onClick={() => onOpenPathTracer(node.id)}
              className="p-1.5 text-[#D9F65A] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Find Shortest Path from here"
            >
              <Compass size={15} />
            </button>
          )}
          {graph.rootPath.includes('/') && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="View on GitHub"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Panel Tabs (Fixed height 40px) */}
      <div className="h-10 flex items-center border-b border-white/10 bg-black/40 text-[11px] font-mono shrink-0">
        <button
          type="button"
          onClick={() => setTab('blast')}
          className={`flex-1 h-full flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            tab === 'blast'
              ? 'border-orange-500 text-orange-400 font-bold bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap size={12} />
          <span>Blast Radius</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('deps')}
          className={`flex-1 h-full flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            tab === 'deps'
              ? 'border-sky-500 text-sky-400 font-bold bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package size={12} />
          <span>Dependencies</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`flex-1 h-full flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            tab === 'overview'
              ? 'border-[#D9F65A] text-[#D9F65A] font-bold bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode size={12} />
          <span>Info</span>
        </button>
      </div>

      {/* 3. Middle Scrollable Container */}
      <div
        className="flex-1 w-full overflow-y-auto overscroll-contain p-4 space-y-4 no-scrollbar text-xs"
        style={{
          height: 'calc(100vh - 156px)',
          maxHeight: 'calc(100vh - 156px)',
          overflowY: 'auto',
          touchAction: 'pan-y',
        }}
      >
        {/* Tab 1: Blast Radius */}
        {tab === 'blast' && impactResult && (
          <div className="space-y-4">
            {/* Risk Card */}
            <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-white/10 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">
                  Change Impact Risk
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}
                >
                  {impactResult.riskLevel} ({impactResult.riskScore}/100)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="text-lg font-mono font-bold text-orange-400">
                    {impactResult.directDependentsCount}
                  </div>
                  <div className="text-[10px] text-slate-400">Direct</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="text-lg font-mono font-bold text-orange-300">
                    {impactResult.indirectDependentsCount}
                  </div>
                  <div className="text-[10px] text-slate-400">Cascade</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="text-lg font-mono font-bold text-sky-400">
                    {impactResult.maxDepth}
                  </div>
                  <div className="text-[10px] text-slate-400">Max Depth</div>
                </div>
              </div>

              {/* Reasons */}
              {impactResult.riskReasons.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold">
                    Risk Factors:
                  </span>
                  {impactResult.riskReasons.map((reason, idx) => (
                    <div key={idx} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {impactResult.hasCircularDependency && (
                <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-[11px]">
                  <AlertTriangle size={14} className="shrink-0 text-red-400" />
                  <span>Circular dependency involves this module!</span>
                </div>
              )}
            </div>

            {/* Upstream Importers List */}
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5 mb-2">
                <ArrowUpRight size={14} className="text-orange-400" />
                Files that break if modified ({node.importedBy.length})
              </span>
              {node.importedBy.length === 0 ? (
                <p className="text-slate-500 italic py-1 text-[11px]">
                  Safe to change — no other modules import this file directly.
                </p>
              ) : (
                <div className="space-y-1">
                  {node.importedBy.map((importerId) => {
                    const importer = graph.nodes[importerId];
                    return (
                      <button
                        key={importerId}
                        type="button"
                        onClick={() => onSelectFile(importerId)}
                        className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 border border-transparent transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode size={13} className="text-orange-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="font-mono text-[11px] text-slate-300 group-hover:text-orange-300 truncate">
                            {importer ? importer.name : importerId}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {importer?.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Dependencies */}
        {tab === 'deps' && (
          <div className="space-y-4">
            {/* Internal Imports */}
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5 mb-2">
                <ArrowDownRight size={14} className="text-sky-400" />
                Internal Imports ({node.imports.length})
              </span>
              {node.imports.length === 0 ? (
                <p className="text-slate-500 italic py-1 text-[11px]">No internal dependencies imported.</p>
              ) : (
                <div className="space-y-1">
                  {node.imports.map((importId) => {
                    const imported = graph.nodes[importId];
                    return (
                      <button
                        key={importId}
                        type="button"
                        onClick={() => onSelectFile(importId)}
                        className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-sky-500/10 hover:border-sky-500/30 border border-transparent transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCode size={13} className="text-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="font-mono text-[11px] text-slate-300 group-hover:text-sky-300 truncate">
                            {imported ? imported.name : importId}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {imported?.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* External Packages */}
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-2">
                Third-Party Packages ({node.externalImports.length})
              </span>
              {node.externalImports.length === 0 ? (
                <p className="text-slate-500 italic py-1 text-[11px]">No third-party packages imported.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {node.externalImports.map((pkg) => (
                    <span
                      key={pkg}
                      className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px]"
                    >
                      {pkg}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Named Exports */}
            {node.exports.length > 0 && (
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold block mb-2">
                  Exports ({node.exports.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {node.exports.map((exp) => (
                    <span
                      key={exp}
                      className="px-2 py-0.5 rounded-md bg-[#D9F65A]/10 border border-[#D9F65A]/20 text-[#D9F65A] font-mono text-[10.5px]"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Code Statements Viewer */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                  Parsed Import Statements
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const text = [
                      ...node.externalImports.map((p) => `import '${p}';`),
                      ...node.imports.map((i) => `import '${i}';`),
                    ].join('\n');
                    navigator.clipboard.writeText(text);
                  }}
                  className="text-[10.5px] font-mono text-[#D9F65A] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Copy size={11} />
                  <span>Copy</span>
                </button>
              </div>

              <pre className="p-2.5 bg-slate-900/90 rounded-xl border border-white/10 text-[10.5px] font-mono text-sky-300/90 overflow-x-auto max-h-36 leading-relaxed shadow-inner select-text">
                {node.externalImports.length === 0 && node.imports.length === 0 ? (
                  <span className="text-slate-500 italic">// No import statements detected</span>
                ) : (
                  [
                    ...node.externalImports.map((p) => `import '${p}';`),
                    ...node.imports.map((i) => `import '${i}';`),
                  ].join('\n')
                )}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Overview / Info */}
        {tab === 'overview' && (
          <div className="space-y-3 font-mono text-xs">
            {/* Metadata Card */}
            <div className="bg-slate-900/80 rounded-xl p-3.5 border border-white/10 space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">File:</span>
                <span className="text-white font-bold truncate max-w-[190px]">{node.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Path:</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-300 text-[10.5px] truncate max-w-[150px]" title={node.relativePath}>
                    {node.relativePath}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(node.relativePath)}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Path"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Lines of Code:</span>
                <span className="text-white font-bold">{node.lineCount.toLocaleString()} lines</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">File Size:</span>
                <span className="text-white">{(node.sizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Architectural Layer:</span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white"
                  style={{ backgroundColor: CATEGORY_COLORS[node.category] || '#64748b' }}
                >
                  {node.category}
                </span>
              </div>
            </div>

            {/* Architecture Role Badges */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                Detected Module Roles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {node.metadata.isComponent && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10.5px]">
                    ⚛️ UI Component
                  </span>
                )}
                {node.metadata.isRoute && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10.5px]">
                    🛣️ Route Handler
                  </span>
                )}
                {node.metadata.isService && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10.5px]">
                    ⚙️ Service / API
                  </span>
                )}
                {node.metadata.isDatabase && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10.5px]">
                    💾 Data / Model
                  </span>
                )}
                {node.metadata.isTest && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10.5px]">
                    🧪 Test Suite
                  </span>
                )}
                {node.metadata.isConfig && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-500/15 border border-slate-500/30 text-slate-300 text-[10.5px]">
                    🔧 Config File
                  </span>
                )}
                {!node.metadata.isComponent &&
                  !node.metadata.isRoute &&
                  !node.metadata.isService &&
                  !node.metadata.isDatabase &&
                  !node.metadata.isTest &&
                  !node.metadata.isConfig && (
                    <span className="text-slate-500 italic text-[11px]">Standard module</span>
                  )}
              </div>
            </div>

            {/* Coupling & Instability Index (Martin's Metric) */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                Architecture Stability Index
              </span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-sm font-bold text-orange-400">{node.importedBy.length}</div>
                  <div className="text-[9.5px] text-slate-400">Fan-In (Dependents)</div>
                </div>
                <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="text-sm font-bold text-sky-400">{node.imports.length}</div>
                  <div className="text-[9.5px] text-slate-400">Fan-Out (Imports)</div>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Instability (I = Ce/Total):</span>
                <span className="font-bold text-[#D9F65A]">
                  {node.importedBy.length + node.imports.length > 0
                    ? (
                        node.imports.length /
                        (node.importedBy.length + node.imports.length)
                      ).toFixed(2)
                    : '0.00'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {node.importedBy.length > node.imports.length * 2
                  ? 'Core Foundation Module: Highly stable, changes must be made with extreme care.'
                  : node.imports.length > node.importedBy.length * 2
                  ? 'Leaf Module: Highly volatile, safe to refactor without breaking other systems.'
                  : 'Balanced Intermediate Component.'}
              </p>
            </div>

            {graph.rootPath.includes('/') && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center font-mono text-xs text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Open Source Code on GitHub</span>
              </a>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
