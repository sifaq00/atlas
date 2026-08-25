import { h } from 'preact';
import { html } from 'htm/preact';
import { FileCategory, DependencyGraph } from '../../../src/graph/model';
import { Filter, EyeOff, FolderTree, Layers, Server, Globe, Wrench, Database, Settings } from '../icons';

interface FilterBarProps {
  selectedCategories: Set<FileCategory>;
  hideTests: boolean;
  groupByFolder: boolean;
  onToggleCategory: (category: FileCategory) => void;
  onToggleHideTests: () => void;
  onToggleGroupByFolder: () => void;
  onSelectAllCategories: () => void;
  graph: DependencyGraph | null;
}

interface CategoryFilterItem {
  key: FileCategory;
  label: string;
  color: string;
  icon: (size?: number, style?: Record<string, string>) => ReturnType<typeof html>;
}

const CATEGORIES: CategoryFilterItem[] = [
  { key: 'ui', label: 'UI', color: '#c084fc', icon: Globe },
  { key: 'service', label: 'Services', color: '#38bdf8', icon: Server },
  { key: 'data', label: 'Data', color: '#fbbf24', icon: Database },
  { key: 'util', label: 'Util', color: '#34d399', icon: Wrench },
  { key: 'config', label: 'Config', color: '#94a3b8', icon: Settings },
];

export const FilterBar = ({
  selectedCategories, hideTests, groupByFolder, onToggleCategory, onToggleHideTests,
  onToggleGroupByFolder, onSelectAllCategories, graph
}: FilterBarProps) => {
  const counts: Record<string, number> = {};
  let testCount = 0;
  if (graph) {
    for (const node of Object.values(graph.nodes)) {
      counts[node.category] = (counts[node.category] || 0) + 1;
      if (node.metadata?.isTest) testCount++;
    }
  }
  const isAllSelected = selectedCategories.size === 0 || selectedCategories.size >= CATEGORIES.length;

  return html`
    <div class="atlas-filter-bar">
      <div class="filter-group-left">
        <span class="filter-label">${Filter(12)}<span>Filter:</span></span>
        <button class=${`filter-pill ${isAllSelected ? 'active' : ''}`} onClick=${onSelectAllCategories} title="Show all architectural categories">
          ${Layers(13)}<span>All</span>${graph && html`<span class="pill-count">${Object.keys(graph.nodes).length}</span>`}
        </button>
        ${CATEGORIES.map(({ key, label, color, icon: Icon }) => {
          const isSelected = selectedCategories.has(key);
          const count = counts[key] || 0;
          if (count === 0) return null;
          return html`
            <button key=${key} class=${`filter-pill category-pill-btn ${isSelected ? 'active' : ''}`} onClick=${() => onToggleCategory(key)} title=${`Toggle ${label}`} style=${{ borderColor: isSelected ? color : undefined, color: isSelected ? color : undefined }}>
              ${Icon(12, { color })}<span>${label}</span><span class="pill-count">${count}</span>
            </button>
          `;
        })}
      </div>
      <div class="filter-group-right">
        <button class=${`filter-pill folder-pill-btn ${groupByFolder ? 'active' : ''}`} onClick=${onToggleGroupByFolder} title=${groupByFolder ? 'Disable Folder Grouping' : 'Group nodes into directory boundary boxes (Full Map)'}>
          ${FolderTree(12)}<span>Group by Folder</span>
        </button>
        ${testCount > 0 && html`
          <button class=${`filter-pill test-pill-btn ${hideTests ? 'active' : ''}`} onClick=${onToggleHideTests} title=${hideTests ? 'Show test files' : 'Hide test files (.test. / .spec.)'}>
            ${EyeOff(12)}<span>Hide Tests</span><span class="pill-count">${testCount}</span>
          </button>
        `}
      </div>
    </div>
  `;
};
