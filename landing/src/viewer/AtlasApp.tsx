import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DependencyGraph, FileCategory, ImpactResult, MainViewMode } from './types';
import { scanGitHubRepo, scanLocalFiles, ScanProgress } from './scanner';
import { ImpactAnalyzer } from './blast';
import { GraphCanvas } from './GraphCanvas';
import { Graph3DView } from './Graph3DView';
import { RadialView } from './RadialView';
import { TreemapView } from './TreemapView';
import { MatrixView } from './MatrixView';
import { FlowView } from './FlowView';
import { PathTracerDrawer } from './PathTracerDrawer';
import { QuickJumpModal } from './QuickJumpModal';
import { Sidebar } from './Sidebar';
import { Inspector } from './Inspector';
import {
  ArrowLeft,
  Play,
  Key,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Download,
  Share2,
  Check,
  FileJson,
  FileText,
  Layers,
  Grid,
  GitBranch,
  Network,
  Orbit,
  Box,
  Compass,
  Search,
  ChevronDown,
} from 'lucide-react';

interface AtlasAppProps {
  onBackToLanding: () => void;
}

export const AtlasApp: React.FC<AtlasAppProps> = ({ onBackToLanding }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const initialRepo = urlParams.get('repo') || '';

  const [repoInput, setRepoInput] = useState(initialRepo);
  const [githubToken, setGithubToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mainView, setMainView] = useState<MainViewMode>('graph');

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tracedPath, setTracedPath] = useState<string[] | null>(null);
  const [showPathTracer, setShowPathTracer] = useState(false);
  const [showQuickJump, setShowQuickJump] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<FileCategory>>(
    new Set(['ui', 'service', 'data', 'util', 'config', 'other'])
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K Quick Jump Keyboard Shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowQuickJump((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Scan repository
  const handleScan = async (repoToScan?: string, forceRefresh: boolean = false) => {
    const targetRepo = repoToScan || repoInput;
    if (!targetRepo.trim()) return;

    setIsLoading(true);
    setError(null);
    setActiveFileId(null);
    setSelectedFolder(null);
    setProgress({
      stage: 'fetching-tree',
      message: forceRefresh ? 'Reloading fresh files from GitHub...' : 'Connecting to GitHub API...',
      totalFiles: 0,
      processedFiles: 0,
      percentage: 5,
    });

    try {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('repo', targetRepo);
      window.history.pushState({}, '', newUrl.toString());

      const resultGraph = await scanGitHubRepo(
        targetRepo,
        githubToken || undefined,
        (p) => setProgress(p),
        forceRefresh
      );

      setGraph(resultGraph);
    } catch (err: any) {
      setError(err.message || 'Failed to scan repository.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  // Scan Local Folder
  const handleLocalFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);
    setActiveFileId(null);
    setProgress({
      stage: 'fetching-files',
      message: `Reading ${files.length} local files...`,
      totalFiles: files.length,
      processedFiles: 0,
      percentage: 20,
    });

    try {
      const fileList: Array<{ path: string; content: string; size: number }> = [];
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const file = files[i];
        const relPath = file.webkitRelativePath || file.name;
        const text = await file.text();
        fileList.push({
          path: relPath,
          content: text,
          size: file.size,
        });
      }

      const folderName = fileList[0]?.path.split('/')[0] || 'Local Project';
      setRepoInput(folderName);

      const resultGraph = await scanLocalFiles(fileList, folderName, (p) => setProgress(p));
      setGraph(resultGraph);
    } catch (err: any) {
      setError(err.message || 'Failed to scan local folder.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  useEffect(() => {
    if (initialRepo && initialRepo.trim()) {
      handleScan(initialRepo);
    }
  }, []);

  const impactResult: ImpactResult | null = useMemo(() => {
    if (!graph || !activeFileId) return null;
    return ImpactAnalyzer.analyze(graph, activeFileId);
  }, [graph, activeFileId]);

  const toggleCategory = (cat: FileCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleOpenInGitHub = (fileId: string) => {
    if (!graph) return;
    if (graph.rootPath.includes('/')) {
      const url = `https://github.com/${graph.rootPath}/blob/main/${fileId}`;
      window.open(url, '_blank');
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Export JSON Report
  const handleExportJSON = () => {
    if (!graph) return;
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-report-${graph.repoName.replace('/', '-')}.json`;
    a.click();
    setShowExportMenu(false);
  };

  // Export Markdown Report
  const handleExportMarkdown = () => {
    if (!graph) return;
    const md = `# Architecture Report: ${graph.repoName}
- Scanned At: ${new Date(graph.scannedAt).toLocaleString()}
- Health Grade: **${graph.health.grade}** (${graph.health.score}/100)
- Total Files: ${graph.totalFiles}
- Total Dependencies: ${graph.totalDependencies}
- Total Lines of Code: ${graph.health.totalLines.toLocaleString()}

## Key Entry Points (Start Here)
${Object.values(graph.nodes)
  .sort((a, b) => b.importedBy.length - a.importedBy.length)
  .slice(0, 8)
  .map((n, i) => `${i + 1}. \`${n.relativePath}\` — ${n.importedBy.length} dependents (${n.category})`)
  .join('\n')}

## Architecture Issues (${graph.health.issues.length})
${graph.health.issues.map((issue) => `- **[${issue.severity.toUpperCase()}] ${issue.title}**: ${issue.description}`).join('\n')}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-report-${graph.repoName.replace('/', '-')}.md`;
    a.click();
    setShowExportMenu(false);
  };

  return (
    <div data-lenis-prevent className="w-screen h-screen bg-[#0B1420] flex flex-col overflow-hidden text-white font-sans">
      {/* Hidden File Input for Folder Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLocalFolderSelect}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />

      {/* Top Navigation / Toolbar */}
      <header className="h-14 bg-slate-950/95 border-b border-white/10 px-3 sm:px-4 flex items-center justify-between gap-3 z-30 shrink-0 backdrop-blur-xl">
        {/* Left: Brand & Back */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onBackToLanding}
            className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/10 rounded-lg transition-all border border-white/10 cursor-pointer"
            title="Back to Landing Page"
          >
            <ArrowLeft size={15} />
          </button>

          <a href="#" onClick={(e) => { e.preventDefault(); onBackToLanding(); }} className="flex items-center gap-2">
            <img src="/icon.webp" alt="Atlas" className="w-6 h-6 object-contain" />
            <img
              src="/atlasss.webp"
              alt="Atlas"
              className="h-4 object-contain hidden md:block"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </a>
        </div>

        {/* Center: Codeflow-style Unified Repo Input Bar */}
        <div className="flex-1 min-w-0 max-w-2xl mx-auto flex items-center gap-2 px-1 sm:px-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScan();
            }}
            className="flex-1 min-w-0 h-9 flex items-center bg-slate-900/90 border border-white/15 focus-within:border-sky-500/80 focus-within:ring-1 focus-within:ring-sky-500/30 rounded-lg overflow-hidden transition-all shadow-sm"
          >
            {/* GitHub logo addon */}
            <div className="h-full px-2.5 sm:px-3 bg-white/[0.03] border-r border-white/10 flex items-center justify-center text-slate-400 select-none shrink-0">
              <svg className="w-4 h-4 fill-current text-slate-400" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>

            {/* Main Input */}
            <input
              type="text"
              value={repoInput}
              onChange={(e) => {
                const val = e.target.value.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
                setRepoInput(val);
              }}
              placeholder="owner/repo"
              disabled={isLoading}
              className="flex-1 min-w-0 h-full bg-transparent px-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            />

            {/* Seamless Attached Action Button */}
            <button
              type="submit"
              disabled={isLoading || !repoInput.trim()}
              className="h-full px-3 sm:px-4 bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 disabled:pointer-events-none text-xs font-mono font-semibold tracking-wide flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border-l border-sky-400/30 whitespace-nowrap select-none"
            >
              {isLoading ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Play size={10} className="fill-current" />
              )}
              <span>{isLoading ? 'Scanning...' : 'Visualize'}</span>
            </button>
          </form>

          {/* Open Local Folder (Offline) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-2.5 bg-slate-900/90 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all shrink-0 cursor-pointer whitespace-nowrap"
            title="Analyze Local Project Folder (100% offline in browser)"
          >
            <FolderOpen size={13} className="text-sky-400 shrink-0" />
            <span className="hidden xl:inline">Local Folder</span>
          </button>

          {/* Reload / Re-scan from GitHub */}
          {graph && (
            <button
              type="button"
              onClick={() => handleScan(repoInput, true)}
              disabled={isLoading}
              className="h-9 px-2.5 bg-slate-900/90 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all shrink-0 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              title="Re-scan and fetch fresh latest code from GitHub (Bypasses Cache)"
            >
              <RefreshCw size={13} className={`text-[#D9F65A] shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">Reload</span>
            </button>
          )}

          {/* Token Modal Toggle */}
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className={`h-9 w-9 rounded-lg border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
              githubToken
                ? 'bg-[#D9F65A]/10 border-[#D9F65A]/30 text-[#D9F65A]'
                : 'bg-slate-900/90 border-white/15 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="GitHub Personal Access Token"
          >
            <Key size={13} />
          </button>
        </div>

        {/* Right: View Mode Selector & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Jump Search Button */}
          {graph && (
            <button
              type="button"
              onClick={() => setShowQuickJump(true)}
              className="h-9 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center gap-2 cursor-pointer shadow-sm"
              title="Quick Module Search (Ctrl+K)"
            >
              <Search size={13} className="text-slate-400" />
              <span className="hidden lg:inline text-slate-400">Search</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 bg-white/10 text-[10px] rounded text-slate-400 border border-white/15 font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Path Tracer Toggle Button */}
          {graph && (
            <button
              type="button"
              onClick={() => setShowPathTracer(!showPathTracer)}
              className={`h-9 px-3 rounded-lg border text-xs font-mono flex items-center gap-2 cursor-pointer shadow-sm transition-all ${
                showPathTracer || tracedPath
                  ? 'bg-[#D9F65A]/20 border-[#D9F65A]/50 text-[#D9F65A] font-bold'
                  : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
              }`}
              title="Trace Dependency Path Between Modules"
            >
              <Compass size={13} className={showPathTracer || tracedPath ? 'text-[#D9F65A]' : 'text-slate-400'} />
              <span className="hidden md:inline">Trace Path</span>
              {tracedPath && (
                <span className="px-1.5 py-0.2 bg-[#D9F65A] text-slate-950 rounded text-[9px] font-bold">
                  {tracedPath.length}
                </span>
              )}
            </button>
          )}

          {/* View Mode Dropdown */}
          {graph && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowViewMenu(!showViewMenu);
                  setShowExportMenu(false);
                }}
                className="h-9 px-3 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-mono flex items-center gap-2 cursor-pointer shadow-sm"
                title="Change Visualization View"
              >
                {mainView === 'graph' && <Network size={13} className="text-[#D9F65A]" />}
                {mainView === '3d' && <Box size={13} className="text-cyan-400" />}
                {mainView === 'radial' && <Orbit size={13} className="text-purple-400" />}
                {mainView === 'treemap' && <Layers size={13} className="text-amber-400" />}
                {mainView === 'matrix' && <Grid size={13} className="text-sky-400" />}
                {mainView === 'flow' && <GitBranch size={13} className="text-emerald-400" />}

                <span className="capitalize font-semibold hidden sm:inline">
                  {mainView === 'graph' && 'Graph View (2D)'}
                  {mainView === '3d' && '3D Space Graph'}
                  {mainView === 'radial' && 'Radial Orbit'}
                  {mainView === 'treemap' && 'Treemap View'}
                  {mainView === 'matrix' && 'Matrix View'}
                  {mainView === 'flow' && 'Flow View'}
                </span>

                <ChevronDown
                  size={13}
                  className={`text-slate-400 transition-transform duration-200 ${
                    showViewMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showViewMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono space-y-0.5 backdrop-blur-xl animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setMainView('graph');
                      setShowViewMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      mainView === 'graph'
                        ? 'bg-[#D9F65A]/15 text-[#D9F65A] font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <Network size={14} className="text-[#D9F65A] shrink-0" />
                    <div className="flex flex-col">
                      <span>Graph (2D Physics)</span>
                      <span className="text-[10px] text-slate-500 font-sans">Interactive animated node map</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMainView('3d');
                      setShowViewMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      mainView === '3d'
                        ? 'bg-cyan-400/15 text-cyan-300 font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <Box size={14} className="text-cyan-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>3D Space Graph</span>
                      <span className="text-[10px] text-slate-500 font-sans">WebGL 360° space orbit</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMainView('radial');
                      setShowViewMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      mainView === 'radial'
                        ? 'bg-purple-400/15 text-purple-300 font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <Orbit size={14} className="text-purple-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>Radial Orbit (Tier Rings)</span>
                      <span className="text-[10px] text-slate-500 font-sans">Concentric architectural orbit</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMainView('treemap');
                      setShowViewMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      mainView === 'treemap'
                        ? 'bg-amber-400/15 text-amber-300 font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <Layers size={14} className="text-amber-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>Treemap (Density)</span>
                      <span className="text-[10px] text-slate-500 font-sans">File size & complexity blocks</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMainView('matrix');
                      setShowViewMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      mainView === 'matrix'
                        ? 'bg-sky-400/15 text-sky-300 font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <Grid size={14} className="text-sky-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>Dependency Matrix</span>
                      <span className="text-[10px] text-slate-500 font-sans">Caller vs callee coupling grid</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMainView('flow');
                      setShowViewMenu(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer ${
                      mainView === 'flow'
                        ? 'bg-emerald-400/15 text-emerald-300 font-bold'
                        : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <GitBranch size={14} className="text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>Flowchart & Mermaid</span>
                      <span className="text-[10px] text-slate-500 font-sans">Top-down stack & export .mmd</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Share */}
          <button
            type="button"
            onClick={handleShareLink}
            className="h-9 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            title="Copy shareable link"
          >
            {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
            <span className="hidden xl:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowViewMenu(false);
              }}
              className="h-9 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              title="Export Report"
            >
              <Download size={13} className="text-[#D9F65A]" />
              <span className="hidden xl:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/15 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono space-y-0.5 animate-in fade-in zoom-in-95">
                <button
                  onClick={handleExportJSON}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/10 text-slate-200 flex items-center gap-2 transition-colors"
                >
                  <FileJson size={14} className="text-amber-400" />
                  <span>JSON Report</span>
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/10 text-slate-200 flex items-center gap-2 transition-colors"
                >
                  <FileText size={14} className="text-sky-400" />
                  <span>Markdown Summary</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* GitHub Token Input Drawer */}
      {showTokenInput && (
        <div className="bg-slate-950/95 border-b border-white/10 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-300 z-20">
          <div className="flex items-center gap-2 max-w-xl w-full">
            <Key size={14} className="text-[#D9F65A] shrink-0" />
            <span className="text-slate-400 shrink-0">GitHub Token:</span>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_... (Increases GitHub API rate limit from 60 to 5000 req/hr)"
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#D9F65A]/50"
            />
          </div>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            Stored only in your browser memory
          </span>
        </div>
      )}

      {/* Loading Progress Bar */}
      {isLoading && progress && (
        <div className="bg-slate-950 border-b border-[#D9F65A]/20 px-4 py-2.5 z-30 flex flex-col gap-1.5 shadow-lg">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <RefreshCw size={13} className="animate-spin text-[#D9F65A]" />
              <span>{progress.message}</span>
            </div>
            <span className="text-[#D9F65A] font-bold">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#D9F65A] h-full transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(217,246,90,0.6)]"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !isLoading && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 text-red-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => handleScan()}
            className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <main
        className="flex-1 w-full flex overflow-hidden relative"
        style={{ height: 'calc(100vh - 56px)', maxHeight: 'calc(100vh - 56px)' }}
      >
        {graph && (
          <>
            {/* Left Sidebar (Files, Start Here, Health) */}
            <Sidebar
              graph={graph}
              activeFileId={activeFileId}
              selectedFolder={selectedFolder}
              selectedCategories={selectedCategories}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onToggleCategory={toggleCategory}
              onSelectFile={(id) => setActiveFileId(id)}
              onSelectFolder={(folder) => setSelectedFolder(folder)}
            />

            {/* Center Dynamic Workspace View */}
            <div
              className="flex-1 h-full relative"
              onClick={() => {
                setShowExportMenu(false);
                setShowViewMenu(false);
              }}
            >
              {mainView === 'graph' && (
                <GraphCanvas
                  graph={graph}
                  activeFileId={activeFileId}
                  selectedFolder={selectedFolder}
                  impactResult={impactResult}
                  selectedCategories={selectedCategories}
                  searchTerm={searchTerm}
                  viewMode="full"
                  tracedPath={tracedPath}
                  onSelectFile={(id) => setActiveFileId(id)}
                  onClearFolder={() => setSelectedFolder(null)}
                  onOpenInGitHub={handleOpenInGitHub}
                />
              )}

              {/* Path Tracer Floating Drawer */}
              {showPathTracer && (
                <PathTracerDrawer
                  graph={graph}
                  activeFileId={activeFileId}
                  tracedPath={tracedPath}
                  onTracePath={(path) => setTracedPath(path)}
                  onSelectFile={(id) => setActiveFileId(id)}
                  onClose={() => setShowPathTracer(false)}
                />
              )}

              {mainView === '3d' && (
                <Graph3DView
                  graph={graph}
                  activeFileId={activeFileId}
                  selectedCategories={selectedCategories}
                  searchTerm={searchTerm}
                  impactResult={impactResult}
                  onSelectFile={(id) => setActiveFileId(id)}
                />
              )}

              {mainView === 'radial' && (
                <RadialView
                  graph={graph}
                  activeFileId={activeFileId}
                  selectedCategories={selectedCategories}
                  searchTerm={searchTerm}
                  onSelectFile={(id) => setActiveFileId(id)}
                />
              )}

              {mainView === 'treemap' && (
                <TreemapView
                  graph={graph}
                  activeFileId={activeFileId}
                  selectedCategories={selectedCategories}
                  searchTerm={searchTerm}
                  onSelectFile={(id) => setActiveFileId(id)}
                />
              )}

              {mainView === 'matrix' && (
                <MatrixView
                  graph={graph}
                  activeFileId={activeFileId}
                  selectedCategories={selectedCategories}
                  searchTerm={searchTerm}
                  onSelectFile={(id) => setActiveFileId(id)}
                />
              )}

              {mainView === 'flow' && (
                <FlowView
                  graph={graph}
                  activeFileId={activeFileId}
                  selectedCategories={selectedCategories}
                  searchTerm={searchTerm}
                  onSelectFile={(id) => setActiveFileId(id)}
                />
              )}
            </div>

            {/* Right Inspector */}
            {activeFileId && (
              <Inspector
                graph={graph}
                activeFileId={activeFileId}
                impactResult={impactResult}
                onClose={() => setActiveFileId(null)}
                onSelectFile={(id) => setActiveFileId(id)}
                onOpenPathTracer={(fileId) => {
                  setTracedPath(null);
                  setShowPathTracer(true);
                  setActiveFileId(fileId);
                }}
              />
            )}
          </>
        )}

        {!graph && !isLoading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-6 max-w-xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-[#D9F65A]/10 rounded-full blur-xl -z-10 scale-150" />
              <img src="/icon.webp" alt="Atlas" className="w-16 h-16 object-contain" />
            </div>

            <div>
              <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
                Map Codebase Architecture
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 font-sans leading-relaxed">
                Paste any public GitHub repository or scan a local folder to visualize dependencies, blast radius, and modules in 2D & 3D.
              </p>
            </div>

            {/* Quick Sample Presets */}
            <div className="w-full bg-slate-900/80 rounded-2xl p-4 border border-white/10 space-y-3">
              <span className="text-[10.5px] uppercase font-mono text-slate-400 tracking-wider font-semibold block">
                Try Sample Repositories:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'React', repo: 'facebook/react', tag: 'UI Library' },
                  { name: 'Next.js', repo: 'vercel/next.js', tag: 'Framework' },
                  { name: 'Tailwind', repo: 'tailwindlabs/tailwindcss', tag: 'CSS' },
                  { name: 'Express', repo: 'expressjs/express', tag: 'Backend' },
                  { name: 'Zustand', repo: 'pmndrs/zustand', tag: 'State' },
                  { name: 'Atlas', repo: 'sifaq00/atlas', tag: 'This Repo' },
                ].map((item) => (
                  <button
                    key={item.repo}
                    type="button"
                    onClick={() => {
                      setRepoInput(item.repo);
                      handleScan(item.repo);
                    }}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-[#D9F65A]/10 border border-white/10 hover:border-[#D9F65A]/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="font-mono text-xs font-bold text-slate-200 group-hover:text-[#D9F65A] truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {item.tag}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Or Local Folder */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-mono">or</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 hover:text-white rounded-xl text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <FolderOpen size={14} className="text-sky-400" />
                <span>Open Local Folder (100% Offline)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Global Quick Jump Search Command Palette (Ctrl+K) */}
      <QuickJumpModal
        graph={graph}
        isOpen={showQuickJump}
        onClose={() => setShowQuickJump(false)}
        onSelectFile={(fileId) => {
          setActiveFileId(fileId);
          setShowQuickJump(false);
        }}
      />
    </div>
  );
};
