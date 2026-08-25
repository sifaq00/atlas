import React, { useState, useEffect, useMemo } from 'react';
import { DependencyGraph, FileCategory, ImpactResult } from './types';
import { scanGitHubRepo, ScanProgress } from './scanner';
import { ImpactAnalyzer } from './blast';
import { GraphCanvas } from './GraphCanvas';
import { Sidebar } from './Sidebar';
import { Inspector } from './Inspector';
import {
  ArrowLeft,
  Play,
  Key,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface AtlasAppProps {
  onBackToLanding: () => void;
}

const PRESET_REPOS = [
  { name: 'Atlas (This Repo)', repo: 'sifaq00/atlas' },
  { name: 'Zustand', repo: 'pmndrs/zustand' },
  { name: 'Lucide React', repo: 'lucide-icons/lucide' },
  { name: 'Preact', repo: 'preactjs/preact' },
];

export const AtlasApp: React.FC<AtlasAppProps> = ({ onBackToLanding }) => {
  // Read initial repo from URL query ?repo=...
  const urlParams = new URLSearchParams(window.location.search);
  const initialRepo = urlParams.get('repo') || 'sifaq00/atlas';

  const [repoInput, setRepoInput] = useState(initialRepo);
  const [githubToken, setGithubToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<FileCategory>>(
    new Set(['ui', 'service', 'data', 'util', 'config', 'other'])
  );

  // Scan repository
  const handleScan = async (repoToScan?: string) => {
    const targetRepo = repoToScan || repoInput;
    if (!targetRepo.trim()) return;

    setIsLoading(true);
    setError(null);
    setActiveFileId(null);
    setProgress({
      stage: 'fetching-tree',
      message: 'Initializing scan...',
      totalFiles: 0,
      processedFiles: 0,
      percentage: 5,
    });

    try {
      // Update URL query param without full reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('repo', targetRepo);
      window.history.pushState({}, '', newUrl.toString());

      const resultGraph = await scanGitHubRepo(
        targetRepo,
        githubToken || undefined,
        (p) => setProgress(p)
      );

      setGraph(resultGraph);
    } catch (err: any) {
      setError(err.message || 'Failed to scan repository.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  // Initial scan on mount
  useEffect(() => {
    handleScan(initialRepo);
  }, []);

  // Compute blast radius when active file changes
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
    const url = `https://github.com/${graph.rootPath}/blob/main/${fileId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-screen h-screen bg-[#0B1420] flex flex-col overflow-hidden text-white font-sans">
      {/* Top Navigation / Toolbar */}
      <header className="h-14 bg-slate-950/90 border-b border-white/10 px-4 flex items-center justify-between gap-4 z-30 shrink-0 backdrop-blur-xl">
        {/* Left: Brand & Back */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-all border border-white/5"
            title="Return to Landing Page"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Landing</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          <a href="#" onClick={(e) => { e.preventDefault(); onBackToLanding(); }} className="flex items-center gap-2">
            <img src="/icon.webp" alt="Atlas" className="w-6 h-6 object-contain" />
            <img
              src="/atlasss.webp"
              alt="Atlas"
              className="h-4 object-contain hidden md:block"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="px-1.5 py-0.5 rounded bg-[#D9F65A]/15 border border-[#D9F65A]/30 text-[#D9F65A] font-mono text-[9.5px] font-bold tracking-wider uppercase">
              Web
            </span>
          </a>
        </div>

        {/* Center: Repo Input Bar */}
        <div className="flex-1 max-w-xl mx-auto flex items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScan();
            }}
            className="flex-1 flex items-center bg-slate-900/90 border border-white/15 focus-within:border-[#D9F65A]/60 focus-within:ring-1 focus-within:ring-[#D9F65A]/60 rounded-xl px-3 py-1 transition-all shadow-inner"
          >
            <svg className="w-4 h-4 text-slate-400 mr-2 shrink-0 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="github.com/owner/repo (e.g. facebook/react)"
              disabled={isLoading}
              className="w-full bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !repoInput.trim()}
              className="ml-2 px-3 py-1 bg-[#D9F65A] text-[#1E2405] hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-sm"
            >
              {isLoading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Play size={11} className="fill-current" />
              )}
              <span>{isLoading ? 'Scanning...' : 'Scan'}</span>
            </button>
          </form>

          {/* GitHub Token / Settings toggle */}
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className={`p-2 rounded-lg border transition-all text-xs font-mono ${
              githubToken
                ? 'bg-[#D9F65A]/10 border-[#D9F65A]/30 text-[#D9F65A]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="GitHub Personal Access Token (for private repos or higher API rate limits)"
          >
            <Key size={14} />
          </button>
        </div>

        {/* Right: Quick Samples */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          <span className="text-[10.5px] font-mono text-slate-500 mr-1">Presets:</span>
          {PRESET_REPOS.map((preset) => (
            <button
              key={preset.repo}
              onClick={() => {
                setRepoInput(preset.repo);
                handleScan(preset.repo);
              }}
              disabled={isLoading}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-[10.5px] font-mono text-slate-300 transition-all"
            >
              {preset.name}
            </button>
          ))}
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
              placeholder="ghp_... (Optional, increases rate limit to 5000 req/hr)"
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
        <div className="bg-slate-950 border-b border-[#D9F65A]/20 px-4 py-3 z-30 flex flex-col gap-1.5 shadow-lg">
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
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 text-red-300 text-xs font-mono flex items-center justify-between">
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
      <main className="flex-1 flex overflow-hidden relative">
        {graph && (
          <>
            {/* Left Sidebar */}
            <Sidebar
              graph={graph}
              activeFileId={activeFileId}
              selectedCategories={selectedCategories}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onToggleCategory={toggleCategory}
              onSelectFile={(id) => setActiveFileId(id)}
            />

            {/* Center Canvas */}
            <div className="flex-1 h-full relative">
              <GraphCanvas
                graph={graph}
                activeFileId={activeFileId}
                impactResult={impactResult}
                selectedCategories={selectedCategories}
                searchTerm={searchTerm}
                viewMode="full"
                onSelectFile={(id) => setActiveFileId(id)}
                onOpenInGitHub={handleOpenInGitHub}
              />
            </div>

            {/* Right Inspector */}
            {activeFileId && (
              <Inspector
                graph={graph}
                activeFileId={activeFileId}
                impactResult={impactResult}
                onClose={() => setActiveFileId(null)}
                onSelectFile={(id) => setActiveFileId(id)}
              />
            )}
          </>
        )}

        {!graph && !isLoading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
            <img src="/icon.webp" alt="Atlas" className="w-16 h-16 object-contain opacity-60" />
            <h2 className="text-xl font-bold font-mono text-slate-300">
              Explore Any GitHub Repository
            </h2>
            <p className="text-sm text-slate-400 max-w-md font-sans leading-relaxed">
              Enter any public repository link above (e.g. <span className="font-mono text-[#D9F65A]">facebook/react</span>) or click one of the preset buttons to visualize the architecture map.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
