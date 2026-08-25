import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DependencyGraph, FileCategory, FileNode } from './types';
import { CATEGORY_COLORS } from './GraphCanvas';
import { Orbit, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface RadialViewProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  onSelectFile: (fileId: string) => void;
}

interface RadialNode {
  id: string;
  name: string;
  relativePath: string;
  category: FileCategory;
  fanIn: number;
  fanOut: number;
  lineCount: number;
  radius: number;
  angle: number;
  x: number;
  y: number;
}

const TIER_RADII: Record<FileCategory, number> = {
  data: 90,     // Epicenter: Core Models & Types
  config: 160,  // Inner Ring: Config & Constants
  service: 240, // Middle Ring: Services & Controllers
  ui: 330,      // Outer Ring: UI & Views
  util: 410,    // Periphery: Utils & Helpers
  other: 200,
};

export const RadialView: React.FC<RadialViewProps> = ({
  graph,
  activeFileId,
  selectedCategories,
  searchTerm,
  onSelectFile,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const transformRef = useRef({ x: 0, y: 0, scale: 0.9, rotation: 0 });
  const dragRef = useRef<{ isPan: boolean; startX: number; startY: number; startTx: number; startTy: number; startRot: number }>({
    isPan: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    startRot: 0,
  });

  // Compute radial node positions in concentric orbits
  const { radialNodes, nodeMap } = useMemo(() => {
    if (!graph || Object.keys(graph.nodes).length === 0) {
      return { radialNodes: [], nodeMap: new Map<string, RadialNode>() };
    }

    const filtered = Object.values(graph.nodes).filter((n) => {
      if (!selectedCategories.has(n.category)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = n.id.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) || n.relativePath.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    // Group by category to distribute evenly along each ring
    const categoryGroups: Record<FileCategory, FileNode[]> = {
      data: [],
      config: [],
      service: [],
      ui: [],
      util: [],
      other: [],
    };

    for (const node of filtered) {
      if (categoryGroups[node.category]) {
        categoryGroups[node.category].push(node);
      } else {
        categoryGroups.other.push(node);
      }
    }

    const calculatedNodes: RadialNode[] = [];
    const map = new Map<string, RadialNode>();

    for (const [cat, nodes] of Object.entries(categoryGroups) as Array<[FileCategory, FileNode[]]>) {
      const radius = TIER_RADII[cat] || 200;
      const count = nodes.length;
      if (count === 0) continue;

      nodes.forEach((node, idx) => {
        const angle = (idx / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const radNode: RadialNode = {
          id: node.id,
          name: node.name,
          relativePath: node.relativePath,
          category: node.category,
          fanIn: node.importedBy.length,
          fanOut: node.imports.length,
          lineCount: node.lineCount,
          radius,
          angle,
          x,
          y,
        };

        calculatedNodes.push(radNode);
        map.set(node.id, radNode);
      });
    }

    return { radialNodes: calculatedNodes, nodeMap: map };
  }, [graph, selectedCategories, searchTerm]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const time = performance.now();
      const animOffset = (time * 0.03) % 1000;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const { x: tx, y: ty, scale, rotation } = transformRef.current;
      const cx = width / 2 + tx;
      const cy = height / 2 + ty;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.rotate(rotation);

      // 1. Draw Concentric Orbit Rings
      const ringLabels: Array<{ radius: number; label: string; color: string }> = [
        { radius: TIER_RADII.data, label: 'Data & State Epicenter', color: 'rgba(245, 158, 11, 0.25)' },
        { radius: TIER_RADII.config, label: 'Config Orbit', color: 'rgba(100, 116, 139, 0.2)' },
        { radius: TIER_RADII.service, label: 'Services Orbit', color: 'rgba(6, 182, 212, 0.25)' },
        { radius: TIER_RADII.ui, label: 'UI Presentation Orbit', color: 'rgba(139, 92, 246, 0.25)' },
        { radius: TIER_RADII.util, label: 'Utility Periphery', color: 'rgba(16, 185, 129, 0.2)' },
      ];

      for (const ring of ringLabels) {
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ring Label
        ctx.save();
        ctx.rotate(-rotation);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '500 10px Inter, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ring.label, 0, -ring.radius - 4);
        ctx.restore();
      }

      // 2. Draw Curved Dependency Edges
      if (graph) {
        for (const edge of graph.edges) {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) continue;

          const isConnected = activeFileId && (activeFileId === src.id || activeFileId === tgt.id);
          const isHovered = hoveredNodeId && (hoveredNodeId === src.id || hoveredNodeId === tgt.id);
          const isHighlight = isConnected || isHovered;

          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          // Curve towards center slightly
          const midX = (src.x + tgt.x) * 0.4;
          const midY = (src.y + tgt.y) * 0.4;
          ctx.quadraticCurveTo(midX, midY, tgt.x, tgt.y);

          ctx.strokeStyle = isHighlight
            ? 'rgba(56, 189, 248, 0.85)'
            : 'rgba(148, 163, 184, 0.12)';
          ctx.lineWidth = isHighlight ? 2 : 1;
          ctx.stroke();

          // Animated particle on active/hovered edge
          if (isHighlight) {
            const tProgress = ((animOffset * 1.5) % 100) / 100;
            const px = (1 - tProgress) * (1 - tProgress) * src.x + 2 * (1 - tProgress) * tProgress * midX + tProgress * tProgress * tgt.x;
            const py = (1 - tProgress) * (1 - tProgress) * src.y + 2 * (1 - tProgress) * tProgress * midY + tProgress * tProgress * tgt.y;

            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // 3. Draw Nodes
      for (const node of radialNodes) {
        const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.other;
        const isActive = activeFileId === node.id;
        const isHovered = hoveredNodeId === node.id;
        const r = Math.min(16, 5 + Math.sqrt(node.fanIn) * 2);

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#0284c7' : colors.bg;
        ctx.fill();

        ctx.strokeStyle = isActive ? '#ffffff' : colors.border;
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        if (isHovered && !isActive) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (isActive) {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Counter-rotate text so labels remain right-side up
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.rotate(-rotation);

        ctx.fillStyle = isActive ? '#ffffff' : colors.text;
        ctx.font = isActive ? '700 11px Inter, sans-serif' : '600 10.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.name, 0, r + 4);
        ctx.restore();
      }

      ctx.restore();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [radialNodes, activeFileId, hoveredNodeId, nodeMap, graph]);

  // Find node under mouse
  const getNodeAt = (screenX: number, screenY: number): RadialNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { x: tx, y: ty, scale, rotation } = transformRef.current;
    const cx = rect.width / 2 + tx;
    const cy = rect.height / 2 + ty;

    const dx = (screenX - rect.left - cx) / scale;
    const dy = (screenY - rect.top - cy) / scale;

    // Rotate point backwards
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const graphX = dx * cos - dy * sin;
    const graphY = dx * sin + dy * cos;

    for (let i = radialNodes.length - 1; i >= 0; i--) {
      const node = radialNodes[i];
      const r = Math.max(18, Math.min(16, 5 + Math.sqrt(node.fanIn) * 2) + 8);
      const ndx = graphX - node.x;
      const ndy = graphY - node.y;
      if (ndx * ndx + ndy * ndy <= r * r) {
        return node;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      isPan: true,
      startX: e.clientX,
      startY: e.clientY,
      startTx: transformRef.current.x,
      startTy: transformRef.current.y,
      startRot: transformRef.current.rotation,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 0 && dragRef.current.isPan) {
      dragRef.current.isPan = false;
    }

    if (dragRef.current.isPan && e.buttons === 1) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      transformRef.current.x = dragRef.current.startTx + dx;
      transformRef.current.y = dragRef.current.startTy + dy;
    } else {
      const node = getNodeAt(e.clientX, e.clientY);
      setHoveredNodeId(node ? node.id : null);
      if (node) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const clicked = getNodeAt(e.clientX, e.clientY);
      if (clicked) {
        onSelectFile(clicked.id);
      }
    }
    dragRef.current.isPan = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.9;
    transformRef.current.scale = Math.max(0.2, Math.min(3, transformRef.current.scale * zoomFactor));
  };

  const handleRotate = (dir: number) => {
    transformRef.current.rotation += dir * (Math.PI / 12);
  };

  const handleReset = () => {
    transformRef.current = { x: 0, y: 0, scale: 0.9, rotation: 0 };
  };

  const hoveredNode = hoveredNodeId ? nodeMap.get(hoveredNodeId) : null;

  return (
    <div
      ref={containerRef}
      data-lenis-prevent
      className="relative w-full h-full bg-[#0B1420] select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Floating Header Info */}
      <div className="absolute top-4 left-6 flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-mono text-slate-300 shadow-xl pointer-events-none">
        <Orbit size={14} className="text-[#D9F65A]" />
        <span>Concentric Architecture Orbit</span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl z-20">
        <button
          onClick={() => handleRotate(-1)}
          className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-mono transition-colors cursor-pointer"
          title="Rotate Left"
        >
          ↺
        </button>
        <button
          onClick={() => handleRotate(1)}
          className="px-2 py-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-mono transition-colors cursor-pointer"
          title="Rotate Right"
        >
          ↻
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
        <button
          onClick={() => { transformRef.current.scale = Math.min(3, transformRef.current.scale * 1.2); }}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => { transformRef.current.scale = Math.max(0.2, transformRef.current.scale * 0.8); }}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Reset Orbit"
        >
          <Maximize2 size={15} />
        </button>
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed pointer-events-none z-50 bg-slate-950/95 border border-white/20 text-white rounded-lg p-2.5 shadow-2xl text-xs backdrop-blur-md max-w-xs font-mono"
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y + 16}px`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[hoveredNode.category]?.bg || '#94a3b8' }}
            />
            <span className="font-bold truncate">{hoveredNode.name}</span>
          </div>
          <div className="text-slate-400 text-[10.5px] truncate mb-2">
            {hoveredNode.relativePath}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1.5 border-t border-white/10">
            <div>Dependents: <strong className="text-emerald-400">{hoveredNode.fanIn}</strong></div>
            <div>Imports: <strong className="text-sky-300">{hoveredNode.fanOut}</strong></div>
            <div>Lines: <strong className="text-white">{hoveredNode.lineCount}</strong></div>
            <div className="capitalize">Tier: <strong className="text-amber-300">{hoveredNode.category}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
