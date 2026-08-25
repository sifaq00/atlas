import React, { useMemo, useState, useRef } from 'react';
import { DependencyGraph, FileCategory } from './types';
import { CATEGORY_COLORS } from './GraphCanvas';
import {
  Grid,
  ArrowRight,
  ArrowDownRight,
  SlidersHorizontal,
  Zap,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface MatrixViewProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  onSelectFile: (fileId: string) => void;
}

type SortMode = 'layer' | 'connections' | 'name' | 'lines';
type CellDensity = 'compact' | 'normal' | 'spacious';

const CELL_SIZES: Record<CellDensity, { cell: number; headerWidth: number; labelSize: string }> = {
  compact: { cell: 20, headerWidth: 180, labelSize: 'text-[9.5px]' },
  normal: { cell: 26, headerWidth: 220, labelSize: 'text-[11px]' },
  spacious: { cell: 34, headerWidth: 260, labelSize: 'text-xs' },
};

export const MatrixView: React.FC<MatrixViewProps> = ({
  graph,
  activeFileId,
  selectedCategories,
  searchTerm,
  onSelectFile,
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('layer');
  const [density, setDensity] = useState<CellDensity>('normal');
  const [hideOrphans, setHideOrphans] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const [hoveredCell, setHoveredCell] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [hoveredColId, setHoveredColId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Build dependency map and bidirectional check
  const { dependencyMap, mutualSet } = useMemo(() => {
    const depMap = new Set<string>();
    const mutual = new Set<string>();
    if (!graph) return { dependencyMap: depMap, mutualSet: mutual };

    for (const edge of graph.edges) {
      depMap.add(`${edge.source}->${edge.target}`);
    }

    // Check mutual dependencies (A -> B and B -> A)
    for (const edge of graph.edges) {
      if (depMap.has(`${edge.target}->${edge.source}`) && edge.source !== edge.target) {
        mutual.add(`${edge.source}->${edge.target}`);
      }
    }

    return { dependencyMap: depMap, mutualSet: mutual };
  }, [graph]);

  // Filter and sort file list
  const fileList = useMemo(() => {
    if (!graph || Object.keys(graph.nodes).length === 0) return [];

    let list = Object.values(graph.nodes).filter((n) => {
      if (!selectedCategories.has(n.category)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) || n.relativePath.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (hideOrphans && n.imports.length === 0 && n.importedBy.length === 0) return false;
      return true;
    });

    const categoryOrder: Record<FileCategory, number> = {
      ui: 1,
      service: 2,
      data: 3,
      util: 4,
      config: 5,
      other: 6,
    };

    list.sort((a, b) => {
      if (sortMode === 'connections') {
        const totalA = a.imports.length + a.importedBy.length;
        const totalB = b.imports.length + b.importedBy.length;
        return totalB - totalA;
      }
      if (sortMode === 'lines') {
        return b.lineCount - a.lineCount;
      }
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name);
      }
      // default: layer
      const catDiff = (categoryOrder[a.category] || 6) - (categoryOrder[b.category] || 6);
      if (catDiff !== 0) return catDiff;
      return a.name.localeCompare(b.name);
    });

    return list.slice(0, 70); // Optimize for up to 70 files
  }, [graph, selectedCategories, searchTerm, sortMode, hideOrphans]);

  // Calculate coupling density percentage
  const couplingDensity = useMemo(() => {
    if (fileList.length <= 1) return 0;
    const maxPossible = fileList.length * (fileList.length - 1);
    let currentInView = 0;
    for (const row of fileList) {
      for (const col of fileList) {
        if (row.id !== col.id && dependencyMap.has(`${row.id}->${col.id}`)) {
          currentInView++;
        }
      }
    }
    return ((currentInView / maxPossible) * 100).toFixed(1);
  }, [fileList, dependencyMap]);

  const handleZoom = (factor: number) => {
    setZoomLevel((prev) => Math.max(0.4, Math.min(2.5, Number((prev * factor).toFixed(2)))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handleZoom(e.deltaY < 0 ? 1.12 : 0.88);
    }
  };

  if (fileList.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-3">
        <Grid size={24} className="opacity-40 text-slate-400" />
        <span>No matching modules available in current filter.</span>
      </div>
    );
  }

  const activeHoveredSource = hoveredCell
    ? graph?.nodes[hoveredCell.sourceId]
    : hoveredRowId
    ? graph?.nodes[hoveredRowId]
    : null;

  const activeHoveredTarget = hoveredCell
    ? graph?.nodes[hoveredCell.targetId]
    : hoveredColId
    ? graph?.nodes[hoveredColId]
    : null;

  const { cell: cellSize, headerWidth, labelSize } = CELL_SIZES[density];

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0B1420] p-4 sm:p-6 flex flex-col gap-4 select-none overflow-hidden relative"
      data-lenis-prevent
      onWheel={handleWheel}
    >
      {/* Top Toolbar & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
            <Grid size={16} className="text-[#D9F65A]" />
            <span>Dependency Coupling Matrix</span>
          </div>
          <p className="text-slate-400 text-xs font-mono mt-0.5">
            Adjacency heatmap: Rows (importers) ➔ Columns (imported modules)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Metrics Pills */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/10 rounded-lg text-slate-300">
            <Zap size={12} className="text-[#D9F65A]" />
            <span>Density: <strong className="text-[#D9F65A]">{couplingDensity}%</strong></span>
            <span className="text-slate-500 mx-1">•</span>
            <span>Modules: <strong className="text-sky-400">{fileList.length}</strong></span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => handleZoom(0.85)}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-1.5 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={() => handleZoom(1.15)}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Cell Size / Density Toggle */}
          <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setDensity('compact')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                density === 'compact' ? 'bg-[#D9F65A] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Cell Grid (S)"
            >
              S
            </button>
            <button
              onClick={() => setDensity('normal')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                density === 'normal' ? 'bg-[#D9F65A] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Normal Cell Grid (M)"
            >
              M
            </button>
            <button
              onClick={() => setDensity('spacious')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                density === 'spacious' ? 'bg-[#D9F65A] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Large Cell Grid (L)"
            >
              L
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1">
            <SlidersHorizontal size={12} className="text-slate-400" />
            <span className="text-slate-400 text-[11px]">Sort:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-mono"
            >
              <option value="layer" className="bg-slate-900 text-white">Tier Layer</option>
              <option value="connections" className="bg-slate-900 text-white">Most Connected</option>
              <option value="lines" className="bg-slate-900 text-white">Code Volume</option>
              <option value="name" className="bg-slate-900 text-white">Alphabetical</option>
            </select>
          </div>

          {/* Hide Orphans Toggle */}
          <button
            type="button"
            onClick={() => setHideOrphans(!hideOrphans)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
              hideOrphans
                ? 'bg-[#D9F65A]/15 border-[#D9F65A]/40 text-[#D9F65A] font-bold'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Filter size={11} />
            <span>Connected Only</span>
          </button>
        </div>
      </div>

      {/* Matrix Scrollable Viewport */}
      <div className="flex-1 overflow-auto border border-white/10 rounded-2xl bg-slate-950/80 shadow-2xl p-4 relative">
        <div
          className="inline-block transition-transform duration-100 ease-out origin-top-left"
          style={{
            transform: `scale(${zoomLevel})`,
            minWidth: `${headerWidth + fileList.length * (cellSize + 4) + 60}px`,
          }}
        >
          {/* Top Column Header (Vertical Text - Zero Overlap) */}
          <div
            className="flex items-end pb-3 sticky top-0 bg-slate-950/95 backdrop-blur-md z-30 border-b border-white/10"
            style={{
              paddingLeft: `${headerWidth}px`,
              height: '190px',
            }}
          >
            {fileList.map((colFile, idx) => {
              const colors = CATEGORY_COLORS[colFile.category] || CATEGORY_COLORS.other;
              const isColHighlighted =
                hoveredColId === colFile.id ||
                (hoveredCell && hoveredCell.targetId === colFile.id) ||
                activeFileId === colFile.id;

              return (
                <div
                  key={colFile.id}
                  onMouseEnter={() => setHoveredColId(colFile.id)}
                  onMouseLeave={() => setHoveredColId(null)}
                  style={{ width: `${cellSize + 4}px` }}
                  className={`h-full flex flex-col justify-end items-center shrink-0 transition-colors relative overflow-hidden pb-1 ${
                    isColHighlighted ? 'bg-white/[0.06] rounded-t-lg' : ''
                  }`}
                  title={`${colFile.name} (${colFile.relativePath})`}
                >
                  <div
                    onClick={() => onSelectFile(colFile.id)}
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      color: isColHighlighted ? '#D9F65A' : colors.text,
                    }}
                    className={`text-[10px] font-mono whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 select-none ${
                      isColHighlighted ? 'font-bold scale-105' : 'hover:font-bold'
                    }`}
                  >
                    <span className="text-slate-500 text-[9px]">{idx + 1}.</span>
                    <span>{colFile.name}</span>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matrix Rows */}
          <div className="flex flex-col gap-1 pt-2">
            {fileList.map((rowFile, rowIdx) => {
              const colors = CATEGORY_COLORS[rowFile.category] || CATEGORY_COLORS.other;
              const isRowHighlighted =
                hoveredRowId === rowFile.id ||
                (hoveredCell && hoveredCell.sourceId === rowFile.id) ||
                activeFileId === rowFile.id;

              return (
                <div
                  key={rowFile.id}
                  onMouseEnter={() => setHoveredRowId(rowFile.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  className={`flex items-center rounded-md transition-colors ${
                    isRowHighlighted ? 'bg-white/[0.08]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Sticky Row Header Label */}
                  <button
                    type="button"
                    onClick={() => onSelectFile(rowFile.id)}
                    className={`pr-4 py-1 text-right ${labelSize} font-mono truncate shrink-0 cursor-pointer flex items-center justify-end gap-2 transition-all sticky left-0 bg-slate-950 z-20 ${
                      isRowHighlighted ? 'font-bold' : ''
                    }`}
                    style={{
                      width: `${headerWidth}px`,
                      color: isRowHighlighted ? '#D9F65A' : colors.text,
                    }}
                    title={rowFile.relativePath}
                  >
                    <span className="text-slate-500 text-[10px]">{rowIdx + 1}.</span>
                    <span className="truncate">{rowFile.name}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: colors.bg }}
                    />
                  </button>

                  {/* Matrix Cells */}
                  <div className="flex items-center gap-1">
                    {fileList.map((colFile) => {
                      const isSelf = rowFile.id === colFile.id;
                      const isConnected = dependencyMap.has(`${rowFile.id}->${colFile.id}`);
                      const isMutual = mutualSet.has(`${rowFile.id}->${colFile.id}`);

                      const isCellHovered =
                        hoveredCell &&
                        hoveredCell.sourceId === rowFile.id &&
                        hoveredCell.targetId === colFile.id;

                      const isInCrosshair =
                        hoveredRowId === rowFile.id ||
                        hoveredColId === colFile.id ||
                        (hoveredCell &&
                          (hoveredCell.sourceId === rowFile.id ||
                            hoveredCell.targetId === colFile.id));

                      return (
                        <div
                          key={colFile.id}
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                          }}
                          onMouseEnter={() =>
                            setHoveredCell({ sourceId: rowFile.id, targetId: colFile.id })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => {
                            if (isConnected) onSelectFile(colFile.id);
                            else onSelectFile(rowFile.id);
                          }}
                          className={`rounded flex items-center justify-center shrink-0 transition-all ${
                            isSelf
                              ? 'bg-slate-900/60 border border-white/5 opacity-40 cursor-default'
                              : isMutual
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer shadow-[0_0_8px_rgba(245,158,11,0.6)] scale-105'
                              : isConnected
                              ? 'bg-sky-400 hover:bg-[#D9F65A] text-slate-950 font-bold cursor-pointer shadow-[0_0_6px_rgba(56,189,248,0.5)] hover:scale-110'
                              : isInCrosshair
                              ? 'bg-white/[0.06] border border-white/5'
                              : 'bg-white/[0.02] hover:bg-white/10'
                          } ${isCellHovered ? 'ring-2 ring-white scale-125 z-20 shadow-2xl' : ''}`}
                          title={
                            isSelf
                              ? `${rowFile.name} (Self)`
                              : isMutual
                              ? `⚠️ Circular / Mutual: ${rowFile.name} ⮂ ${colFile.name}`
                              : isConnected
                              ? `${rowFile.name} ➔ imports ➔ ${colFile.name}`
                              : `${rowFile.name} × ${colFile.name}`
                          }
                        >
                          {isConnected && !isSelf && (
                            <ArrowDownRight
                              size={Math.max(10, cellSize - 12)}
                              className={isMutual ? 'text-amber-950' : 'text-slate-950'}
                            />
                          )}
                          {isSelf && (
                            <span className="text-[9px] text-slate-600 font-mono">╲</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Zoom & Reset Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl z-30 text-xs font-mono">
        <button
          onClick={() => handleZoom(1.2)}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>

        <span className="px-1 text-slate-400 font-mono text-[11px]">
          {Math.round(zoomLevel * 100)}%
        </span>

        <button
          onClick={() => handleZoom(0.8)}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>

        <button
          onClick={handleResetZoom}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Reset Zoom (100%)"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Bottom Crosshair Inspector Bar */}
      {(hoveredCell || hoveredRowId || hoveredColId) && (
        <div className="bg-slate-950/95 border border-white/15 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300 shadow-2xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150 z-20">
          <div className="flex items-center gap-2 flex-wrap">
            {activeHoveredSource && (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[activeHoveredSource.category]?.bg || '#94a3b8',
                  }}
                />
                <strong className="text-white">{activeHoveredSource.name}</strong>
                <span className="text-[10px] text-slate-500">({activeHoveredSource.relativePath})</span>
              </div>
            )}

            {hoveredCell && activeHoveredSource && activeHoveredTarget && (
              <>
                <ArrowRight
                  size={14}
                  className={
                    dependencyMap.has(`${hoveredCell.sourceId}->${hoveredCell.targetId}`)
                      ? 'text-[#D9F65A]'
                      : 'text-slate-600'
                  }
                />
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[activeHoveredTarget.category]?.bg || '#94a3b8',
                    }}
                  />
                  <strong className="text-white">{activeHoveredTarget.name}</strong>
                  <span className="text-[10px] text-slate-500">({activeHoveredTarget.relativePath})</span>
                </div>
              </>
            )}
          </div>

          <div className="text-[11px]">
            {hoveredCell &&
            dependencyMap.has(`${hoveredCell.sourceId}->${hoveredCell.targetId}`) ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                ✓ Direct Dependency Connection
              </span>
            ) : hoveredCell && hoveredCell.sourceId === hoveredCell.targetId ? (
              <span className="text-slate-500">Self Matrix Diagonal</span>
            ) : hoveredCell ? (
              <span className="text-slate-500">No Direct Connection</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
