import { h } from 'preact';
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { DependencyGraph, ImpactResult } from '../../../src/graph/model';
import { ImpactAnalyzer } from '../../../src/graph/blast';
import { Flame, AlertTriangle, ShieldCheck, AlertOctagon, ChevronUp, ChevronDown, ExternalLink, Compass, CheckCircle2 } from '../icons';

interface ImpactPanelProps {
  impact: ImpactResult | null;
  graph?: DependencyGraph | null;
  activeFileId?: string | null;
  onSelectNode: (fileId: string) => void;
  onOpenInEditor: (fileId: string) => void;
}

export const ImpactPanel = ({ impact: propImpact, graph, activeFileId, onSelectNode, onOpenInEditor }: ImpactPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const impact = (() => {
    if (propImpact) return propImpact;
    if (graph && activeFileId) {
      const computed = ImpactAnalyzer.analyze(graph, activeFileId);
      if (computed) return computed;
      const node = graph.nodes[activeFileId] || Object.values(graph.nodes).find(n => n.id === activeFileId || n.relativePath === activeFileId);
      if (node) {
        const direct = node.importedBy || [];
        const affectedNodes = direct.map(id => {
          const cNode = graph.nodes[id] || Object.values(graph.nodes).find(n => n.id === id);
          return { id, name: cNode ? cNode.name : id.split(/[\\/]/).pop() || id, relativePath: cNode ? cNode.relativePath : id, category: cNode ? cNode.category : 'other', depth: 1, isDirect: true };
        });
        return {
          targetFileId: activeFileId, targetFileName: node.name, targetRelativePath: node.relativePath, targetCategory: node.category,
          totalAffected: affectedNodes.length, directDependentsCount: affectedNodes.length, indirectDependentsCount: 0, maxDepth: 1,
          uiAffected: affectedNodes.filter(n => n.category === 'ui').length, servicesAffected: affectedNodes.filter(n => n.category === 'service').length,
          dataAffected: 0, utilsAffected: affectedNodes.filter(n => n.category === 'util').length, otherAffected: 0,
          riskScore: affectedNodes.length > 5 ? 60 : affectedNodes.length > 0 ? 30 : 5,
          riskLevel: (affectedNodes.length > 5 ? 'CRITICAL' : affectedNodes.length > 0 ? 'HIGH' : 'LOW') as any,
          riskReasons: [`${affectedNodes.length} direct consumers`], affectedNodes, impactGraphEdges: [], hasCircularDependency: false
        };
      }
    }
    return null;
  })();

  if (!impact) {
    return html`
      <div class="impact-drawer collapsed">
        <div class="drawer-header" style=${{ justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          ${Flame(15, { color: 'var(--accent-orange)' })}
          <span style=${{ fontSize: '12px' }}>Click any file on the graph to inspect its Blast Radius & Critical Risk</span>
        </div>
      </div>
    `;
  }

  const getRiskColorClass = (level: string) => { switch (level) { case 'CRITICAL': return 'risk-critical'; case 'HIGH': return 'risk-high'; case 'MEDIUM': return 'risk-medium'; default: return 'risk-low'; } };
  const getRiskIcon = (level: string) => { switch (level) { case 'CRITICAL': return AlertOctagon(15); case 'HIGH': return AlertTriangle(15); case 'MEDIUM': return Flame(15); default: return ShieldCheck(15); } };
  const getRiskPlainExplanation = (level: string, totalAffected: number) => {
    switch (level) {
      case 'CRITICAL': return `Critical Risk! Modifying this file may break ${totalAffected} core system components and public API routes.`;
      case 'HIGH': return `High Risk! Multiple components or routes depend on this file. Test thoroughly before committing.`;
      case 'MEDIUM': return `Medium Risk. ${totalAffected} downstream files (workers/services) require review if exported function signatures change.`;
      default: return `Low Risk (Safe). Only localized modules depend on this file.`;
    }
  };

  return html`
    <div class=${`impact-drawer ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div class="drawer-header" onClick=${() => setIsExpanded(!isExpanded)} title="Click to toggle blast radius summary">
        <div class="drawer-header-left">
          <div class=${`risk-badge ${getRiskColorClass(impact.riskLevel)}`}>
            ${getRiskIcon(impact.riskLevel)}<span>${impact.riskLevel} RISK</span>
          </div>
          <div class="impact-summary-text">
            <strong>${impact.totalAffected} files</strong> potentially affected by modifying <span class="target-pill">${impact.targetFileName}</span>
          </div>
        </div>
        <div class="drawer-header-right">
          <div class="quick-chips">
            ${impact.uiAffected > 0 && html`<span class="count-chip ui-chip" title="UI files touched">${impact.uiAffected} ui</span>`}
            ${impact.servicesAffected > 0 && html`<span class="count-chip svc-chip" title="Services touched">${impact.servicesAffected} svc</span>`}
            ${impact.otherAffected > 0 && html`<span class="count-chip other-chip" title="Other files touched">${impact.otherAffected} other</span>`}
            <span class="count-chip depth-chip" title="Maximum downstream propagation depth">Depth ${impact.maxDepth}</span>
          </div>
          <button class=${`drawer-collapse-btn ${isExpanded ? 'is-open' : 'is-closed'}`} title=${isExpanded ? 'Collapse Drawer' : 'Expand Impact Details'} onClick=${(e: Event) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            ${isExpanded ? ChevronDown(15) : ChevronUp(15)}
          </button>
        </div>
      </div>
      ${isExpanded && html`
        <div class="drawer-body">
          <div class="drawer-summary-col">
            <h5 class="section-subtitle">Risk Evaluation & Impact Analysis</h5>
            <p class="risk-plain-summary">${getRiskPlainExplanation(impact.riskLevel, impact.totalAffected)}</p>
            <div class="risk-reasons-list">
              <div class="risk-reason-item">${CheckCircle2(13, { class: 'reason-check-icon' })}<span>${impact.directDependentsCount ?? (impact as any).directConsumersCount ?? 0} direct consumers</span></div>
              ${(impact.indirectDependentsCount || (impact as any).indirectConsumersCount) > 0 && html`
                <div class="risk-reason-item">${CheckCircle2(13, { class: 'reason-check-icon' })}<span>${impact.indirectDependentsCount ?? (impact as any).indirectConsumersCount ?? 0} downstream dependents</span></div>
              `}
              ${impact.maxDepth >= 3 && html`<div class="risk-reason-item">${CheckCircle2(13, { class: 'reason-check-icon' })}<span>Deep propagation chain (${impact.maxDepth} levels deep)</span></div>`}
              ${impact.uiAffected > 0 && html`<div class="risk-reason-item">${CheckCircle2(13, { class: 'reason-check-icon' })}<span>Touches ${impact.uiAffected} UI endpoints</span></div>`}
              ${impact.hasCircularDependency && html`<div class="risk-reason-item">${CheckCircle2(13, { class: 'reason-check-icon' })}<span>Circular dependency path detected</span></div>`}
            </div>
          </div>
          <div class="drawer-affected-col">
            <div class="affected-section-header">
              <h5 class="section-subtitle">Affected Downstream Dependency Chain</h5>
              <span class="affected-legend-hint"><strong style=${{ color: '#ef4444' }}>L1</strong> = Direct Consumers (Bold Crimson) • <strong style=${{ color: '#fbbf24' }}>L2+</strong> = Downstream Cascade (Thin Gold)</span>
            </div>
            <div class="affected-grid">
              ${impact.affectedNodes.map((node) => html`
                <div key=${node.id} class=${`affected-card ${node.isDirect ? 'card-direct' : 'card-indirect'}`} title=${`${node.relativePath} (${node.isDirect ? 'Direct Dependent' : `Cascade Depth ${node.depth}`})`}>
                  <div class="affected-card-left">
                    <span class="depth-badge">L${node.depth}</span>
                    <span class=${`category-pill category-${node.category}`}>${node.category}</span>
                    <span class="affected-node-name" title=${node.name}>${node.name}</span>
                  </div>
                  <div class="affected-card-actions">
                    <button class="card-action-btn icon-only" title="Focus in graph" onClick=${() => onSelectNode(node.id)}>${Compass(13)}</button>
                    <button class="card-action-btn icon-only" title="Open in VS Code" onClick=${() => onOpenInEditor(node.id)}>${ExternalLink(13)}</button>
                  </div>
                </div>
              `)}
            </div>
          </div>
        </div>
      `}
    </div>
  `;
};
