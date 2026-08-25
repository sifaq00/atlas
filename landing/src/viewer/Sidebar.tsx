import React, { useState, useMemo, useEffect } from 'react';
import { DependencyGraph, FileCategory, FileNode } from './types';
import {
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  FileCode2,
  GitFork,
  CheckCircle2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  File,
} from 'lucide-react';

interface SidebarProps {
  graph: DependencyGraph;
  activeFileId: string | null;
  selectedFolder: string | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onToggleCategory: (cat: FileCategory) => void;
  onSelectFile: (fileId: string) => void;
  onSelectFolder: (folderPath: string | null) => void;
}

type TabType = 'health' | 'explore' | 'starthere';

const CATEGORIES: Array<{ key: FileCategory; label: string; color: string }> = [
  { key: 'ui', label: 'UI', color: '#8b5cf6' },
  { key: 'service', label: 'Service', color: '#06b6d4' },
  { key: 'data', label: 'Data', color: '#f59e0b' },
  { key: 'util', label: 'Util', color: '#10b981' },
  { key: 'config', label: 'Config', color: '#64748b' },
];

const CATEGORY_COLORS: Record<FileCategory, string> = {
  ui: '#8b5cf6',
  service: '#06b6d4',
  data: '#f59e0b',
  util: '#10b981',
  config: '#64748b',
  other: '#71717a',
};

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  fileNode?: FileNode;
  children: Record<string, TreeNode>;
}

function countTotalFilesInFolder(node: TreeNode): number {
  if (!node.isFolder) return 1;
  let count = 0;
  for (const child of Object.values(node.children)) {
    count += countTotalFilesInFolder(child);
  }
  return count;
}

