import React, { useEffect, useRef, useState } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';
import { DependencyGraph, FileCategory, ImpactResult, ViewMode } from './types';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

export interface GraphCanvasProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  impactResult: ImpactResult | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  viewMode?: ViewMode;
  onSelectFile: (fileId: string) => void;
  onOpenInGitHub?: (fileId: string) => void;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
  name: string;
  relativePath: string;
  category: FileCategory;
  fanIn: number;
  fanOut: number;
  lineCount: number;
}

interface SimEdge extends SimulationLinkDatum<SimNode> {
  id: string;
  source: string | SimNode;
  target: string | SimNode;
}

const CATEGORY_COLORS: Record<FileCategory, string> = {
  ui: '#38bdf8', // sky
  service: '#a855f7', // purple
  data: '#22c55e', // emerald
  util: '#f59e0b', // amber
  config: '#94a3b8', // slate
  other: '#64748b', // neutral
};

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graph,
  activeFileId,
  impactResult,
  selectedCategories,
  searchTerm,
  onSelectFile,
  onOpenInGitHub,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<any>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map());

  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{
    node: SimNode | null;
    isPan: boolean;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    hasMoved: boolean;
  }>({
    node: null,
    isPan: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    hasMoved: false,
  });

  // Re-build simulation data when graph changes
  useEffect(() => {
    if (!graph || Object.keys(graph.nodes).length === 0) return;

    const visibleNodeIds = new Set<string>();
    const simNodes: SimNode[] = [];

    // Filter nodes by category and search
    for (const [id, node] of Object.entries(graph.nodes)) {
      if (!selectedCategories.has(node.category)) continue;
      if (searchTerm && !id.toLowerCase().includes(searchTerm.toLowerCase())) continue;

      visibleNodeIds.add(id);
      simNodes.push({
        id,
        name: node.name,
        relativePath: node.relativePath,
        category: node.category,
        fanIn: node.importedBy.length,
        fanOut: node.imports.length,
        lineCount: node.lineCount,
      });
    }

    const simEdges: SimEdge[] = [];
    for (const edge of graph.edges) {
      if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
        simEdges.push({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        });
      }
    }

    nodesRef.current = simNodes;
    edgesRef.current = simEdges;
    nodeMapRef.current = new Map(simNodes.map((n) => [n.id, n]));

    // D3 force simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = forceSimulation(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(70)
      )
      .force('charge', forceManyBody().strength(-180).distanceMax(500))
      .force('collide', forceCollide().radius((d: any) => Math.min(24, 8 + Math.sqrt(d.fanIn || 1) * 3) + 6))
      .force('center', forceCenter(0, 0))
      .alphaDecay(0.04);

    simulationRef.current = sim;

    // Center view
    transformRef.current = { x: 0, y: 0, scale: 0.9 };

    return () => {
      sim.stop();
    };
  }, [graph, selectedCategories, searchTerm]);

  // Render loop
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Background grid dots
      const { x: tx, y: ty, scale } = transformRef.current;
      const cx = rect.width / 2 + tx;
      const cy = rect.height / 2 + ty;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Draw Grid
      const gridSize = 40;
      const minX = -cx / scale;
      const maxX = (rect.width - cx) / scale;
      const minY = -cy / scale;
      const maxY = (rect.height - cy) / scale;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      const startX = Math.floor(minX / gridSize) * gridSize;
      const startY = Math.floor(minY / gridSize) * gridSize;
      for (let gx = startX; gx < maxX; gx += gridSize) {
        for (let gy = startY; gy < maxY; gy += gridSize) {
          ctx.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
        }
      }

      const affectedSet = new Set(impactResult?.affectedNodes.map((n) => n.id) || []);
      const directSet = new Set(
        impactResult?.affectedNodes.filter((n) => n.isDirect).map((n) => n.id) || []
      );
      const importsSet = new Set(
        activeFileId && graph?.nodes[activeFileId] ? graph.nodes[activeFileId].imports : []
      );

      // 1. Draw Edges
      for (const edge of edgesRef.current) {
        const src = edge.source as SimNode;
        const tgt = edge.target as SimNode;
        if (!src.x || !src.y || !tgt.x || !tgt.y) continue;

        const isConnectedToActive =
          activeFileId && (src.id === activeFileId || tgt.id === activeFileId);
        const isImpactEdge =
          activeFileId && (tgt.id === activeFileId && affectedSet.has(src.id));

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (isImpactEdge) {
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.9;
        } else if (isConnectedToActive) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.85;
        } else if (activeFileId) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.2;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = 0.6;
        }

        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // 2. Draw Nodes
      for (const node of nodesRef.current) {
        if (!node.x || !node.y) continue;

        const isSelected = activeFileId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isDirectImpact = directSet.has(node.id);
        const isIndirectImpact = !isDirectImpact && affectedSet.has(node.id);
        const isImport = importsSet.has(node.id);

        const baseRadius = Math.min(18, 6 + Math.sqrt(node.fanIn || 1) * 2.2);
        let radius = baseRadius;
        if (isSelected) radius += 4;
        else if (isHovered) radius += 2;

        let fillColor = CATEGORY_COLORS[node.category] || '#94a3b8';
        let strokeColor = 'rgba(255, 255, 255, 0.2)';
        let strokeWidth = 1.5;
        let nodeAlpha = 1;

        if (activeFileId) {
          if (isSelected) {
            fillColor = '#D9F65A'; // Lime highlight for selected
            strokeColor = '#ffffff';
            strokeWidth = 3;
          } else if (isDirectImpact) {
            fillColor = '#ea580c'; // Red-orange for direct blast radius
            strokeColor = '#fdba74';
            strokeWidth = 2.5;
          } else if (isIndirectImpact) {
            fillColor = '#f97316'; // Orange for indirect
            strokeColor = '#fed7aa';
            strokeWidth = 2;
          } else if (isImport) {
            fillColor = '#38bdf8'; // Blue for imported dependency
            strokeColor = '#bae6fd';
            strokeWidth = 2;
          } else {
            nodeAlpha = 0.25;
          }
        }

        // Outer Glow for selected/impact
        if (isSelected || isDirectImpact) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? 'rgba(217, 246, 90, 0.2)' : 'rgba(234, 88, 12, 0.25)';
          ctx.fill();
          ctx.restore();
        }

        // Draw Node Circle
        ctx.save();
        ctx.globalAlpha = nodeAlpha;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // Node Label (when zoomed in or hovered/selected)
        const showLabel = scale > 0.7 || isSelected || isHovered || node.fanIn > 2;
        if (showLabel) {
          ctx.font = isSelected
            ? 'bold 12px "Geist Mono", monospace'
            : '10.5px "Geist Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = isSelected ? '#D9F65A' : '#f8fafc';
          ctx.fillText(node.name, node.x, node.y + radius + 12);
        }

        ctx.restore();
      }

      ctx.restore();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeFileId, hoveredNode, impactResult, graph]);

  // Find node under mouse coordinates
  const getNodeAt = (screenX: number, screenY: number): SimNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { x: tx, y: ty, scale } = transformRef.current;
    const cx = rect.width / 2 + tx;
    const cy = rect.height / 2 + ty;

    const graphX = (screenX - rect.left - cx) / scale;
    const graphY = (screenY - rect.top - cy) / scale;

    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      if (!node.x || !node.y) continue;
      const r = Math.min(20, 8 + Math.sqrt(node.fanIn || 1) * 2.5) + 6;
      const dx = graphX - node.x;
      const dy = graphY - node.y;
      if (dx * dx + dy * dy <= r * r) {
        return node;
      }
    }
    return null;
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const node = getNodeAt(e.clientX, e.clientY);
    dragRef.current = {
      node,
      isPan: !node,
      startX: e.clientX,
      startY: e.clientY,
      startTx: transformRef.current.x,
      startTy: transformRef.current.y,
      hasMoved: false,
    };

    if (node && simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
      node.fx = node.x;
      node.fy = node.y;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (drag.isPan) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.hasMoved = true;
      transformRef.current.x = drag.startTx + dx;
      transformRef.current.y = drag.startTy + dy;
    } else if (drag.node) {
      drag.hasMoved = true;
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const { x: tx, y: ty, scale } = transformRef.current;
        const cx = rect.width / 2 + tx;
        const cy = rect.height / 2 + ty;
        drag.node.fx = (e.clientX - rect.left - cx) / scale;
        drag.node.fy = (e.clientY - rect.top - cy) / scale;
      }
    } else {
      // Hover detection
      const node = getNodeAt(e.clientX, e.clientY);
      setHoveredNode(node);
      if (node) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (drag.node) {
      drag.node.fx = null;
      drag.node.fy = null;
      if (simulationRef.current) simulationRef.current.alphaTarget(0);
    }

    if (!drag.hasMoved) {
      const clicked = getNodeAt(e.clientX, e.clientY);
      if (clicked) {
        onSelectFile(clicked.id);
      }
    }

    dragRef.current = {
      node: null,
      isPan: false,
      startX: 0,
      startY: 0,
      startTx: 0,
      startTy: 0,
      hasMoved: false,
    };
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const clicked = getNodeAt(e.clientX, e.clientY);
    if (clicked && onOpenInGitHub) {
      onOpenInGitHub(clicked.id);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newScale = Math.max(0.15, Math.min(4, transformRef.current.scale * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    transformRef.current.x -= (mouseX - transformRef.current.x) * (zoomFactor - 1);
    transformRef.current.y -= (mouseY - transformRef.current.y) * (zoomFactor - 1);
    transformRef.current.scale = newScale;
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    transformRef.current.scale = Math.max(0.15, Math.min(4, transformRef.current.scale * delta));
  };

  const handleReset = () => {
    transformRef.current = { x: 0, y: 0, scale: 0.9 };
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `atlas-${graph?.repoName.replace('/', '-') || 'graph'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#0B1420] select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl">
        <button
          onClick={() => handleZoom(1.2)}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Reset View"
        >
          <Maximize2 size={16} />
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
        <button
          onClick={handleExportPng}
          className="p-2 text-[#D9F65A] hover:bg-[#D9F65A]/10 rounded-lg transition-colors"
          title="Export PNG"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed pointer-events-none z-50 bg-slate-950/95 border border-white/20 text-white rounded-lg p-2.5 shadow-2xl text-xs backdrop-blur-md max-w-xs"
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y + 16}px`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[hoveredNode.category] }}
            />
            <span className="font-mono font-bold truncate">{hoveredNode.name}</span>
          </div>
          <div className="text-slate-400 font-mono text-[10.5px] truncate mb-2">
            {hoveredNode.relativePath}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1.5 border-t border-white/10">
            <div>Dependents: <span className="font-mono text-white font-bold">{hoveredNode.fanIn}</span></div>
            <div>Imports: <span className="font-mono text-white font-bold">{hoveredNode.fanOut}</span></div>
            <div>Lines: <span className="font-mono text-white">{hoveredNode.lineCount}</span></div>
            <div className="capitalize">Category: <span className="text-sky-300 font-semibold">{hoveredNode.category}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
