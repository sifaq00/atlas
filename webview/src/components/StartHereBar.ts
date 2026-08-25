import { h } from 'preact';
import { useState } from 'preact/hooks';
import { html } from 'htm/preact';
import { StartHereItem } from '../../../src/graph/model';
import { Compass, ChevronDown, ChevronUp, ExternalLink } from '../icons';

interface StartHereBarProps {
  items: StartHereItem[];
  activeFileId: string | null;
  onSelectNode: (fileId: string) => void;
  onOpenInEditor: (fileId: string) => void;
}

export const StartHereBar = ({ items, activeFileId, onSelectNode, onOpenInEditor }: StartHereBarProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  if (!items || items.length === 0) return null;

  const isItemActive = (itemId: string, itemRelPath?: string): boolean => {
    if (!activeFileId) return false;
    if (itemId === activeFileId || itemRelPath === activeFileId) return true;
    const n1 = itemId.replace(/\\/g, '/').toLowerCase();
    const n2 = (itemRelPath || '').replace(/\\/g, '/').toLowerCase();
    const a = activeFileId.replace(/\\/g, '/').toLowerCase();
    return n1 === a || (n2.length > 0 && n2 === a) || n1.endsWith('/' + a) || a.endsWith('/' + n2);
  };

  return html`
    <div class=${`start-here-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div class="start-here-header-row">
        <div class="start-here-title-group" onClick=${() => setIsExpanded(!isExpanded)}>
          <div class="start-here-icon-badge">${Compass(13, { class: 'start-here-icon' })}</div>
          <span class="start-here-title">START HERE</span>
          <span class="start-here-subtitle">— Top Onboarding Entry Points</span>
        </div>
        <button class="start-here-toggle-btn" onClick=${() => setIsExpanded(!isExpanded)} title=${isExpanded ? 'Collapse Start Here Bar' : 'Expand Start Here Bar'}>
          ${isExpanded ? ChevronUp(14) : ChevronDown(14)}
        </button>
      </div>
      ${isExpanded && html`
        <div class="start-here-scroll-track">
          ${items.map((item, index) => {
            const isActive = isItemActive(item.id, item.relativePath);
            return html`
              <div key=${item.id} class=${`start-here-card ${isActive ? 'active' : ''}`} onClick=${() => onSelectNode(item.id)} title=${`${item.relativePath} (${item.label}) - Click to focus in map`}>
                <div class="start-here-card-main">
                  <span class="start-here-rank-badge">${index + 1}</span>
                  <span class="start-here-filename">${item.name}</span>
                  <span class="start-here-tag-badge">${item.label}</span>
                </div>
                <button class="start-here-open-btn" title="Open file in editor" onClick=${(e: Event) => { e.stopPropagation(); onOpenInEditor(item.id); }}>
                  ${ExternalLink(12)}
                </button>
              </div>
            `;
          })}
        </div>
      `}
    </div>
  `;
};
