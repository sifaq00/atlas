import { h } from 'preact';
import { html } from 'htm/preact';
import { OrphanNode, DependencyGraph } from '../../../src/graph/model';
import { X, Ghost, ExternalLink, Compass } from '../icons';

interface OrphanModalProps {
  isOpen: boolean;
  orphans: OrphanNode[];
  graph: DependencyGraph | null;
  onClose: () => void;
  onSelectNode: (fileId: string) => void;
  onOpenInEditor: (fileId: string) => void;
}

export const OrphanModal = ({ isOpen, orphans, graph, onClose, onSelectNode, onOpenInEditor }: OrphanModalProps) => {
  if (!isOpen) return null;

  const totalLoc = orphans.reduce((sum, o) => sum + (o.lineCount || 0), 0);
  const totalKb = (orphans.reduce((sum, o) => sum + (o.sizeBytes || 0), 0) / 1024).toFixed(1);

  return html`
    <div class="modal-backdrop" onClick=${onClose}>
      <div class="circular-modal-card" onClick=${(e: Event) => e.stopPropagation()}>
        <div class="circular-modal-header">
          <div class="circular-title-wrap">
            ${Ghost(18, { color: '#a855f7' })}
            <h3>Potential Orphan Modules (${orphans.length})</h3>
          </div>
          <button class="icon-btn subtle-btn" onClick=${onClose} title="Close">${X(16)}</button>
        </div>
        <div class="circular-modal-body">
          <div class="git-summary-banner">
            <p class="git-summary-desc">
              Found <strong>${orphans.length} unused files</strong> (${totalLoc} total LOC, ${totalKb} KB) with zero internal consumers in the workspace. These files are not imported anywhere and are prime candidates for cleanup.
            </p>
          </div>
          <div class="git-file-list" style=${{ maxHeight: '350px' }}>
            ${orphans.length === 0 ? html`<div class="git-empty-msg">No orphan modules found! Your project dependencies are clean.</div>` :
              orphans.map((orphan) => html`
                <div key=${orphan.id} class="git-file-row">
                  <span class=${`category-dot category-${orphan.category}`} />
                  <div style=${{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: '0 8px' }}>
                    <span class="git-file-name" style=${{ margin: 0 }}>${orphan.name}</span>
                    <span style=${{ fontSize: '10px', color: 'var(--text-muted)' }}>${orphan.relativePath} • ${orphan.lineCount} LOC • ${(orphan.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div class="git-row-actions">
                    <button class="mini-action-btn" onClick=${() => { onSelectNode(orphan.id); onClose(); }} title="Focus in Graph">${Compass(12)}</button>
                    <button class="mini-action-btn" onClick=${() => onOpenInEditor(orphan.id)} title="Open in VS Code Editor">${ExternalLink(12)}</button>
                  </div>
                </div>
              `)
            }
          </div>
        </div>
        <div class="help-modal-footer">
          <button class="primary-action-btn" onClick=${onClose}>Close</button>
        </div>
      </div>
    </div>
  `;
};
