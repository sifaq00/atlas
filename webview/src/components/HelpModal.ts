import { h } from 'preact';
import { html } from 'htm/preact';
import { X, Target, Flame, Network, BookOpen } from '../icons';
import { CATEGORY_COLORS } from '../theme/cytoscapeStyles';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
  if (!isOpen) return null;

  return html`
    <div class="modal-backdrop" onClick=${onClose}>
      <div class="help-modal-card" onClick=${(e: Event) => e.stopPropagation()}>
        <div class="help-modal-header">
          <div class="help-title">
            ${BookOpen(18, { class: 'help-icon-title' })}
            <h3>Atlas Quick Guide & Visual Legend</h3>
          </div>
          <button class="icon-btn subtle-btn" onClick=${onClose} title="Close Guide">${X(16)}</button>
        </div>
        <div class="help-modal-body">
          <div class="help-section">
            <h4 class="help-section-title">1. Graph View Modes</h4>
            <div class="help-grid-3">
              <div class="help-mode-card">
                <div class="mode-tag mode-focus">${Target(14)}<span>Focus Mode (Default)</span></div>
                <p><strong>Purpose:</strong> Isolates the active file and its immediate 1-hop dependencies and consumers. Clean, fast, and eliminates unnecessary visual clutter.</p>
              </div>
              <div class="help-mode-card">
                <div class="mode-tag mode-impact">${Flame(14)}<span>Blast Radius Mode</span></div>
                <p><strong>Purpose:</strong> Traces the entire downstream ripple effect if this file is modified or refactored. Maps affected files, depths, and calculates risk score.</p>
              </div>
              <div class="help-mode-card">
                <div class="mode-tag mode-full">${Network(14)}<span>Full Map Mode</span></div>
                <p><strong>Purpose:</strong> Visualizes the entire workspace architecture constellation with physics clustering. Great for exploring global modular dependencies.</p>
              </div>
            </div>
          </div>
          <div class="help-section">
            <h4 class="help-section-title">2. Node Category Color Legend</h4>
            <div class="help-legend-grid">
              <div class="legend-item"><span class="legend-dot" style=${{ backgroundColor: CATEGORY_COLORS.service.bg }} /><div><strong>Service (Cyan):</strong> Core business logic and backend services (e.g. <code>authService.ts</code>).</div></div>
              <div class="legend-item"><span class="legend-dot" style=${{ backgroundColor: CATEGORY_COLORS.ui.bg }} /><div><strong>Route / Page (Purple):</strong> API routes, server endpoints, or frontend pages.</div></div>
              <div class="legend-item"><span class="legend-dot" style=${{ backgroundColor: CATEGORY_COLORS.ui.bg }} /><div><strong>Component (Blue):</strong> UI visual components (React, Vue, Svelte, JSX/TSX).</div></div>
              <div class="legend-item"><span class="legend-dot" style=${{ backgroundColor: CATEGORY_COLORS.util.bg }} /><div><strong>Utility (Green):</strong> Helper functions, workers, middleware, and shared tools.</div></div>
              <div class="legend-item"><span class="legend-dot" style=${{ backgroundColor: CATEGORY_COLORS.data.bg }} /><div><strong>Database (Amber):</strong> Data models, Prisma schemas, and database query clients.</div></div>
              <div class="legend-item"><span class="legend-dot" style=${{ backgroundColor: '#ea580c' }} /><div><strong>Orange / Flame:</strong> Downstream files affected during Blast Radius analysis.</div></div>
            </div>
          </div>
          <div class="help-section">
            <h4 class="help-section-title">3. Navigation & Shortcuts</h4>
            <ul class="help-tips-list">
              <li>🖱️ <strong>Single-Click on Node:</strong> Inspects file details, size, line count, imports, and consumers in the Inspector panel.</li>
              <li>⚡ <strong>Double-Click on Node:</strong> <strong>Jumps directly to source code in the VS Code editor!</strong></li>
              <li>🔍 <strong>Press <code>/</code> or <code>Ctrl+K</code>:</strong> Opens Spotlight fuzzy search across all files in the workspace.</li>
              <li>🖐️ <strong>Click & Drag Node:</strong> Freely reposition any node on the canvas with smooth physics.</li>
            </ul>
          </div>
        </div>
        <div class="help-modal-footer">
          <button class="primary-action-btn" onClick=${onClose}>Got It, Close Guide</button>
        </div>
      </div>
    </div>
  `;
};
