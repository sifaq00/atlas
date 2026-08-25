import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';
import { DependencyGraph, FileCategory, ImpactResult, ViewMode, GraphPhysicsLayout, IsolationMode } from './types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Folder,
  X,
  Layers,
  GitPullRequest,
  Network,
  Cpu,
  Eye,
} from 'lucide-react';

export interface GraphCanvasProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  selectedFolder?: string | null;
  impactResult: ImpactResult | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  viewMode?: ViewMode;
  tracedPath?: string[] | null;
  onSelectFile: (fileId: string) => void;
  onClearFolder?: () => void;
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
  topFolder: string;
}

interface SimEdge extends SimulationLinkDatum<SimNode> {
  id: string;
  source: string | SimNode;
  target: string | SimNode;
}

// Architectural Layer Vertical Centers (Top-to-Bottom Flow)
const LAYER_Y_TARGETS: Record<FileCategory, number> = {
  ui: -170,
  service: -50,
  data: 60,
  util: 160,
  config: 230,
  other: 0,
};

// EXACT color palette from Atlas VS Code Extension
export const CATEGORY_COLORS: Record<
  FileCategory,
  { bg: string; border: string; glow: string; text: string }
> = {
  ui: { bg: '#8b5cf6', border: '#c4b5fd', glow: 'rgba(139, 92, 246, 0.4)', text: '#e9d5ff' },
  service: { bg: '#06b6d4', border: '#a5f3fc', glow: 'rgba(6, 182, 212, 0.4)', text: '#cffafe' },
  data: { bg: '#f59e0b', border: '#fde68a', glow: 'rgba(245, 158, 11, 0.4)', text: '#fef3c7' },
  util: { bg: '#10b981', border: '#a7f3d0', glow: 'rgba(16, 185, 129, 0.4)', text: '#d1fae5' },
  config: { bg: '#64748b', border: '#cbd5e1', glow: 'rgba(100, 116, 139, 0.4)', text: '#f1f5f9' },
  other: { bg: '#71717a', border: '#d4d4d8', glow: 'rgba(113, 113, 122, 0.3)', text: '#e4e4e7' },
};

