import { h } from 'preact';
import { html } from 'htm/preact';
import { GitDiffImpactResult, DependencyGraph } from '../../../src/graph/model';
import { X, GitBranch, Flame, AlertTriangle, ShieldCheck, AlertOctagon, ExternalLink, Compass } from '../icons';

interface GitDiffModalProps {
  isOpen: boolean;
  gitImpact: GitDiffImpactResult | null;
  graph: DependencyGraph | null;
  onClose: () => void;
  onSelectNode: (fileId: string) => void;
  onOpenInEditor: (fileId: string) => void;
}

export const GitDiffModal = ({ isOpen, gitImpact, graph, onClose, onSelectNode, onOpenInEditor }: GitDiffModalProps) => {
  if (!isOpen || !gitImpact) return null;

  const getRiskColorClass = (level: string) => { switch (level) { case 'CRITICAL': return 'risk-critical'; case 'HIGH': return 'risk-high'; case 'MEDIUM': return 'risk-medium'; default: return 'risk-low'; } };
  const getRiskIcon = (level: string) => { switch (level) { case 'CRITICAL': return AlertOctagon(16); case 'HIGH': return AlertTriangle(16); case 'MEDIUM': return Flame(16); default: return ShieldCheck(16); } };

  return html`
    <div class="modal-backdrop" onClick=${onClose}>
      <div class="git-modal-card" onClick=${(e: Event) => e.stopPropagation()}>
        <div class="git-modal-header">
          <div class="git-title-wrap">
            ${GitBranch(18, { class: 'git-branch-icon' })}
            <h3>Git Pre-Commit Blast Radius (${gitImpact.branchName})</h3>
          </div>
          <button class="icon-btn subtle-btn" onClick=${onClose} title="Close">${X(16)}</button>
        </div>
        <div class="git-modal-body">
          <div class="git-summary-banner">
            <div class=${`risk-badge ${getRiskColorClass(gitImpact.riskLevel)}`}>
              ${getRiskIcon(gitImpact.riskLevel)}<span>${gitImpact.riskLevel} RISK (Score: ${gitImpact.riskScore})</span>
            </div>
            <p class="git-summary-desc">
              Your uncommitted branch changes touch <strong>${gitImpact.modifiedFiles.length} files</strong>, which cumulatively cascade to <strong>${gitImpact.totalAffected} downstream project files</strong>.
            </p>
          </div>
          <div class="git-stats-grid">
            <div class="git-stat-box"><span class="stat-num">${gitImpact.modifiedFiles.length}</span><span class="stat-label">Changed Files</span></div>
            <div class="git-stat-box"><span class="stat-num">${gitImpact.totalAffected}</span><span class="stat-label">Downstream Impact</span></div>
            <div class="git-stat-box"><span class="stat-num">${gitImpact.uiAffected}</span><span class="stat-label">UI Files</span></div>
            <div class="git-stat-box"><span class="stat-num">${gitImpact.servicesAffected}</span><span class="stat-label">Services</span></div>
          </div>
          <div class="git-section">
            <h5 class="git-section-title">1. Modified Files in Working Tree (${gitImpact.modifiedFiles.length})</h5>
            <div class="git-file-list">
              ${gitImpact.modifiedFiles.length === 0 ? html`<div class="git-empty-msg">No modified files detected in Git working tree.</div>` :
                gitImpact.modifiedFiles.map((fileId) => {
                  const node = graph?.nodes[fileId];
                  return html`
                    <div key=${fileId} class="git-file-row">
                      <span class=${`category-dot category-${node?.category || 'other'}`} />
                      <span class="git-file-name" title=${node?.relativePath || fileId}>${node?.name || fileId.split(/[/\\]/).pop()}</span>
                      <div class="git-row-actions">
                        <button class="mini-action-btn" onClick=${() => { onSelectNode(fileId); onClose(); }} title="Focus on Graph">${Compass(12)}</button>
                        <button class="mini-action-btn" onClick=${() => onOpenInEditor(fileId)} title="Open in Editor">${ExternalLink(12)}</button>
                      </div>
                    </div>
                  `;
                })
              }
            </div>
          </div>
          ${gitImpact.combinedAffectedNodes.length > 0 && html`
            <div class="git-section">
              <h5 class="git-section-title">2. Downstream Impacted Chain (${gitImpact.combinedAffectedNodes.length})</h5>
              <div class="git-affected-grid">
                ${gitImpact.combinedAffectedNodes.map((node) => html`
                  <div key=${node.id} class="git-affected-card">
                    <div class="git-affected-left">
                      <span class="depth-badge">L${node.depth}</span>
                      <span class=${`category-pill category-${node.category}`}>${node.category}</span>
                      <span class="git-affected-name" title=${node.relativePath}>${node.name}</span>
                    </div>
                    <div class="git-affected-actions">
                      <button class="mini-action-btn" onClick=${() => { onSelectNode(node.id); onClose(); }} title="Focus">${Compass(12)}</button>
                      <button class="mini-action-btn" onClick=${() => onOpenInEditor(node.id)} title="Open">${ExternalLink(12)}</button>
                    </div>
                  </div>
                `)}
              </div>
            </div>
          `}
        </div>
        <div class="help-modal-footer">
          <button class="primary-action-btn" onClick=${onClose}>Close Analysis</button>
        </div>
      </div>
    </div>
  `;
};
