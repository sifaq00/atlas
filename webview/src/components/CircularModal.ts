import { h, Fragment } from 'preact';
import { html } from 'htm/preact';
import { CircularCycle, DependencyGraph } from '../../../src/graph/model';
import { X, AlertTriangle, ArrowRight, ExternalLink, Compass } from '../icons';

interface CircularModalProps {
  isOpen: boolean;
  cycles: CircularCycle[];
  graph: DependencyGraph | null;
  onClose: () => void;
  onSelectNode: (fileId: string) => void;
  onOpenInEditor: (fileId: string) => void;
}

export const CircularModal = ({ isOpen, cycles, graph, onClose, onSelectNode, onOpenInEditor }: CircularModalProps) => {
  if (!isOpen) return null;

  return html`
    <div class="modal-backdrop" onClick=${onClose}>
      <div class="circular-modal-card" onClick=${(e: Event) => e.stopPropagation()}>
        <div class="circular-modal-header">
          <div class="circular-title-wrap">
            ${AlertTriangle(18, { class: 'circular-warning-icon' })}
            <h3>Circular Dependencies Detected (${cycles.length})</h3>
          </div>
          <button class="icon-btn subtle-btn" onClick=${onClose} title="Close">${X(16)}</button>
        </div>
        <div class="circular-modal-body">
          <p class="circular-explainer">
            Circular imports (when module A imports module B which directly or indirectly imports module A) can cause runtime <code>undefined</code> imports and bundler execution ordering bugs.
          </p>
          <div class="cycles-list">
            ${cycles.map((cycle, idx) => html`
              <div key=${cycle.id || idx} class="cycle-item-card">
                <div class="cycle-card-header">
                  <span class="cycle-number-badge">Cycle #${idx + 1}</span>
                  <span class="cycle-length-badge">${cycle.length} steps in loop</span>
                </div>
                <div class="cycle-chain-wrap">
                  ${cycle.files.map((fileId, stepIdx) => {
                    const node = graph?.nodes[fileId];
                    const isLast = stepIdx === cycle.files.length - 1;
                    return html`
                      <${Fragment} key=${`${fileId}-${stepIdx}`}>
                        <div class="cycle-step-node">
                          <span class=${`category-dot category-${node?.category || 'other'}`} />
                          <span class="cycle-step-name" title=${node?.relativePath || fileId}>${node?.name || fileId.split(/[/\\]/).pop()}</span>
                          <div class="cycle-step-actions">
                            <button class="mini-action-btn" onClick=${() => { onSelectNode(fileId); onClose(); }} title="Focus in Graph">${Compass(11)}</button>
                            <button class="mini-action-btn" onClick=${() => onOpenInEditor(fileId)} title="Open in Editor">${ExternalLink(11)}</button>
                          </div>
                        </div>
                        ${!isLast && html`<div class="cycle-arrow">${ArrowRight(13)}</div>`}
                      </${Fragment}>
                    `;
                  })}
                </div>
              </div>
            `)}
          </div>
        </div>
        <div class="help-modal-footer">
          <button class="primary-action-btn" onClick=${onClose}>Close</button>
        </div>
      </div>
    </div>
  `;
};