const NODE_RADIUS = (fanIn: number) => Math.min(18, 5 + Math.sqrt(fanIn || 1) * 2.2);

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graph,
  activeFileId,
  selectedFolder,
  impactResult,
  selectedCategories,
  searchTerm,
  tracedPath,
  onSelectFile,
  onClearFolder,
  onOpenInGitHub,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<any>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map());

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [layoutPreset, setLayoutPreset] = useState<GraphPhysicsLayout>('hierarchical');
  const [isolationMode, setIsolationMode] = useState<IsolationMode>('full');
  const [showLegend, setShowLegend] = useState(false);

  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const targetTransformRef = useRef<{ x: number; y: number; scale: number } | null>(null);

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

  // Re-build simulation data when graph, filters, isolation, or layout change
  useEffect(() => {
    if (!graph || Object.keys(graph.nodes).length === 0) return;

    // Subgraph Isolation filter
    let isolatedNodeIds: Set<string> | null = null;
    if (activeFileId && isolationMode !== 'full') {
      isolatedNodeIds = new Set<string>([activeFileId]);
      // 1-hop
      for (const edge of graph.edges) {
        if (edge.source === activeFileId) isolatedNodeIds.add(edge.target);
        if (edge.target === activeFileId) isolatedNodeIds.add(edge.source);
      }
      // 2-hop
      if (isolationMode === '2-hop') {
        const twoHop = new Set(isolatedNodeIds);
        for (const edge of graph.edges) {
          if (isolatedNodeIds.has(edge.source)) twoHop.add(edge.target);
          if (isolatedNodeIds.has(edge.target)) twoHop.add(edge.source);
        }
        isolatedNodeIds = twoHop;
      }
    }

    const existingMap = nodeMapRef.current;
    const visibleNodeIds = new Set<string>();
    const simNodes: SimNode[] = [];
    const topFolders = new Set<string>();

    for (const [id, node] of Object.entries(graph.nodes)) {
      if (isolatedNodeIds && !isolatedNodeIds.has(id)) continue;
      if (!selectedCategories.has(node.category)) continue;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = id.toLowerCase().includes(q) || node.name.toLowerCase().includes(q) || node.relativePath.toLowerCase().includes(q);
        if (!matches) continue;
      }

      const pathParts = node.relativePath.split('/');
      const topFolder = pathParts.length > 1 ? pathParts[0] : 'root';
      topFolders.add(topFolder);

      visibleNodeIds.add(id);
      const existing = existingMap.get(id);

      simNodes.push({
        id,
        name: node.name,
        relativePath: node.relativePath,
        category: node.category,
        fanIn: node.importedBy.length,
        fanOut: node.imports.length,
        lineCount: node.lineCount,
        topFolder,
        x: existing?.x,
        y: existing?.y,
        vx: existing?.vx,
        vy: existing?.vy,
        fx: existing?.fx,
        fy: existing?.fy,
      });
    }

    const folderList = Array.from(topFolders);
    const folderXOffset: Record<string, number> = {};
    if (folderList.length > 1) {
      const step = Math.min(300, 700 / (folderList.length - 1));
      folderList.forEach((f, idx) => {
        folderXOffset[f] = (idx - (folderList.length - 1) / 2) * step;
      });
    } else if (folderList.length === 1) {
      folderXOffset[folderList[0]] = 0;
    }

    const simEdges: SimEdge[] = [];
    for (const edge of graph.edges) {
      if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
        simEdges.push({
          id: `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
        });
      }
    }

    nodesRef.current = simNodes;
    edgesRef.current = simEdges;
    nodeMapRef.current = new Map(simNodes.map((n) => [n.id, n]));

    if (simulationRef.current) simulationRef.current.stop();

    const sim = forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(layoutPreset === 'organic' ? 85 : 70)
          .strength(layoutPreset === 'organic' ? 0.6 : 0.4)
      )
      .force(
        'charge',
        forceManyBody().strength(layoutPreset === 'organic' ? -280 : -200)
      )
      .force('center', forceCenter(0, 0).strength(0.04))
      .force(
        'collide',
        forceCollide()
          .radius((d: any) => NODE_RADIUS(d.fanIn) + 16)
          .iterations(3)
      )
      .alphaDecay(0.025);

    // Apply layout-specific guiding forces
    if (layoutPreset === 'hierarchical') {
      sim.force(
        'y',
        forceY<SimNode>((d) => LAYER_Y_TARGETS[d.category] ?? 0).strength(0.28)
      );
      sim.force(
        'x',
        forceX<SimNode>((d) => folderXOffset[d.topFolder] ?? 0).strength(folderList.length > 1 ? 0.18 : 0.05)
      );
    } else if (layoutPreset === 'cluster') {
      sim.force(
        'x',
        forceX<SimNode>((d) => folderXOffset[d.topFolder] ?? 0).strength(0.35)
      );
      sim.force(
        'y',
        forceY<SimNode>((d) => (LAYER_Y_TARGETS[d.category] ?? 0) * 0.4).strength(0.15)
      );
    }

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [
    graph,
    selectedCategories,
    searchTerm,
    layoutPreset,
    isolationMode === 'full' ? 'full' : `${isolationMode}-${activeFileId}`,
  ]);

  // Smoothly auto-focus camera onto selected folder nodes or active file
  useEffect(() => {
    if (!selectedFolder && !activeFileId) return;

    let targetNodes: SimNode[] = [];
    if (selectedFolder) {
      targetNodes = nodesRef.current.filter(
        (n) => n.relativePath === selectedFolder || n.relativePath.startsWith(selectedFolder + '/')
      );
    } else if (activeFileId) {
      const activeNode = nodeMapRef.current.get(activeFileId);
      if (activeNode) targetNodes = [activeNode];
    }

    if (targetNodes.length === 0) return;

    let sumX = 0;
    let sumY = 0;
    let validCount = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const n of targetNodes) {
      if (n.x == null || n.y == null) continue;
      sumX += n.x;
      sumY += n.y;
      validCount++;
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }

    if (validCount === 0) return;

    const cx = sumX / validCount;
    const cy = sumY / validCount;
    const spanX = Math.max(160, maxX - minX);
    const spanY = Math.max(160, maxY - minY);

    const canvas = canvasRef.current;
    const width = canvas ? canvas.clientWidth : 800;
    const height = canvas ? canvas.clientHeight : 600;

    if (activeFileId && !selectedFolder) {
      // Only lerp camera if the clicked node is offscreen
      const { x: tx, y: ty, scale } = transformRef.current;
      const screenX = width / 2 + tx + cx * scale;
      const screenY = height / 2 + ty + cy * scale;
      const isOffscreen =
        screenX < 80 || screenX > width - 80 || screenY < 80 || screenY > height - 80;
      if (!isOffscreen) {
        // Node is already in view, don't jerk the camera
        return;
      }
    }

    const targetScale = selectedFolder
      ? Math.min(2.2, Math.max(0.65, Math.min((width - 160) / spanX, (height - 160) / spanY)))
      : transformRef.current.scale;

    targetTransformRef.current = {
      x: -cx * targetScale,
      y: -cy * targetScale,
      scale: targetScale,
    };
  }, [selectedFolder, activeFileId]);

  // Get neighboring nodes for hover focus
  const getNeighbors = useCallback((nodeId: string): Set<string> => {
    const neighbors = new Set<string>();
    neighbors.add(nodeId);
    for (const edge of edgesRef.current) {
      const srcId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgtId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      if (srcId === nodeId) neighbors.add(tgtId);
      if (tgtId === nodeId) neighbors.add(srcId);
    }
    return neighbors;
  }, []);

  // Render loop identical to VS Code extension webview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const time = performance.now();
      const animOffset = (time * 0.04) % 1000;

      // Smooth camera interpolation (lerping)
      if (targetTransformRef.current && !dragRef.current.isPan) {
        const target = targetTransformRef.current;
        const lerpFactor = 0.12;
        transformRef.current.x += (target.x - transformRef.current.x) * lerpFactor;
        transformRef.current.y += (target.y - transformRef.current.y) * lerpFactor;
        transformRef.current.scale += (target.scale - transformRef.current.scale) * lerpFactor;

        if (
          Math.abs(target.x - transformRef.current.x) < 0.5 &&
          Math.abs(target.y - transformRef.current.y) < 0.5 &&
          Math.abs(target.scale - transformRef.current.scale) < 0.005
        ) {
          targetTransformRef.current = null;
        }
      }

      // Resize canvas to match display size
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

      // Grid background
      const { x: tx, y: ty, scale } = transformRef.current;
      const gridSize = 40 * scale;
      const startX = ((width / 2 + tx) % gridSize) - gridSize;
      const startY = ((height / 2 + ty) % gridSize) - gridSize;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x < width + gridSize; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height + gridSize; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Transform coordinate space
      ctx.save();
      ctx.translate(width / 2 + tx, height / 2 + ty);
      ctx.scale(scale, scale);

      const affectedSet = new Set(impactResult?.affectedNodes.map((n) => n.id) || []);
      const directSet = new Set(
        impactResult?.affectedNodes.filter((n) => n.isDirect).map((n) => n.id) || []
      );
      const isImpactMode = !!activeFileId;

      // Dimmed set on hover
      let dimmedSet: Set<string> | null = null;
      if (hoveredNodeId) {
        const neighbors = getNeighbors(hoveredNodeId);
        dimmedSet = new Set<string>();
        for (const n of nodesRef.current) {
          if (!neighbors.has(n.id)) dimmedSet.add(n.id);
        }
      }

      // Viewport Frustum Culling bounds
      const vMargin = 120;
      const vMinX = (-width / 2 - tx) / scale - vMargin;
      const vMaxX = (width / 2 - tx) / scale + vMargin;
      const vMinY = (-height / 2 - ty) / scale - vMargin;
      const vMaxY = (height / 2 - ty) / scale + vMargin;

      const isNodeInView = (n: SimNode) => {
        if (n.x == null || n.y == null) return false;
        return n.x >= vMinX && n.x <= vMaxX && n.y >= vMinY && n.y <= vMaxY;
      };

      // Folder membership set
      const inFolderSet = new Set(
        selectedFolder
          ? nodesRef.current
              .filter((n) => n.relativePath === selectedFolder || n.relativePath.startsWith(selectedFolder + '/'))
              .map((n) => n.id)
          : []
      );

      // 0. Draw Folder Cluster Boundary Hulls (Visual Island Bubbles)
      const folderGroups = new Map<string, SimNode[]>();
      for (const n of nodesRef.current) {
        if (!n.topFolder) continue;
        if (!folderGroups.has(n.topFolder)) folderGroups.set(n.topFolder, []);
        folderGroups.get(n.topFolder)!.push(n);
      }

      folderGroups.forEach((fNodes, folderName) => {
        if (fNodes.length < 2) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of fNodes) {
          if (n.x != null && n.y != null) {
            minX = Math.min(minX, n.x);
            maxX = Math.max(maxX, n.x);
            minY = Math.min(minY, n.y);
            maxY = Math.max(maxY, n.y);
          }
        }
        if (minX === Infinity) return;
        const pad = 24;
        const rx = minX - pad;
        const ry = minY - pad;
        const rw = (maxX - minX) + pad * 2;
        const rh = (maxY - minY) + pad * 2;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, rw, rh, 14);
        } else {
          ctx.rect(rx, ry, rw, rh);
        }
        ctx.fill();
        ctx.stroke();

        // Tag label
        ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`📁 ${folderName}`, rx + 8, ry + 14);
        ctx.restore();
      });

      // 1. Draw Edges with Directional Arrowheads and Animated Dashes (Extension Style)
      for (const edge of edgesRef.current) {
        const src = edge.source as SimNode;
        const tgt = edge.target as SimNode;
        if (!src.x || !src.y || !tgt.x || !tgt.y) continue;
        if (!isNodeInView(src) && !isNodeInView(tgt)) continue;

        const isSrcActive = activeFileId === src.id;
        const isTgtActive = activeFileId === tgt.id;
        const isConnectedToActive = isSrcActive || isTgtActive;
        const isHoverConnected = hoveredNodeId && (src.id === hoveredNodeId || tgt.id === hoveredNodeId);
        const isHighlighted = isConnectedToActive || isHoverConnected;
        const isFolderEdge = selectedFolder && inFolderSet.has(src.id) && inFolderSet.has(tgt.id);

        // Check if edge is in traced path
        let isPathEdge = false;
        if (tracedPath && tracedPath.length > 1) {
          for (let i = 0; i < tracedPath.length - 1; i++) {
            if (tracedPath[i] === src.id && tracedPath[i + 1] === tgt.id) {
              isPathEdge = true;
              break;
            }
          }
        }

        let baseOpacity = 0.28;
        let strokeColor = '100, 116, 139'; // Slate 500
        let strokeHex = '#64748b';
        let lineWidth = 1.2;
        let particleColor = '#94a3b8';
        let particleSize = 1.8;
        let lineDash = [5, 7];

        if (isPathEdge) {
          // TRACED PATH MODE - Radiant Neon Lime
          baseOpacity = 0.98;
          strokeColor = '217, 246, 90';
          strokeHex = '#D9F65A';
          lineWidth = 3.2;
          particleColor = '#D9F65A';
          particleSize = 3.8;
          lineDash = [6, 4];
        } else if (isImpactMode) {
          // BLAST RADIUS MODE - Crimson Red (Direct) vs Warning Gold (Cascade)
          const isDirectBlast = isSrcActive || isTgtActive;
          if (isDirectBlast) {
            baseOpacity = 0.92;
            strokeColor = '239, 68, 68';
            strokeHex = '#ef4444';
            lineWidth = 2.6;
            particleColor = '#ff2d55';
            particleSize = 3.2;
            lineDash = [6, 4];
          } else {
            baseOpacity = 0.6;
            strokeColor = '245, 158, 11';
            strokeHex = '#f59e0b';
            lineWidth = 1.1;
            particleColor = '#fbbf24';
            particleSize = 1.8;
            lineDash = [3, 4];
          }
        } else if (isFolderEdge) {
          baseOpacity = 0.85;
          strokeColor = '217, 246, 90';
          strokeHex = '#D9F65A';
          lineWidth = 2.0;
          particleColor = '#D9F65A';
          particleSize = 2.5;
          lineDash = [5, 4];
        } else if (isHighlighted) {
          baseOpacity = 0.8;
          strokeColor = '56, 189, 248';
          strokeHex = '#38bdf8';
          lineWidth = 2.0;
          particleColor = '#38bdf8';
          particleSize = 2.8;
          lineDash = [6, 4];
        } else if (tracedPath && !isPathEdge) {
          baseOpacity = 0.04;
        } else if (dimmedSet && (dimmedSet.has(src.id) || dimmedSet.has(tgt.id))) {
          baseOpacity = 0.05;
        }

        // Base solid line
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = `rgba(${strokeColor}, ${baseOpacity})`;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash([]);
        ctx.stroke();

        // Animated flowing dashed line
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = isImpactMode
          ? strokeHex === '#ef4444'
            ? 'rgba(239, 68, 68, 0.95)'
            : 'rgba(245, 158, 11, 0.75)'
          : isFolderEdge
          ? 'rgba(217, 246, 90, 0.95)'
          : isHighlighted
          ? 'rgba(56, 189, 248, 0.95)'
          : 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(lineDash);
        ctx.lineDashOffset = -animOffset;
        ctx.stroke();
        ctx.setLineDash([]);

        // Flowing particle pulse along the connection
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 20) {
          const speed = isImpactMode ? 2.2 : 1.8;
          const tProgress = ((animOffset * speed + (Math.abs(src.x || 0) % 10) * 12) % dist) / dist;
          const px = src.x + dx * tProgress;
          const py = src.y + dy * tProgress;
          ctx.beginPath();
          ctx.arc(px, py, particleSize, 0, Math.PI * 2);
          ctx.fillStyle = particleColor;
          if (isImpactMode || isFolderEdge) {
            ctx.shadowColor = particleColor;
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Directional arrowhead pointing from source -> target
        const angle = Math.atan2(dy, dx);
        const tgtRadius = NODE_RADIUS(tgt.fanIn) + 3;
        const arrowX = tgt.x - Math.cos(angle) * tgtRadius;
        const arrowY = tgt.y - Math.sin(angle) * tgtRadius;
        const arrowSize = isImpactMode
          ? strokeHex === '#ef4444'
            ? 7.5
            : 4.5
          : isFolderEdge || isHighlighted
          ? 6.5
          : 5;

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
          arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = strokeHex;
        ctx.fill();
      }

      // 2. Draw Category Nodes (Grouped and styled exactly like Extension)
      const categoryGroups: Record<string, SimNode[]> = {};
      for (const node of nodesRef.current) {
        if (node.x == null || node.y == null || !isNodeInView(node)) continue;
        if (!categoryGroups[node.category]) categoryGroups[node.category] = [];
        categoryGroups[node.category].push(node);
      }

      const showDetailedLabels = scale > 0.38;

      for (const [cat, catNodes] of Object.entries(categoryGroups)) {
        const colors = CATEGORY_COLORS[cat as FileCategory] || CATEGORY_COLORS.other;

        // Draw fills
        ctx.fillStyle = colors.bg;
        ctx.beginPath();
        for (const node of catNodes) {
          const r = NODE_RADIUS(node.fanIn);
          ctx.moveTo(node.x! + r, node.y!);
          ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2);
        }
        ctx.fill();

        // Draw borders
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const node of catNodes) {
          const r = NODE_RADIUS(node.fanIn);
          ctx.moveTo(node.x! + r, node.y!);
          ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2);
        }
        ctx.stroke();

        // Draw Labels
        ctx.fillStyle = colors.text;
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (const node of catNodes) {
          if (activeFileId === node.id) continue; // Skip active node, drawn below with highlight
          if (!showDetailedLabels && node.fanIn < 2 && hoveredNodeId !== node.id) continue; // LOD: Skip tiny labels when zoomed far out
          const r = NODE_RADIUS(node.fanIn);
          const dimmed =
            (dimmedSet && dimmedSet.has(node.id)) ||
            (selectedFolder && !inFolderSet.has(node.id)) ||
            (activeFileId && !directSet.has(node.id) && !affectedSet.has(node.id) && activeFileId !== node.id);

          if (dimmed) ctx.globalAlpha = 0.15;
          ctx.fillText(node.name, node.x!, node.y! + r + 4);
          if (dimmed) ctx.globalAlpha = 1;
        }
      }

      // 3. Draw Active Node Highlight Ring & Pulsing Ripple (Extension Style)
      if (activeFileId) {
        const activeNode = nodeMapRef.current.get(activeFileId);
        if (activeNode && activeNode.x != null && activeNode.y != null) {
          const r = NODE_RADIUS(activeNode.fanIn);

          // Animated Sonic Ripple
          const wavePeriod = 1800;
          const waveProgress = (time % wavePeriod) / wavePeriod;
          const waveRadius = r + waveProgress * 24;
          const waveOpacity = Math.max(0, (1 - waveProgress) * 0.5);

          ctx.save();
          ctx.beginPath();
          ctx.arc(activeNode.x, activeNode.y, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${waveOpacity})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Active Glow & Target Border
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(activeNode.x, activeNode.y, r + 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(activeNode.x, activeNode.y, r + 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Crisp active label
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 12px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(activeNode.name, activeNode.x, activeNode.y + r + 5);
          ctx.restore();
        }
      }

      // 4. Draw Hovered Node Outline
      if (hoveredNodeId) {
        const hNode = nodeMapRef.current.get(hoveredNodeId);
        if (hNode && hNode.x != null && hNode.y != null) {
          const r = NODE_RADIUS(hNode.fanIn);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(hNode.x, hNode.y, r + 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();
      ctx.restore();

      // 5. Draw Interactive Minimap Canvas
      const mmCanvas = minimapRef.current;
      if (mmCanvas && nodesRef.current.length > 0) {
        const mmCtx = mmCanvas.getContext('2d');
        if (mmCtx) {
          const mmW = mmCanvas.width;
          const mmH = mmCanvas.height;
          mmCtx.clearRect(0, 0, mmW, mmH);

          let minX = -400, maxX = 400, minY = -400, maxY = 400;
          for (const n of nodesRef.current) {
            if (n.x != null && n.y != null) {
              minX = Math.min(minX, n.x);
              maxX = Math.max(maxX, n.x);
              minY = Math.min(minY, n.y);
              maxY = Math.max(maxY, n.y);
            }
          }
          const graphW = Math.max(200, maxX - minX + 200);
          const graphH = Math.max(200, maxY - minY + 200);
          const mmScale = Math.min((mmW - 16) / graphW, (mmH - 16) / graphH);
          const midX = (minX + maxX) / 2;
          const midY = (minY + maxY) / 2;

          const toMmX = (gx: number) => mmW / 2 + (gx - midX) * mmScale;
          const toMmY = (gy: number) => mmH / 2 + (gy - midY) * mmScale;

          for (const n of nodesRef.current) {
            if (n.x == null || n.y == null) continue;
            const mx = toMmX(n.x);
            const my = toMmY(n.y);
            const isAct = n.id === activeFileId;
            const colors = CATEGORY_COLORS[n.category] || CATEGORY_COLORS.other;

            mmCtx.beginPath();
            mmCtx.arc(mx, my, isAct ? 3.5 : 1.8, 0, Math.PI * 2);
            mmCtx.fillStyle = isAct ? '#D9F65A' : colors.bg;
            mmCtx.fill();
          }

          const vpLeft = (-width / 2 - tx) / scale;
          const vpTop = (-height / 2 - ty) / scale;
          const vpRight = (width / 2 - tx) / scale;
          const vpBottom = (height / 2 - ty) / scale;

          const mmVpX = toMmX(vpLeft);
          const mmVpY = toMmY(vpTop);
          const mmVpW = (vpRight - vpLeft) * mmScale;
          const mmVpH = (vpBottom - vpTop) * mmScale;

          mmCtx.strokeStyle = '#38bdf8';
          mmCtx.lineWidth = 1.2;
          mmCtx.fillStyle = 'rgba(56, 189, 248, 0.08)';
          mmCtx.fillRect(mmVpX, mmVpY, mmVpW, mmVpH);
          mmCtx.strokeRect(mmVpX, mmVpY, mmVpW, mmVpH);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeFileId, selectedFolder, hoveredNodeId, impactResult, tracedPath, getNeighbors]);

  // Find node under mouse coordinates
  const getNodeAt = (screenX: number, screenY: number): SimNode | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { x: tx, y: ty, scale } = transformRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const cx = width / 2 + tx;
    const cy = height / 2 + ty;

    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const graphX = (canvasX - cx) / scale;
    const graphY = (canvasY - cy) / scale;

    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      if (node.x == null || node.y == null) continue;
      const r = Math.max(24, NODE_RADIUS(node.fanIn) + 12);
      const dx = graphX - node.x;
      const dy = graphY - node.y;
      if (dx * dx + dy * dy <= r * r) {
        return node;
      }
    }
    return null;
  };

  // Global window release to prevent sticky pan/drag
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (dragRef.current.node) {
        if (simulationRef.current) simulationRef.current.alphaTarget(0);
      }
      dragRef.current.isPan = false;
      dragRef.current.node = null;
    };

    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('pointerup', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('pointerup', handleGlobalRelease);
    };
  }, []);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click pans/drags
    targetTransformRef.current = null; // Cancel any active camera lerp
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
    if (drag.isPan && e.buttons === 1) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.hasMoved = true;
      transformRef.current.x = drag.startTx + dx;
      transformRef.current.y = drag.startTy + dy;
    } else if (drag.node && e.buttons === 1) {
      drag.hasMoved = true;
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const { x: tx, y: ty, scale } = transformRef.current;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const cx = width / 2 + tx;
        const cy = height / 2 + ty;
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const targetX = (canvasX - cx) / scale;
        const targetY = (canvasY - cy) / scale;

        drag.node.fx = targetX;
        drag.node.fy = targetY;
        drag.node.x = targetX;
        drag.node.y = targetY;

        if (simulationRef.current) {
          simulationRef.current.alpha(0.3).restart();
        }
      }
    } else {
      // Hover detection
      const node = getNodeAt(e.clientX, e.clientY);
      setHoveredNodeId(node ? node.id : null);
      if (node) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (drag.node) {
      // Keep node pinned at its dragged position
      if (simulationRef.current) simulationRef.current.alphaTarget(0);
    }

    if (!drag.hasMoved && e.button === 0) {
      const clicked = getNodeAt(e.clientX, e.clientY);
      if (clicked) {
        onSelectFile(clicked.id);
      }
    }

    dragRef.current.isPan = false;
    dragRef.current.node = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const clicked = getNodeAt(e.clientX, e.clientY);
    if (clicked) {
      // Double click a node unpins it back to organic physics
      clicked.fx = null;
      clicked.fy = null;
      if (simulationRef.current) simulationRef.current.alpha(0.3).restart();
      if (onOpenInGitHub) {
        onOpenInGitHub(clicked.id);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    targetTransformRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.15, Math.min(4, transformRef.current.scale * zoomFactor));

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    transformRef.current.x -= (mouseX - transformRef.current.x) * (zoomFactor - 1);
    transformRef.current.y -= (mouseY - transformRef.current.y) * (zoomFactor - 1);
    transformRef.current.scale = newScale;
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    targetTransformRef.current = null;
    transformRef.current.scale = Math.max(0.15, Math.min(4, transformRef.current.scale * delta));
  };

  const handleReset = () => {
    for (const n of nodesRef.current) {
      n.fx = null;
      n.fy = null;
    }
    if (simulationRef.current) simulationRef.current.alpha(1).restart();
    targetTransformRef.current = { x: 0, y: 0, scale: 0.9 };
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `atlas-${graph?.repoName.replace('/', '-') || 'graph'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const folderMatchingCount = selectedFolder
    ? nodesRef.current.filter((n) => n.relativePath === selectedFolder || n.relativePath.startsWith(selectedFolder + '/')).length
    : 0;

  const hoveredNode = hoveredNodeId ? nodeMapRef.current.get(hoveredNodeId) : null;

  return (
    <div
      ref={containerRef}
      data-lenis-prevent
      className="relative w-full h-full bg-[#0B1420] select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full block select-none ${
          dragRef.current.node
            ? 'cursor-grabbing'
            : hoveredNodeId
            ? 'cursor-grab'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {/* Top Controls: Layout Presets, Subgraph Isolation, & Legend */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-2">
        {/* Layout Physics Selector */}
        <div className="flex items-center bg-slate-950/90 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-2xl text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setLayoutPreset('hierarchical')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutPreset === 'hierarchical'
                ? 'bg-[#D9F65A]/20 text-[#D9F65A] font-bold border border-[#D9F65A]/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Layered Top-to-Bottom Flow"
          >
            <Network size={12} />
            <span className="hidden sm:inline">Flow</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutPreset('organic')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutPreset === 'organic'
                ? 'bg-sky-400/20 text-sky-300 font-bold border border-sky-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Organic Free Physics Springs"
          >
            <Cpu size={12} />
            <span className="hidden sm:inline">Organic</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutPreset('cluster')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              layoutPreset === 'cluster'
                ? 'bg-purple-400/20 text-purple-300 font-bold border border-purple-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Grouped by Parent Folders"
          >
            <Layers size={12} />
            <span className="hidden sm:inline">Clusters</span>
          </button>
        </div>

        {/* Subgraph Isolation Filter */}
        <div className="flex items-center bg-slate-950/90 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-2xl text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setIsolationMode('full')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              isolationMode === 'full'
                ? 'bg-white/15 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Show All Files"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setIsolationMode('1-hop')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              isolationMode === '1-hop'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Isolate 1-Hop Connected Neighborhood"
          >
            1-Hop
          </button>
          <button
            type="button"
            onClick={() => setIsolationMode('2-hop')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              isolationMode === '2-hop'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Isolate 2-Hop Connected Cascade"
          >
            2-Hop
          </button>
        </div>

        {/* Legend Button */}
        <button
          type="button"
          onClick={() => setShowLegend(!showLegend)}
          className={`h-8 px-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/15 text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-2xl transition-all ${
            showLegend ? 'text-[#D9F65A] border-[#D9F65A]/40' : 'text-slate-400 hover:text-white'
          }`}
          title="Toggle Dynamic Legend"
        >
          <Eye size={12} />
          <span className="hidden sm:inline">Legend</span>
        </button>

        {/* PR Indicator Badge if PR Analyzed */}
        {graph?.pullNumber && (
          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-xl text-xs font-mono shadow-xl animate-pulse">
            <GitPullRequest size={13} />
            <span>PR #{graph.pullNumber} Visualized</span>
            {graph.prChangedFiles && (
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded text-emerald-200">
                {graph.prChangedFiles.length} changed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Interactive Legend Dropdown Card */}
      {showLegend && (
        <div className="absolute top-16 left-6 z-30 w-64 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 shadow-2xl font-mono text-xs text-slate-200 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white text-[11px] uppercase tracking-wider">
              Layer Distribution
            </span>
            <button
              onClick={() => setShowLegend(false)}
              className="p-0.5 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>

          <div className="space-y-1.5">
            {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => {
              const count = nodesRef.current.filter((n) => n.category === cat).length;
              return (
                <div
                  key={cat}
                  className="flex items-center justify-between px-2 py-1 bg-white/[0.03] rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    />
                    <span className="capitalize text-slate-300 font-semibold">{cat}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{count} files</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Active Folder Badge */}
      {selectedFolder && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md border border-[#D9F65A]/40 px-4 py-2 rounded-full shadow-2xl text-xs font-mono animate-in fade-in zoom-in duration-200">
          <Folder size={14} className="text-[#D9F65A]" />
          <span className="text-slate-400">Focused Folder:</span>
          <span className="text-[#D9F65A] font-bold">{selectedFolder}</span>
          <span className="text-slate-500 text-[11px]">
            ({folderMatchingCount} files)
          </span>
          {onClearFolder && (
            <button
              type="button"
              onClick={onClearFolder}
              className="ml-1 p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Reset Folder Filter"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Floating Interactive Minimap Radar & Info Chips */}
      <div className="absolute bottom-6 left-6 flex items-end gap-3 z-20">
        {/* Radar Minimap */}
        <div className="relative bg-slate-950/90 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-2xl overflow-hidden group">
          <canvas
            ref={minimapRef}
            width={140}
            height={85}
            className="rounded-lg bg-slate-900/90 cursor-pointer block"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;

              let minX = -400, maxX = 400, minY = -400, maxY = 400;
              for (const n of nodesRef.current) {
                if (n.x != null && n.y != null) {
                  minX = Math.min(minX, n.x);
                  maxX = Math.max(maxX, n.x);
                  minY = Math.min(minY, n.y);
                  maxY = Math.max(maxY, n.y);
                }
              }
              const graphW = Math.max(200, maxX - minX + 200);
              const graphH = Math.max(200, maxY - minY + 200);
              const mmScale = Math.min((140 - 16) / graphW, (85 - 16) / graphH);
              const midX = (minX + maxX) / 2;
              const midY = (minY + maxY) / 2;

              const targetWorldX = (clickX - 70) / mmScale + midX;
              const targetWorldY = (clickY - 42.5) / mmScale + midY;

              targetTransformRef.current = {
                x: -targetWorldX * transformRef.current.scale,
                y: -targetWorldY * transformRef.current.scale,
                scale: transformRef.current.scale,
              };
            }}
          />
          <span className="absolute top-2 left-2.5 text-[8.5px] font-mono text-slate-400 pointer-events-none uppercase tracking-wider font-bold">
            Minimap
          </span>
        </div>

        {/* Info Chips */}
        <div className="px-3 py-1.5 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-xl text-[11px] font-mono text-slate-300 shadow-xl flex items-center gap-2 pointer-events-none mb-0.5">
          <span>Nodes: <strong className="text-[#D9F65A]">{nodesRef.current.length}</strong></span>
          <span className="text-white/20">•</span>
          <span>Edges: <strong className="text-sky-400">{edgesRef.current.length}</strong></span>
          {activeFileId && (
            <>
              <span className="text-white/20">•</span>
              <span className="text-amber-300 truncate max-w-[140px]">{activeFileId.split('/').pop()}</span>
            </>
          )}
        </div>
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl z-20">
        <button
          onClick={() => handleZoom(1.2)}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => handleZoom(0.8)}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Reset View"
        >
          <Maximize2 size={16} />
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
        <button
          onClick={handleExportPng}
          className="p-2 text-[#D9F65A] hover:bg-[#D9F65A]/10 rounded-lg transition-colors cursor-pointer"
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
              style={{ backgroundColor: CATEGORY_COLORS[hoveredNode.category]?.bg || '#94a3b8' }}
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