export const Sidebar: React.FC<SidebarProps> = ({
  graph,
  activeFileId,
  selectedFolder,
  selectedCategories,
  searchTerm,
  onSearchChange,
  onToggleCategory,
  onSelectFile,
  onSelectFolder,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('health');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Auto-expand parent folders of selected file
  useEffect(() => {
    if (!activeFileId) return;
    const parts = activeFileId.split('/');
    if (parts.length <= 1) return;

    setExpandedFolders((prev) => {
      const next = new Set(prev);
      for (let i = 1; i < parts.length; i++) {
        next.add(parts.slice(0, i).join('/'));
      }
      return next;
    });
  }, [activeFileId]);

  // Compute "Start Here" top entry points
  const startHereList = useMemo(() => {
    const list = Object.values(graph.nodes).map((node) => {
      let score = node.importedBy.length * 3;
      const lower = node.relativePath.toLowerCase();
      if (lower.includes('app.') || lower.includes('main.') || lower.includes('index.')) score += 10;
      if (lower.includes('router') || lower.includes('routes')) score += 8;
      if (node.category === 'data' || node.category === 'service') score += 5;
      return { node, score };
    });

    list.sort((a, b) => b.score - a.score);
    return list.slice(0, 8).map((item) => item.node);
  }, [graph]);

  // Filtered files list
  const filteredFiles = useMemo(() => {
    return Object.values(graph.nodes)
      .filter((n) => selectedCategories.has(n.category))
      .filter((n) => !searchTerm || n.relativePath.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [graph, selectedCategories, searchTerm]);

  // Build folder hierarchy tree from filtered files
  const fileTree = useMemo(() => {
    const root: TreeNode = {
      name: 'root',
      fullPath: '',
      isFolder: true,
      children: {},
    };

    for (const node of filteredFiles) {
      const parts = node.relativePath.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullPath: currentPath,
            isFolder: !isFile,
            fileNode: isFile ? node : undefined,
            children: {},
          };
        }
        current = current.children[part];
      }
    }

    return root;
  }, [filteredFiles]);

  const isFolderOpen = (path: string) => {
    if (searchTerm.trim().length > 0) return true; // Auto-expand on search
    return expandedFolders.has(path);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const health = graph.health;

  // Recursive Tree Renderer (Folders Collapsed by Default like Codeflow)
  const renderTree = (node: TreeNode, depth = 0) => {
    const entries = Object.values(node.children).sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="space-y-0.5">
        {entries.map((item) => {
          if (item.isFolder) {
            const isOpen = isFolderOpen(item.fullPath);
            const isSelected = selectedFolder === item.fullPath;
            const totalFiles = countTotalFilesInFolder(item);

            return (
              <div key={item.fullPath}>
                <div
                  style={{ paddingLeft: `${Math.max(6, depth * 14 + 6)}px` }}
                  className={`w-full text-left py-1.5 pr-2 rounded text-xs font-mono transition-all flex items-center gap-1.5 group cursor-pointer ${
                    isSelected
                      ? 'bg-[#D9F65A]/15 border border-[#D9F65A]/40 text-[#D9F65A] font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                  onClick={() => {
                    onSelectFolder(isSelected ? null : item.fullPath);
                    if (!isOpen) {
                      setExpandedFolders((prev) => new Set(prev).add(item.fullPath));
                    }
                  }}
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(item.fullPath);
                    }}
                    className="text-slate-500 hover:text-white p-0.5 rounded cursor-pointer shrink-0"
                    title={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </span>
                  <span className={isSelected ? 'text-[#D9F65A]' : 'text-amber-400/90'}>
                    {isOpen ? <FolderOpen size={13} /> : <Folder size={13} />}
                  </span>
                  <span className={`font-semibold text-[11px] truncate flex-1 ${isSelected ? 'text-[#D9F65A]' : 'text-slate-300 group-hover:text-white'}`}>
                    {item.name}
                  </span>
                  <span className={`text-[9.5px] font-mono ${isSelected ? 'text-[#D9F65A]/80' : 'text-slate-500'}`}>
                    {totalFiles}
                  </span>
                </div>

                {isOpen && (
                  <div className="border-l border-white/10 ml-3">
                    {renderTree(item, depth + 1)}
                  </div>
                )}
              </div>
            );
          }

          // File item
          const file = item.fileNode!;
          const isActive = activeFileId === file.id;

          return (
            <button
              key={file.id}
              type="button"
              onClick={() => onSelectFile(file.id)}
              style={{ paddingLeft: `${Math.max(6, depth * 14 + 6)}px` }}
              className={`w-full text-left py-1.5 pr-2 rounded text-xs font-mono transition-all flex items-center justify-between group cursor-pointer ${
                isActive
                  ? 'bg-[#D9F65A]/15 border border-[#D9F65A]/30 text-[#D9F65A] font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[file.category] }}
                />
                <File size={12} className="text-slate-500 shrink-0" />
                <span className="truncate text-[11px]">{file.name}</span>
              </div>
              <span className="text-[9px] text-slate-500 group-hover:text-slate-400 shrink-0 font-mono">
                {file.importedBy.length > 0 ? `${file.importedBy.length} deps` : `${file.lineCount}L`}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside
      data-lenis-prevent
      className="w-72 sm:w-80 h-full max-h-full flex flex-col bg-slate-950/95 border-r border-white/10 shrink-0 z-20 text-white overflow-hidden"
    >
      {/* 1. Top Tab Bar (Fixed height 40px) */}
      <div className="h-10 flex items-center border-b border-white/10 bg-black/20 text-xs font-mono shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`flex-1 h-full flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            activeTab === 'health'
              ? 'border-[#D9F65A] text-[#D9F65A] font-bold bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity size={13} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          className={`flex-1 h-full flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            activeTab === 'explore'
              ? 'border-[#D9F65A] text-[#D9F65A] font-bold bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={13} />
          <span>Files</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('starthere')}
          className={`flex-1 h-full flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
            activeTab === 'starthere'
              ? 'border-[#D9F65A] text-[#D9F65A] font-bold bg-white/[0.04]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles size={13} />
          <span>Start Here</span>
        </button>
      </div>

      {/* 2. Middle Scrollable Container */}
      <div
        data-lenis-prevent
        className="flex-1 w-full overflow-y-auto overscroll-contain no-scrollbar"
        style={{
          height: 'calc(100vh - 132px)',
          maxHeight: 'calc(100vh - 132px)',
          overflowY: 'auto',
          touchAction: 'pan-y',
        }}
      >
        {/* Tab 1: Overview & Health Score */}
        {activeTab === 'health' && (
          <div className="p-3 space-y-3 text-xs">
            {/* Health Score Banner */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/15 rounded-2xl flex items-center justify-between shadow-xl">
              <div>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Architecture Health
                </span>
                <div className="text-3xl font-mono font-extrabold text-[#D9F65A] mt-1">
                  {health.grade}
                </div>
                <span className="text-slate-400 text-[11px] font-mono">
                  Score: {health.score}/100
                </span>
              </div>
              <div className="text-right font-mono text-[11px] space-y-1 text-slate-300">
                <div className="flex items-center justify-end gap-1.5">
                  <FileCode2 size={12} className="text-sky-400" />
                  <span>{health.totalLines.toLocaleString()} Lines</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <GitFork size={12} className="text-amber-400" />
                  <span>{graph.totalDependencies} Connections</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <CheckCircle2 size={12} className="text-[#D9F65A]" />
                  <span>{graph.totalFiles} Files</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 font-mono text-center">
              <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-base font-bold text-amber-400">{health.circularCyclesCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Circular Cycles</div>
              </div>
              <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-base font-bold text-sky-400">{health.orphanCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Orphan Files</div>
              </div>
            </div>

            {/* Architecture Issues List */}
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} className="text-amber-400" />
                Detected Issues ({health.issues.length})
              </span>

            {health.issues.length === 0 ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 flex items-center gap-2 text-xs">
                <ShieldCheck size={16} />
                <span>Zero major architecture issues detected! Clean codebase.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {health.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-amber-300">
                        {issue.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10.5px] leading-relaxed">
                      {issue.description}
                    </p>
                    {issue.fileIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {issue.fileIds.map((fId) => (
                          <button
                            key={fId}
                            type="button"
                            onClick={() => onSelectFile(fId)}
                            className="px-1.5 py-0.5 bg-white/5 hover:bg-white/15 text-slate-300 font-mono text-[9.5px] rounded border border-white/10 transition-colors cursor-pointer"
                          >
                            {fId.split('/').pop()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Tab 2: Clean Folder Tree View (Collapsed by Default like Codeflow) */}
        {activeTab === 'explore' && (
          <div className="flex flex-col">
            {/* Search Bar - Sticky */}
            <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md p-3 border-b border-white/10">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search files or folders..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D9F65A]/50 focus:ring-1 focus:ring-[#D9F65A]/50 font-mono transition-all"
                />
              </div>
            </div>

            {/* Category Filter Pills - Sticky */}
            <div className="sticky top-[53px] z-10 bg-slate-950/95 backdrop-blur-md px-3 py-2 border-b border-white/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                  <Filter size={11} /> Filter Layers
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {filteredFiles.length} files
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.has(cat.key);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => onToggleCategory(cat.key)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/10 border-white/20 text-white font-semibold shadow-sm'
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

              {/* Quick Preset Tags (Codeflow style) */}
              <div className="flex items-center gap-1 pt-1.5 mt-1 border-t border-white/5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => onSearchChange(searchTerm === '.test' || searchTerm === '.spec' ? '' : '.test')}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono shrink-0 transition-colors cursor-pointer ${
                    searchTerm.includes('test') || searchTerm.includes('spec')
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  🧪 Tests
                </button>
                <button
                  type="button"
                  onClick={() => onSearchChange(searchTerm === 'page' || searchTerm === 'route' ? '' : 'page')}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono shrink-0 transition-colors cursor-pointer ${
                    searchTerm.includes('page') || searchTerm.includes('route')
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  🛣️ Routes
                </button>
                <button
                  type="button"
                  onClick={() => onSearchChange(searchTerm === 'api' || searchTerm === 'client' ? '' : 'api')}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono shrink-0 transition-colors cursor-pointer ${
                    searchTerm.includes('api') || searchTerm.includes('client')
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  ⚙️ API
                </button>
              </div>
            </div>

            {/* Folder Hierarchy Tree List */}
            <div className="p-2">
              {renderTree(fileTree)}
            </div>
          </div>
        )}

        {/* Tab 3: Start Here */}
        {activeTab === 'starthere' && (
          <div className="p-3 space-y-3">
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs space-y-1">
              <div className="font-mono font-bold text-sky-300 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Onboarding Path</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                These key files have the highest centrality in the codebase. Read these first to understand how data flows.
              </p>
            </div>

            <div className="space-y-1.5">
              {startHereList.map((node, index) => {
                const isActive = activeFileId === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onSelectFile(node.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 group cursor-pointer ${
                      isActive
                        ? 'bg-[#D9F65A]/15 border-[#D9F65A]/40 text-[#D9F65A]'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white/10 text-slate-300 font-mono text-[10px] flex items-center justify-center shrink-0 font-bold mt-0.5">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-bold truncate">{node.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 truncate mt-0.5">
                        {node.relativePath}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[9.5px] font-mono text-slate-400">
                        <span className="capitalize text-sky-400">{node.category}</span>
                        <span>•</span>
                        <span>{node.importedBy.length} dependents</span>
                        <span>•</span>
                        <span>{node.lineCount}L</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Footer (Fixed height 36px) */}
      <div className="h-9 p-3 border-t border-white/10 bg-black/30 text-[10.5px] font-mono text-slate-400 flex items-center justify-between shrink-0">
        <span>{graph.totalFiles} files</span>
        <span>{graph.totalDependencies} connections</span>
        <span className="text-[#D9F65A] font-bold">Grade {health.grade}</span>
      </div>
    </aside>
  );
};
