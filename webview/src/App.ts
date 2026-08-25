import { h } from 'preact';
import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import type { DependencyGraph, FileNode, ImpactResult, ViewMode, FileCategory, CircularCycle, GitDiffImpactResult, OrphanNode, StartHereItem, BlastRadiusNode, ExtensionToWebviewMessage, BlastResult } from './types';
import { ImpactAnalyzer } from '../../src/graph/blast';
import { getVsCodeApi } from './vscodeApi';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { StartHereBar } from './components/StartHereBar';
import { GraphCanvas, GraphCanvasHandle } from './components/GraphCanvas';
import { Inspector } from './components/Inspector';
import { ImpactPanel } from './components/ImpactPanel';
import { SearchModal } from './components/SearchModal';
import { HelpModal } from './components/HelpModal';
import { CircularModal } from './components/CircularModal';
import { GitDiffModal } from './components/GitDiffModal';
import { OrphanModal } from './components/OrphanModal';
import './App.css';

export const App = () => {
  const [graph, setGraph] = useState<DependencyGraph | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('focus');
  const [blastResult, setBlastResult] = useState<BlastResult>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCircularModalOpen, setIsCircularModalOpen] = useState(false);
  const [isOrphanModalOpen, setIsOrphanModalOpen] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const [circularCycles, setCircularCycles] = useState<CircularCycle[]>([]);
  const [orphanNodes, setOrphanNodes] = useState<OrphanNode[]>([]);
  const [startHereItems, setStartHereItems] = useState<StartHereItem[]>([]);
  const [gitImpactResult, setGitImpactResult] = useState<GitDiffImpactResult | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<FileCategory>>(new Set());
  const [hideTests, setHideTests] = useState(false);
  const [groupByFolder, setGroupByFolder] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const pushToHistory = (fileId: string) => {
    if (!fileId) return;
    const curIdx = historyIndexRef.current;
    const curHist = historyRef.current;
    if (curIdx >= 0 && curHist[curIdx] === fileId) return;
    const nextHist = curHist.slice(0, curIdx + 1);
    nextHist.push(fileId);
    historyRef.current = nextHist;
    historyIndexRef.current = nextHist.length - 1;
    setHistory(nextHist);
    setHistoryIndex(nextHist.length - 1);
  };

  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  const handleStatsChange = useCallback((nodes: number, edges: number) => {
    setStats(prev => (prev.nodes === nodes && prev.edges === edges ? prev : { nodes, edges }));
  }, []);

  const graphCanvasRef = useRef<GraphCanvasHandle>(null);
  const vscode = getVsCodeApi();

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'initState': {
          setGraph(msg.payload.graph);
          setActiveFileId(msg.payload.activeFileId);
          setViewMode(msg.payload.viewMode || 'focus');
          if (msg.payload.circularCycles) setCircularCycles(msg.payload.circularCycles);
          if (msg.payload.orphanNodes) setOrphanNodes(msg.payload.orphanNodes);
          if (msg.payload.startHere) setStartHereItems(msg.payload.startHere);
          if (msg.payload.activeFileId) {
            historyRef.current = [msg.payload.activeFileId];
            historyIndexRef.current = 0;
            setHistory([msg.payload.activeFileId]);
            setHistoryIndex(0);
          }
          break;
        }
        case 'graph/full': setGraph(msg.payload.graph); break;
        case 'graph/patch': setGraph(msg.payload.graph); break;
        case 'select': {
          setActiveFileId(msg.payload.id);
          setBlastResult(msg.payload.blast);
          if (msg.payload.id) pushToHistory(msg.payload.id);
          break;
        }
        case 'activeFile': setActiveFileId(msg.payload.id); break;
        case 'startHere': setStartHereItems(msg.payload); break;
        case 'circularCycles': setCircularCycles(msg.payload.cycles); break;
        case 'orphanNodes': setOrphanNodes(msg.payload.orphans); break;
        case 'gitDiffResult': {
          setGitImpactResult(msg.payload.result);
          setIsGitModalOpen(true);
          break;
        }
      }
    };
    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); handleGoBack(); return; }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); handleGoForward(); return; }
      if ((e.key === '/' || (e.ctrlKey || e.metaKey) && e.key === 'k') && !isSearchOpen && !isHelpOpen && !isCircularModalOpen && !isOrphanModalOpen && !isGitModalOpen) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsSearchOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isHelpOpen, isCircularModalOpen, isOrphanModalOpen, isGitModalOpen]);

  const handleSelectFile = (fileId: string, fromHistory = false) => {
    setActiveFileId(fileId);
    if (!fromHistory) pushToHistory(fileId);
    vscode.postMessage({ type: 'requestBlast', payload: { id: fileId } });
  };

  const handleGoBack = () => {
    if (historyIndexRef.current > 0) {
      const prevIdx = historyIndexRef.current - 1;
      historyIndexRef.current = prevIdx;
      setHistoryIndex(prevIdx);
      const prevFileId = historyRef.current[prevIdx];
      if (prevFileId) handleSelectFile(prevFileId, true);
    }
  };

  const handleGoForward = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const nextIdx = historyIndexRef.current + 1;
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      const nextFileId = historyRef.current[nextIdx];
      if (nextFileId) handleSelectFile(nextFileId, true);
    }
  };

  const handleOpenInEditor = (fileId: string, line?: number) => {
    vscode.postMessage({ type: 'openFile', payload: { id: fileId } });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'impact' && activeFileId) handleSelectFile(activeFileId);
    vscode.postMessage({ type: 'setViewMode', payload: { mode } });
  };

  const handleRefresh = () => { vscode.postMessage({ type: 'reindex' }); };
  const handleAnalyzeGitDiff = () => { vscode.postMessage({ type: 'analyzeGitDiff' }); };

  const handleExportPng = () => {
    const dataUri = graphCanvasRef.current?.exportPng();
    if (dataUri) {
      vscode.postMessage({
        type: 'saveFile',
        payload: { defaultName: `atlas-architecture-${Date.now()}.png`, content: dataUri, isBase64: true, filters: { 'Images (*.png)': ['png'] } }
      });
    }
  };

  const handleCopyMermaid = async () => {
    const markdown = graphCanvasRef.current?.getMermaidMarkdown();
    if (markdown) {
      try { await navigator.clipboard.writeText(markdown); } catch (err) { console.warn('Navigator clipboard fallback to VS Code clipboard', err); }
      vscode.postMessage({ type: 'copyClipboard', payload: { text: markdown } });
    }
  };

  const handleExportAuditReport = () => {
    vscode.postMessage({ type: 'exportAuditReport' });
  };

  const handleToggleCategory = (category: FileCategory) => {
    const next = new Set(selectedCategories);
    if (next.has(category)) next.delete(category); else next.add(category);
    setSelectedCategories(next);
  };

  const activeNode: FileNode | null = useMemo(() => {
    if (!graph || !activeFileId) return null;
    if (graph.nodes[activeFileId]) return graph.nodes[activeFileId];
    const norm = activeFileId.replace(/\\/g, '/');
    const normBack = activeFileId.replace(/\//g, '\\');
    return graph.nodes[norm] || graph.nodes[normBack] || Object.values(graph.nodes).find(
      (n) => n.id === activeFileId || n.relativePath === activeFileId || n.id.replace(/\\/g, '/') === norm || n.relativePath.replace(/\\/g, '/') === norm || n.id.toLowerCase() === activeFileId.toLowerCase() || n.name.toLowerCase() === activeFileId.toLowerCase()
    ) || null;
  }, [graph, activeFileId]);

  const impactResult: ImpactResult | null = useMemo(() => {
    if (!graph || !activeFileId) return null;
    return ImpactAnalyzer.analyze(graph, activeFileId);
  }, [graph, activeFileId]);

  return html`
    <div class="atlas-app-container">
      <${Header}
        activeFile=${activeNode}
        viewMode=${viewMode}
        onViewModeChange=${handleViewModeChange}
        onSearchClick=${() => setIsSearchOpen(true)}
        onRefreshClick=${handleRefresh}
        onFitClick=${() => graphCanvasRef.current?.fit()}
        onHelpClick=${() => setIsHelpOpen(true)}
        onOpenCircularModal=${() => setIsCircularModalOpen(true)}
        onOpenOrphanModal=${() => setIsOrphanModalOpen(true)}
        onAnalyzeGitDiff=${handleAnalyzeGitDiff}
        onExportPng=${handleExportPng}
        onCopyMermaid=${handleCopyMermaid}
        onExportAuditReport=${handleExportAuditReport}
        onOpenInEditor=${handleOpenInEditor}
        canGoBack=${historyIndex > 0}
        canGoForward=${historyIndex < history.length - 1}
        onGoBack=${handleGoBack}
        onGoForward=${handleGoForward}
        circularCyclesCount=${circularCycles.length}
        orphansCount=${orphanNodes.length}
        nodeCount=${stats.nodes}
        edgeCount=${stats.edges}
      />

      <${FilterBar}
        selectedCategories=${selectedCategories}
        hideTests=${hideTests}
        groupByFolder=${groupByFolder}
        onToggleCategory=${handleToggleCategory}
        onToggleHideTests=${() => setHideTests(!hideTests)}
        onToggleGroupByFolder=${() => setGroupByFolder(!groupByFolder)}
        onSelectAllCategories=${() => setSelectedCategories(new Set())}
        graph=${graph}
      />

      ${startHereItems.length > 0 && html`
        <${StartHereBar}
          items=${startHereItems}
          activeFileId=${activeFileId}
          onSelectNode=${handleSelectFile}
          onOpenInEditor=${handleOpenInEditor}
        />
      `}

      <main class="atlas-main-content">
        <div class="atlas-center-area">
          <${GraphCanvas}
            ref=${graphCanvasRef}
            graph=${graph}
            activeFileId=${activeFileId}
            viewMode=${viewMode}
            impactResult=${impactResult}
            selectedCategories=${selectedCategories}
            hideTests=${hideTests}
            groupByFolder=${groupByFolder}
            onSelectFile=${handleSelectFile}
            onOpenInEditor=${handleOpenInEditor}
            onStatsChange=${handleStatsChange}
          />

          ${viewMode === 'impact' && html`
            <${ImpactPanel}
              impact=${impactResult}
              graph=${graph}
              activeFileId=${activeFileId}
              onSelectNode=${handleSelectFile}
              onOpenInEditor=${handleOpenInEditor}
            />
          `}
        </div>

        ${isInspectorOpen && html`
          <${Inspector}
            node=${activeNode}
            graph=${graph}
            onSelectNode=${handleSelectFile}
            onOpenInEditor=${handleOpenInEditor}
            onAnalyzeImpact=${(fileId: string) => { setViewMode('impact'); handleSelectFile(fileId); }}
            onClose=${() => setIsInspectorOpen(false)}
          />
        `}
      </main>

      <${SearchModal} isOpen=${isSearchOpen} graph=${graph} onClose=${() => setIsSearchOpen(false)} onSelectNode=${handleSelectFile} />
      <${HelpModal} isOpen=${isHelpOpen} onClose=${() => setIsHelpOpen(false)} />
      <${CircularModal} isOpen=${isCircularModalOpen} cycles=${circularCycles} graph=${graph} onClose=${() => setIsCircularModalOpen(false)} onSelectNode=${handleSelectFile} onOpenInEditor=${handleOpenInEditor} />
      <${OrphanModal} isOpen=${isOrphanModalOpen} orphans=${orphanNodes} graph=${graph} onClose=${() => setIsOrphanModalOpen(false)} onSelectNode=${handleSelectFile} onOpenInEditor=${handleOpenInEditor} />
      <${GitDiffModal} isOpen=${isGitModalOpen} gitImpact=${gitImpactResult} graph=${graph} onClose=${() => setIsGitModalOpen(false)} onSelectNode=${handleSelectFile} onOpenInEditor=${handleOpenInEditor} />
    </div>
  `;
};
