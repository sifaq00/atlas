import { h } from 'preact';
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { html } from 'htm/preact';
import { DependencyGraph, FileNode } from '../../../src/graph/model';
import { Search, FileCode, ArrowRight, X } from '../icons';

interface SearchModalProps {
  isOpen: boolean;
  graph: DependencyGraph | null;
  onClose: () => void;
  onSelectNode: (fileId: string) => void;
}

export const SearchModal = ({ isOpen, graph, onClose, onSelectNode }: SearchModalProps) => {
  if (!isOpen) return null;

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setQuery(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [isOpen]);

  const nodes = useMemo(() => graph ? Object.values(graph.nodes) : [], [graph]);
  const filteredNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === '') return nodes.slice(0, 10);
    const results: FileNode[] = [];
    for (const n of nodes) {
      if (n.name.toLowerCase().includes(q) || n.relativePath.toLowerCase().includes(q)) {
        results.push(n);
        if (results.length >= 25) break;
      }
    }
    return results;
  }, [nodes, query]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredNodes.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % Math.max(1, filteredNodes.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filteredNodes[selectedIndex]) { onSelectNode(filteredNodes[selectedIndex].id); onClose(); } }
  };

  return html`
    <div class="modal-backdrop" onClick=${onClose}>
      <div class="search-modal" onClick=${(e: Event) => e.stopPropagation()}>
        <div class="search-input-wrap">
          ${Search(18, { class: 'search-input-icon' })}
          <input ref=${inputRef} type="text" class="search-input" placeholder="Search file name or path... (Esc to close)" value=${query} onInput=${(e: Event) => { setQuery((e.target as HTMLInputElement).value); setSelectedIndex(0); }} onKeyDown=${handleKeyDown} />
          <button class="icon-btn subtle-btn" onClick=${onClose}>${X(16)}</button>
        </div>
        <div class="search-results-list">
          ${filteredNodes.length === 0 ? html`<div class="search-empty">No files found matching "${query}"</div>` :
            filteredNodes.map((node, index) => {
              const isSelected = index === selectedIndex;
              return html`
                <div key=${node.id} class=${`search-result-item ${isSelected ? 'selected' : ''}`} onClick=${() => { onSelectNode(node.id); onClose(); }} onMouseEnter=${() => setSelectedIndex(index)}>
                  <div class="result-main">
                    <span class=${`category-pill category-${node.category}`}>${node.category}</span>
                    <span class="result-name">${node.name}</span>
                    <span class="result-path">${node.relativePath}</span>
                  </div>
                  <div class="result-meta">
                    <span class="result-lines">${node.lineCount} lines</span>
                    ${ArrowRight(14, { class: 'result-arrow' })}
                  </div>
                </div>
              `;
            })
          }
        </div>
      </div>
    </div>
  `;
};
