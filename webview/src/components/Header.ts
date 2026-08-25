import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { ViewMode, FileCategory, FileNode } from '../../../src/graph/model';
import logoImg from '../assets/logo.png';
import {
  Target, Flame, Network, Search, RotateCw, Maximize2, ExternalLink, HelpCircle,
  AlertTriangle, GitBranch, Camera, Download, Copy, Ghost, FileText, ArrowLeft, ArrowRight
} from '../icons';

interface HeaderProps {
  activeFile: FileNode | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchClick: () => void;
  onRefreshClick: () => void;
  onFitClick: () => void;
  onHelpClick: () => void;
  onOpenCircularModal?: () => void;
  onOpenOrphanModal?: () => void;
  onAnalyzeGitDiff?: () => void;
  onExportPng?: () => void;
  onCopyMermaid?: () => void;
  onExportAuditReport?: () => void;
  onOpenInEditor: (fileId: string) => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  circularCyclesCount?: number;
  orphansCount?: number;
  nodeCount: number;
  edgeCount: number;
}

export const Header = ({
  activeFile, viewMode, onViewModeChange, onSearchClick, onRefreshClick, onFitClick, onHelpClick,
  onOpenCircularModal, onOpenOrphanModal, onAnalyzeGitDiff, onExportPng, onCopyMermaid, onExportAuditReport,
  onOpenInEditor, canGoBack = false, canGoForward = false, onGoBack, onGoForward,
  circularCyclesCount = 0, orphansCount = 0, nodeCount, edgeCount
}: HeaderProps) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) setIsExportMenuOpen(false);
    };
    if (isExportMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  return html`
    <header class="atlas-header">
      <div class="header-section header-left">
        <div class="brand" title="Atlas Architecture Intelligence">
          <img src=${logoImg} alt="Atlas" style=${{ height: '28px', width: '28px', objectFit: 'contain' }} />
          <span class="brand-name">Atlas</span>
        </div>

        <div class="header-nav-pair">
          <button class="header-nav-btn" disabled=${!canGoBack} onClick=${onGoBack} title="Navigate Back (Alt + Left)">
            ${ArrowLeft(14)}
          </button>
          <button class="header-nav-btn" disabled=${!canGoForward} onClick=${onGoForward} title="Navigate Forward (Alt + Right)">
            ${ArrowRight(14)}
          </button>
        </div>

        ${activeFile && html`
          <div class="header-v-divider" />
          <div class="active-file-badge" title=${activeFile.relativePath}>
            <span class=${`category-pill category-${activeFile.category}`}>${activeFile.category}</span>
            <span class="file-name">${activeFile.name}</span>
            <button class="icon-btn subtle-btn mini-action-icon" title="Open in VS Code Editor" onClick=${() => onOpenInEditor(activeFile.id)}>
              ${ExternalLink(11)}
            </button>
          </div>
        `}
      </div>

      <div class="header-section header-center">
        <div class="mode-toggle-group">
          <button class=${`mode-btn ${viewMode === 'focus' ? 'active' : ''}`} onClick=${() => onViewModeChange('focus')} title="Focus Mode: Target file + direct inputs/consumers">
            ${Target(13)}<span>Focus</span>
          </button>
          <button class=${`mode-btn ${viewMode === 'impact' ? 'active' : ''}`} onClick=${() => onViewModeChange('impact')} title="Blast Radius: Cascading downstream dependency chain">
            ${Flame(13)}<span>Blast Radius</span>
          </button>
          <button class=${`mode-btn ${viewMode === 'full' ? 'active' : ''}`} onClick=${() => onViewModeChange('full')} title="Full Architecture Graph">
            ${Network(13)}<span>Full Map</span>
          </button>
        </div>
      </div>

      <div class="header-section header-right">
        ${(orphansCount > 0 || circularCyclesCount > 0 || onAnalyzeGitDiff) && html`
          <div class="header-audit-group">
            ${orphansCount > 0 && onOpenOrphanModal && html`
              <button class="orphan-header-badge" onClick=${onOpenOrphanModal} title=${`${orphansCount} unused orphan module(s) detected`}>
                ${Ghost(12)}<span>${orphansCount}</span>
              </button>
            `}
            ${circularCyclesCount > 0 && onOpenCircularModal && html`
              <button class="circular-header-badge" onClick=${onOpenCircularModal} title=${`${circularCyclesCount} Circular Dependency cycle(s) detected`}>
                ${AlertTriangle(12)}<span>${circularCyclesCount}</span>
              </button>
            `}
            ${onAnalyzeGitDiff && html`
              <button class="git-header-btn" onClick=${onAnalyzeGitDiff} title="Analyze Blast Radius of uncommitted Git changes">
                ${GitBranch(12)}<span>Git</span>
              </button>
            `}
          </div>
          <div class="header-v-divider" />
        `}

        <button class="header-action-btn" onClick=${onSearchClick} title="Search files across codebase (Press / or Ctrl+K)">
          ${Search(13)}<span class="btn-label">Search</span><kbd class="kbd-badge">/</kbd>
        </button>
        <div class="header-v-divider" />
        <div class="graph-stats-pill" title=${`${nodeCount} files, ${edgeCount} dependency edges in view`}>
          <span>${nodeCount}</span><span class="dot-divider">•</span><span>${edgeCount}</span>
        </div>
        <div class="header-v-divider" />
        <div class="header-actions-cluster">
          <div class="export-dropdown-wrapper" ref=${exportDropdownRef}>
            <button class="icon-btn" onClick=${() => setIsExportMenuOpen(!isExportMenuOpen)} title="Export Graph Diagram & Audit Report">
              ${Download(14)}
            </button>
            ${isExportMenuOpen && html`
              <div class="export-menu-card">
                <button class="export-menu-item" onClick=${() => { setIsExportMenuOpen(false); if (onExportPng) onExportPng(); }}>
                  ${Camera(13)}<span>Export High-Res PNG</span>
                </button>
                <button class="export-menu-item" onClick=${() => { setIsExportMenuOpen(false); if (onCopyMermaid) onCopyMermaid(); }}>
                  ${Copy(13)}<span>Copy Mermaid Markdown</span>
                </button>
                <button class="export-menu-item" onClick=${() => { setIsExportMenuOpen(false); if (onExportAuditReport) onExportAuditReport(); }}>
                  ${FileText(13)}<span>Export Architecture Audit (.md)</span>
                </button>
              </div>
            `}
          </div>
          <button class="icon-btn" onClick=${onFitClick} title="Fit to Screen (Center view)">${Maximize2(14)}</button>
          <button class="icon-btn" onClick=${onRefreshClick} title="Refresh Workspace Graph (Re-scan files)">${RotateCw(14)}</button>
          <button class="icon-btn" onClick=${onHelpClick} title="Atlas Quick Guide & Architecture Legend (?)">${HelpCircle(15)}</button>
        </div>
      </div>
    </header>
  `;
};
