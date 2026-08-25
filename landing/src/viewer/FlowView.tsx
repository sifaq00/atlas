import React, { useMemo, useState } from 'react';
import { DependencyGraph, FileCategory, FileNode } from './types';
import { CATEGORY_COLORS } from './GraphCanvas';
import { GitBranch, Copy, Check, ArrowRight, Download, Terminal } from 'lucide-react';

interface FlowViewProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  onSelectFile: (fileId: string) => void;
}

export const FlowView: React.FC<FlowViewProps> = ({
  graph,
  activeFileId,
  selectedCategories,
  searchTerm,
  onSelectFile,
}) => {
  const [copied, setCopied] = useState(false);

  // Generate Mermaid Diagram Markdown
  const mermaidMarkdown = useMemo(() => {
    if (!graph || Object.keys(graph.nodes).length === 0) return '';

    const lines = ['flowchart TD'];
    lines.push('  %% Subgraph Layers');

    const visibleNodeIds = new Set(
      Object.values(graph.nodes)
        .filter((n) => {
          if (!selectedCategories.has(n.category)) return false;
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const matches = n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) || n.relativePath.toLowerCase().includes(q);
            if (!matches) return false;
          }
          return true;
        })
        .map((n) => n.id)
    );

    // Group by category subgraphs
    const categories: FileCategory[] = ['ui', 'service', 'data', 'util', 'config'];
    for (const cat of categories) {
      const catNodes = Object.values(graph.nodes).filter(
        (n) => n.category === cat && visibleNodeIds.has(n.id)
      );
      if (catNodes.length > 0) {
        lines.push(`  subgraph ${cat.toUpperCase()} ["${cat.toUpperCase()} Layer"]`);
        for (const node of catNodes) {
          const sanitizedId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
          lines.push(`    ${sanitizedId}["${node.name}"]`);
        }
        lines.push('  end');
      }
    }

    lines.push('  %% Connections');
    for (const edge of graph.edges) {
      if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
        const srcId = edge.source.replace(/[^a-zA-Z0-9_]/g, '_');
        const tgtId = edge.target.replace(/[^a-zA-Z0-9_]/g, '_');
        lines.push(`  ${srcId} --> ${tgtId}`);
      }
    }

    return lines.join('\n');
  }, [graph, selectedCategories, searchTerm]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(mermaidMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMermaid = () => {
    const blob = new Blob([mermaidMarkdown], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.download = `atlas-${graph?.repoName.replace('/', '-') || 'architecture'}.mmd`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Group nodes by Layer for Flow Preview
  const layerGroups = useMemo<Record<FileCategory, FileNode[]>>(() => {
    const groups: Record<FileCategory, FileNode[]> = {
      ui: [],
      service: [],
      data: [],
      util: [],
      config: [],
      other: [],
    };
    if (!graph) return groups;

    for (const node of Object.values(graph.nodes)) {
      if (!selectedCategories.has(node.category)) continue;
      if (searchTerm && !node.id.toLowerCase().includes(searchTerm.toLowerCase())) continue;
      if (groups[node.category]) groups[node.category].push(node);
    }
    return groups;
  }, [graph, selectedCategories, searchTerm]);

  return (
    <div className="w-full h-full bg-[#0B1420] p-4 sm:p-6 overflow-y-auto flex flex-col gap-6 select-none" data-lenis-prevent>
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
            <GitBranch size={16} className="text-[#D9F65A]" />
            <span>Architecture Flow & Mermaid Export</span>
          </div>
          <p className="text-slate-400 text-xs font-mono mt-0.5">
            Hierarchical top-down call stack and exportable GitHub/Notion Mermaid diagram
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied!' : 'Copy Mermaid'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMermaid}
            className="px-3 py-1.5 bg-[#D9F65A] hover:bg-[#c8e64c] text-[#1E2405] font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download size={13} />
            <span>Export .mmd</span>
          </button>
        </div>
      </div>

      {/* Layer Flow Columns */}
      <div className="flex flex-col gap-6">
        {(['ui', 'service', 'data', 'util', 'config'] as FileCategory[]).map((cat, idx) => {
          const files = layerGroups[cat] || [];
          if (files.length === 0) return null;
          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;

          return (
            <div key={cat} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: colors.bg }}
                />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  {cat} Layer ({files.length} modules)
                </span>
                {idx < 4 && <ArrowRight size={12} className="text-slate-600 rotate-90 ml-2" />}
              </div>

              <div className="flex flex-wrap gap-2.5 bg-slate-900/60 border border-white/10 rounded-2xl p-4">
                {files.map((file) => {
                  const isActive = activeFileId === file.id;

                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => onSelectFile(file.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#0284c7] border-[#38bdf8] text-white shadow-lg ring-2 ring-[#38bdf8]/50'
                          : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="truncate max-w-[180px]">{file.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({file.imports.length} ➔ {file.importedBy.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mermaid Markdown Code Box */}
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Terminal size={14} className="text-sky-400" />
          <span>Live Mermaid Diagram Source:</span>
        </div>
        <pre className="p-4 bg-slate-950 border border-white/10 rounded-xl text-[11px] font-mono text-sky-300/90 overflow-x-auto max-h-60 leading-relaxed shadow-inner">
          {mermaidMarkdown}
        </pre>
      </div>
    </div>
  );
};
