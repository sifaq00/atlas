import { h } from 'preact';
import { html } from 'htm/preact';
import { DependencyGraph, FileNode, FileCategory, ImpactResult } from '../../../src/graph/model';
import { FileCode, ExternalLink, Flame, ArrowUpRight, ArrowDownLeft, ChevronRight, Info, X } from '../icons';

interface InspectorProps {
  node: FileNode | null;
  graph: DependencyGraph | null;
  impactResult?: ImpactResult | null;
  onSelectNode: (fileId: string) => void;
  onOpenInEditor: (fileId: string) => void;
  onAnalyzeImpact: (fileId: string) => void;
  onClose: () => void;
}

export const Inspector = ({ node, graph, impactResult, onSelectNode, onOpenInEditor, onAnalyzeImpact, onClose }: InspectorProps) => {
  if (!node) {
    return html`
      <aside class="inspector-panel empty-inspector">
        <div class="empty-content">
          ${FileCode(36, { class: 'empty-icon' })}
          <h4>Select a File</h4>
          <p>Click any node in the graph to inspect its imports, consumers, and downstream impact.</p>
        </div>
      </aside>
    `;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryRoleDescription = (category: FileCategory) => {
    switch (category) {
      case 'service': return 'Manages backend business logic & core data processing flows.';
      case 'ui': return 'UI layer: pages, routes, and visual components.';
      case 'util': return 'Reusable helper functions, workers, and library tools.';
      case 'data': return 'Data models, database schemas, and query connections.';
      case 'config': return 'Application environment variables and runtime configurations.';
      case 'other': return 'Tests, unknown, and miscellaneous source code.';
      default: return 'Project source code module.';
    }
  };

  return html`
    <aside class="inspector-panel">
      <div class="inspector-header">
        <div class="inspector-title-wrap">
          <span class=${`category-badge category-${node.category}`}>${node.category}</span>
          <h3 class="inspector-filename" title=${node.name}>${node.name}</h3>
        </div>
        <button class="icon-btn subtle-btn" onClick=${onClose} title="Close Inspector">${X(15)}</button>
      </div>
      <div class="inspector-body">
        <div class="role-explanation-banner">
          ${Info(14, { class: 'role-info-icon' })}
          <span><strong>Role:</strong> ${getCategoryRoleDescription(node.category)}</span>
        </div>
        <div class="inspector-meta-box">
          <div class="meta-path" title=${node.relativePath}>${node.relativePath}</div>
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">LINES</span><span class="meta-val">${node.lineCount}</span></div>
            <div class="meta-item"><span class="meta-label">SIZE</span><span class="meta-val">${formatBytes(node.sizeBytes)}</span></div>
            <div class="meta-item"><span class="meta-label">IMPORTS</span><span class="meta-val">${node.imports.length}</span></div>
            <div class="meta-item"><span class="meta-label">USED BY</span><span class="meta-val">${node.importedBy.length}</span></div>
          </div>
        </div>
        <div class="inspector-actions">
          <button class="primary-action-btn impact-btn" onClick=${() => onAnalyzeImpact(node.id)} title="Inspect downstream cascade in Blast Radius view">
            ${Flame(15)}<span>Analyze Blast Radius</span>
          </button>
          <button class="secondary-action-btn" onClick=${() => onOpenInEditor(node.id)} title="Open in VS Code">
            ${ExternalLink(15)}<span>Open in Editor</span>
          </button>
        </div>
        <div class="rel-group">
          <div class="rel-header">
            <div class="rel-title">${ArrowDownLeft(14, { class: 'rel-icon-inbound' })}<span>Used By (${node.importedBy.length})</span></div>
            <span class="rel-hint">Consumers</span>
          </div>
          <p class="rel-explainer">Files that directly depend on this module and will be affected if its exported interface changes:</p>
          <div class="rel-list">
            ${node.importedBy.length === 0 ? html`<div class="rel-empty">No internal consumers (orphan/entrypoint)</div>` :
              node.importedBy.map((consumerId) => {
                const targetNode = graph ? graph.nodes[consumerId] : null;
                const name = targetNode ? targetNode.name : consumerId.split(/[\\/]/).pop() || consumerId;
                const cat = targetNode ? targetNode.category : 'other';
                return html`
                  <button key=${consumerId} class="rel-item-btn" onClick=${() => onSelectNode(consumerId)} title=${consumerId}>
                    <div class="rel-item-left">
                      ${FileCode(13, { class: `file-icon-category category-icon-${cat}` })}
                      <span class="rel-item-name">${name}</span>
                    </div>
                    ${ChevronRight(13, { class: 'arrow-hover' })}
                  </button>
                `;
              })
            }
          </div>
        </div>
        <div class="rel-group">
          <div class="rel-header">
            <div class="rel-title">${ArrowUpRight(14, { class: 'rel-icon-outbound' })}<span>Imports (${node.imports.length})</span></div>
            <span class="rel-hint">Dependencies</span>
          </div>
          <p class="rel-explainer">Internal project modules required and imported by this file:</p>
          <div class="rel-list">
            ${node.imports.length === 0 ? html`<div class="rel-empty">No internal imports</div>` :
              node.imports.map((depId) => {
                const targetNode = graph ? graph.nodes[depId] : null;
                const name = targetNode ? targetNode.name : depId.split(/[\\/]/).pop() || depId;
                const cat = targetNode ? targetNode.category : 'other';
                return html`
                  <button key=${depId} class="rel-item-btn" onClick=${() => onSelectNode(depId)} title=${depId}>
                    <div class="rel-item-left">
                      ${FileCode(13, { class: `file-icon-category category-icon-${cat}` })}
                      <span class="rel-item-name">${name}</span>
                    </div>
                    ${ChevronRight(13, { class: 'arrow-hover' })}
                  </button>
                `;
              })
            }
          </div>
        </div>
      </div>
    </aside>
  `;
};
