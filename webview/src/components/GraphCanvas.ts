import { h } from 'preact';
import { forwardRef } from 'preact/compat';
import { useEffect, useRef, useImperativeHandle, useCallback } from 'preact/hooks';
import { html } from 'htm/preact';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import { DependencyGraph, FileCategory, FileNode, ImpactResult, ViewMode } from '../../../src/graph/model';
import { ImpactAnalyzer } from '../../../src/graph/blast';
import { CATEGORY_COLORS } from '../theme/cytoscapeStyles';
import { ZoomIn, ZoomOut, Maximize2 } from '../icons';

export interface GraphCanvasHandle {
  fit: () => void;
  centerNode: (nodeId: string) => void;
  exportPng: () => string;
  getMermaidMarkdown: () => string;
}

interface GraphCanvasProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  viewMode: ViewMode;
  impactResult: ImpactResult | null;
  selectedCategories?: Set<FileCategory>;
  hideTests?: boolean;
  groupByFolder?: boolean;
  onSelectFile: (fileId: string) => void;
  onOpenInEditor: (fileId: string) => void;
  onStatsChange?: (nodes: number, edges: number) => void;
}

interface GraphNode extends SimulationNodeDatum {
  id: string;
  name: string;
  category: FileCategory;
  relativePath: string;
  fanIn: number;
  isContainer?: boolean;
}

interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

const CATEGORY_ORDER: FileCategory[] = ['ui', 'service', 'data', 'util', 'config', 'other'];
const NODE_RADIUS = (fanIn: number) => Math.min(16, 4 + Math.sqrt(fanIn) * 1.5);

const IMPACT_COLORS = {
  target: '#0284c7',
  targetBorder: '#38bdf8',
  direct: '#ea580c',
  directBorder: '#fdba74',
  indirect: '#c2410c',
  indirectBorder: '#fed7aa'
};

export const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(({
  graph, activeFileId, viewMode, impactResult, selectedCategories, hideTests = false,
  groupByFolder = false, onSelectFile, onOpenInEditor, onStatsChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());
  const simulationRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{
    nodeId: string | null;
    isPan: boolean;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    offsetX: number;
    offsetY: number;
    hasMoved: boolean;
  }>({
    nodeId: null,
    isPan: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
    offsetX: 0,
    offsetY: 0,
    hasMoved: false
  });
  const hoveredNodeRef = useRef<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickNodeRef = useRef<string | null>(null);
  const onSelectFileRef = useRef(onSelectFile);
  const onOpenInEditorRef = useRef(onOpenInEditor);
  const viewModeRef = useRef(viewMode);
  onSelectFileRef.current = onSelectFile;
  onOpenInEditorRef.current = onOpenInEditor;
  viewModeRef.current = viewMode;

  const shouldIncludeNode = useCallback((node: FileNode): boolean => {
    if (hideTests && node.metadata?.isTest) return false;
    if (selectedCategories && selectedCategories.size > 0) { if (!selectedCategories.has(node.category)) return false; }
    return true;
  }, [hideTests, selectedCategories]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current;
    return { x: (sx - t.x) / t.scale, y: (sy - t.y) / t.scale };
  }, []);

  const hitTest = useCallback((wx: number, wy: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.x == null || n.y == null) continue;
      const r = Math.max(18, NODE_RADIUS(n.fanIn) + 8);
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  }, []);

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

  const onStatsChangeRef = useRef(onStatsChange);
  onStatsChangeRef.current = onStatsChange;
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animOffsetRef = useRef<number>(0);
  const animLoopIdRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    const t = transformRef.current;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const hovered = hoveredNodeRef.current;
    const active = activeFileId;

    const isNodeActive = (nodeId: string, nodeRelPath?: string): boolean => {
      if (!active) return false;
      if (nodeId === active || nodeRelPath === active) return true;
      const n1 = nodeId.replace(/\\/g, '/').toLowerCase();
      const n2 = (nodeRelPath || '').replace(/\\/g, '/').toLowerCase();
      const a = active.replace(/\\/g, '/').toLowerCase();
      return n1 === a || (n2.length > 0 && n2 === a) || n1.endsWith('/' + a) || a.endsWith('/' + n2);
    };

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(t.x, t.y);
    ctx.scale(t.scale, t.scale);

    const nodeMap = nodeMapRef.current;

    let dimmedSet: Set<string> | null = null;
    if (hovered) {
      const neighbors = getNeighbors(hovered);
      dimmedSet = new Set<string>();
      for (const n of nodes) { if (!neighbors.has(n.id)) dimmedSet.add(n.id); }
    }

    const animOffset = animOffsetRef.current;

    const isImpactMode = viewMode === 'impact';

    for (const edge of edges) {
      const src = typeof edge.source === 'string' ? nodeMap.get(edge.source) : edge.source;
      const tgt = typeof edge.target === 'string' ? nodeMap.get(edge.target) : edge.target;
      if (!src || !tgt || src.x == null || src.y == null || tgt.x == null || tgt.y == null) continue;
      const srcId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const tgtId = typeof edge.target === 'string' ? edge.target : edge.target.id;

      const isSrcActive = isNodeActive(srcId, src.relativePath);
      const isTgtActive = isNodeActive(tgtId, tgt.relativePath);
      const isConnectedToActive = active && (isSrcActive || isTgtActive);
      const isHoverConnected = hovered && (srcId === hovered || tgtId === hovered);
      const isHighlighted = isConnectedToActive || isHoverConnected;

      let baseOpacity = 0.28;
      let strokeColor = '100, 116, 139'; // Slate 500
      let strokeHex = '#64748b';
      let lineWidth = 1.2;
      let particleColor = '#94a3b8';
      let particleSize = 1.8;
      let lineDash = [5, 7];

      if (isImpactMode) {
        // BLAST RADIUS MODE - Bold Crimson Red (Direct) vs Thin Amber Gold (Cascade)
        const isDirectBlast = isSrcActive || isTgtActive;
        if (isDirectBlast) {
          // Direct L1 Blast impact (Fiery Neon Crimson Red)
          baseOpacity = 0.90;
          strokeColor = '239, 68, 68'; // Crimson Red
          strokeHex = '#ef4444';
          lineWidth = 2.6;
          particleColor = '#ff2d55'; // Vibrant hot red pulse
          particleSize = 3.4;
          lineDash = [6, 4];
        } else {
          // Downstream L2 / L3 Cascade (Thin Warning Gold / Amber)
          baseOpacity = 0.55;
          strokeColor = '245, 158, 11'; // Warm Gold / Amber
          strokeHex = '#f59e0b';
          lineWidth = 0.95; // Thin and delicate
          particleColor = '#fbbf24'; // Subtle gold particle pulse
          particleSize = 1.6;
          lineDash = [3, 4];
        }
      } else {
        // FOCUS / ARCHITECTURE MAP MODE - Electric Cyan & Cool Slate
        if (isHighlighted) {
          baseOpacity = 0.75;
          strokeColor = '56, 189, 248'; // Cyan
          strokeHex = '#38bdf8';
          lineWidth = 2.0;
          particleColor = '#38bdf8';
          particleSize = 2.8;
        } else if (dimmedSet && (dimmedSet.has(srcId) || dimmedSet.has(tgtId))) {
          baseOpacity = 0.04;
        }
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
        ? (strokeHex === '#ef4444' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(245, 158, 11, 0.75)')
        : (isHighlighted ? 'rgba(56, 189, 248, 0.95)' : 'rgba(148, 163, 184, 0.45)');
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
        const tProgress = ((animOffset * speed) % dist) / dist;
        const px = src.x + dx * tProgress;
        const py = src.y + dy * tProgress;
        ctx.beginPath();
        ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        if (isImpactMode) {
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
      const arrowSize = isImpactMode ? (strokeHex === '#ef4444' ? 7.5 : 4.5) : (isHighlighted ? 6.5 : 5);

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

    const categoryGroups: Record<string, GraphNode[]> = {};
    const specialNodes: GraphNode[] = [];
    for (const node of nodes) {
      if (node.x == null || node.y == null) continue;
      if (node.isContainer) { specialNodes.push(node); continue; }
      if (!categoryGroups[node.category]) categoryGroups[node.category] = [];
      categoryGroups[node.category].push(node);
    }

    for (const [cat, catNodes] of Object.entries(categoryGroups)) {
      const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
      ctx.fillStyle = colors.bg;
      ctx.beginPath();
      for (const node of catNodes) { const r = NODE_RADIUS(node.fanIn); ctx.moveTo(node.x! + r, node.y!); ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2); }
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const node of catNodes) { const r = NODE_RADIUS(node.fanIn); ctx.moveTo(node.x! + r, node.y!); ctx.arc(node.x!, node.y!, r, 0, Math.PI * 2); }
      ctx.stroke();
      ctx.fillStyle = colors.text;
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const node of catNodes) {
        // Skip active node here — its label is drawn once with highlight below to prevent double text stacking!
        if (isNodeActive(node.id, node.relativePath)) continue;
        const r = NODE_RADIUS(node.fanIn);
        const dimmed = dimmedSet?.has(node.id);
        if (dimmed) ctx.globalAlpha = 0.15;
        ctx.fillText(node.name, node.x!, node.y! + r + 4);
        if (dimmed) ctx.globalAlpha = 1;
      }
    }

    for (const node of specialNodes) {
      if (node.x == null || node.y == null) continue;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.roundRect(node.x - 40, node.y - 20, 80, 40, 6);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, node.x, node.y);
    }

    if (active) {
      const activeNode = nodes.find(n => isNodeActive(n.id, n.relativePath)) || nodeMap.get(active);
      if (activeNode && activeNode.x != null && activeNode.y != null && !activeNode.isContainer) {
        const r = NODE_RADIUS(activeNode.fanIn);
        ctx.fillStyle = IMPACT_COLORS.target;
        ctx.strokeStyle = IMPACT_COLORS.targetBorder;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(activeNode.x, activeNode.y, r + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = IMPACT_COLORS.targetBorder;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(activeNode.x, activeNode.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw active node label ONCE with crisp white text
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(activeNode.name, activeNode.x, activeNode.y + r + 5);
      }
    }

    if (hovered) {
      const hNode = nodeMap.get(hovered);
      if (hNode && hNode.x != null && hNode.y != null && !hNode.isContainer) {
        const r = NODE_RADIUS(hNode.fanIn);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hNode.x, hNode.y, r + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [activeFileId, getNeighbors, viewMode]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
    draw();
  }, [draw]);

  const fitView = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) { if (n.x == null || n.y == null) continue; minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y); }
    const padding = 60;
    const cw = canvas.clientWidth || 800;
    const ch = canvas.clientHeight || 600;
    const graphW = Math.max(10, maxX - minX + padding * 2);
    const graphH = Math.max(10, maxY - minY + padding * 2);
    const scale = Math.min(cw / graphW, ch / graphH, 2);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    transformRef.current = { x: cw / 2 - cx * scale, y: ch / 2 - cy * scale, scale: Math.max(0.1, scale) };
    draw();
  }, [draw]);

  const centerNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node || node.x == null || node.y == null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth || 800;
    const ch = canvas.clientHeight || 600;
    const t = transformRef.current;
    transformRef.current = { ...t, x: cw / 2 - node.x * t.scale, y: ch / 2 - node.y * t.scale };
    draw();
  }, [draw]);

  const exportPng = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0);
    return offscreen.toDataURL('image/png');
  }, []);

  const getMermaidMarkdown = useCallback((): string => {
    const nodes = nodesRef.current.filter(n => !n.isContainer);
    const edges = edgesRef.current;
    const lines: string[] = ['graph TD'];
    for (const node of nodes) { const cleanId = node.id.replace(/[^a-zA-Z0-9_]/g, '_'); lines.push(`    ${cleanId}["${node.name}"]`); }
    for (const edge of edges) {
      const src = (typeof edge.source === 'string' ? edge.source : edge.source.id).replace(/[^a-zA-Z0-9_]/g, '_');
      const tgt = (typeof edge.target === 'string' ? edge.target : edge.target.id).replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`    ${src} --> ${tgt}`);
    }
    return '```mermaid\n' + lines.join('\n') + '\n```';
  }, []);

  const rafIdRef = useRef<number | null>(null);

  const scheduleDraw = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      draw();
    });
  }, [draw]);

  useEffect(() => {
    if (!graph || !graph.nodes) return;
    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];
    const addedNodeIds = new Set<string>();

    const findNode = (id: string | null): FileNode | null => {
      if (!id || !graph.nodes) return null;
      if (graph.nodes[id]) return graph.nodes[id];
      const norm = id.replace(/\\/g, '/');
      const normBack = id.replace(/\//g, '\\');
      if (graph.nodes[norm]) return graph.nodes[norm];
      if (graph.nodes[normBack]) return graph.nodes[normBack];
      const lower = id.toLowerCase();
      const lowerNorm = norm.toLowerCase();
      return Object.values(graph.nodes).find(
        (n) => n.id === id || n.relativePath === id || n.id.replace(/\\/g, '/') === norm || n.relativePath.replace(/\\/g, '/') === norm || n.id.toLowerCase() === lower || n.relativePath.toLowerCase() === lower || n.id.replace(/\\/g, '/').toLowerCase() === lowerNorm || n.name.toLowerCase() === lower
      ) || null;
    };

    const activeNode = findNode(activeFileId);

    if (viewMode === 'focus' && activeNode) {
      const upstreamNodes: FileNode[] = [];
      for (const depId of activeNode.imports) {
        const depNode = findNode(depId);
        if (depNode && shouldIncludeNode(depNode)) upstreamNodes.push(depNode);
      }
      const downstreamNodes: FileNode[] = [];
      for (const consumerId of activeNode.importedBy) {
        const consumerNode = findNode(consumerId);
        if (consumerNode && shouldIncludeNode(consumerNode)) downstreamNodes.push(consumerNode);
      }
      upstreamNodes.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
      downstreamNodes.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));

      newNodes.push({ id: activeNode.id, name: activeNode.name, category: activeNode.category, relativePath: activeNode.relativePath, fanIn: activeNode.importedBy.length, x: 0, y: 0, fx: 0, fy: 0 });
      addedNodeIds.add(activeNode.id);

      const upYStart = -((upstreamNodes.length - 1) * 75) / 2;
      upstreamNodes.forEach((node, idx) => { newNodes.push({ id: node.id, name: node.name, category: node.category, relativePath: node.relativePath, fanIn: node.importedBy.length, x: -360, y: upYStart + idx * 75, fx: -360, fy: upYStart + idx * 75 }); addedNodeIds.add(node.id); });
      const downYStart = -((downstreamNodes.length - 1) * 75) / 2;
      downstreamNodes.forEach((node, idx) => { newNodes.push({ id: node.id, name: node.name, category: node.category, relativePath: node.relativePath, fanIn: node.importedBy.length, x: 360, y: downYStart + idx * 75, fx: 360, fy: downYStart + idx * 75 }); addedNodeIds.add(node.id); });

      for (const edge of graph.edges) { if (addedNodeIds.has(edge.source) && addedNodeIds.has(edge.target)) { newEdges.push({ id: edge.id, source: edge.source, target: edge.target, type: edge.type }); } }
    } else if (viewMode === 'impact') {
      const activeImpact = impactResult || (activeNode ? ImpactAnalyzer.analyze(graph, activeNode.id) : null);
      const targetNode = activeImpact ? (findNode(activeImpact.targetFileId) || activeNode) : activeNode;
      if (targetNode) {
        const directNodes: FileNode[] = [];
        const tier2Nodes: FileNode[] = [];
        const tier3PlusNodes: FileNode[] = [];
        if (activeImpact) {
          for (const affected of activeImpact.affectedNodes) {
            const rawNode = findNode(affected.id);
            if (rawNode && shouldIncludeNode(rawNode)) {
              if (affected.isDirect || affected.depth === 1) directNodes.push(rawNode);
              else if (affected.depth === 2) tier2Nodes.push(rawNode);
              else tier3PlusNodes.push(rawNode);
            }
          }
        }
        const sortNodes = (a: FileNode, b: FileNode) => { const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category); return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name); };
        directNodes.sort(sortNodes); tier2Nodes.sort(sortNodes); tier3PlusNodes.sort(sortNodes);

        newNodes.push({ id: targetNode.id, name: targetNode.name, category: targetNode.category, relativePath: targetNode.relativePath, fanIn: targetNode.importedBy.length, x: 0, y: 0, fx: 0, fy: 0 });
        addedNodeIds.add(targetNode.id);

        const positionTier = (nodes: FileNode[], yLevel: number) => {
          const nodesPerRow = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(nodes.length * 1.6))));
          const xSpacing = 220;
          const ySpacing = 90;
          nodes.forEach((node, index) => {
            const row = Math.floor(index / nodesPerRow);
            const col = index % nodesPerRow;
            const countInThisRow = Math.min(nodesPerRow, nodes.length - row * nodesPerRow);
            const rowXStart = -((countInThisRow - 1) * xSpacing) / 2;
            newNodes.push({ id: node.id, name: node.name, category: node.category, relativePath: node.relativePath, fanIn: node.importedBy.length, x: rowXStart + col * xSpacing, y: yLevel + row * ySpacing, fx: rowXStart + col * xSpacing, fy: yLevel + row * ySpacing, isContainer: false });
            addedNodeIds.add(node.id);
          });
        };

        positionTier(directNodes, 180);
        const directRows = Math.ceil(directNodes.length / 8) || 1;
        const tier2Y = 180 + directRows * 90 + 100;
        positionTier(tier2Nodes, tier2Y);
        const tier2Rows = Math.ceil(tier2Nodes.length / 8) || 1;
        const tier3Y = tier2Y + tier2Rows * 90 + 100;
        positionTier(tier3PlusNodes, tier3Y);

        // Add all connecting edges from graph.edges and activeImpact.impactGraphEdges
        for (const edge of graph.edges) {
          if (addedNodeIds.has(edge.source) && addedNodeIds.has(edge.target)) {
            newEdges.push({ id: edge.id, source: edge.source, target: edge.target, type: edge.type });
          }
        }
        if (activeImpact && activeImpact.impactGraphEdges) {
          for (const edge of activeImpact.impactGraphEdges) {
            if (addedNodeIds.has(edge.source) && addedNodeIds.has(edge.target)) {
              if (!newEdges.some(e => e.id === edge.id || (e.source === edge.source && e.target === edge.target))) {
                newEdges.push({ id: edge.id, source: edge.source, target: edge.target, type: edge.type });
              }
            }
          }
        }
      }
    } else {
      for (const node of Object.values(graph.nodes)) {
        if (!shouldIncludeNode(node)) continue;
        if (groupByFolder) {
          const cleanRel = node.relativePath.replace(/\\/g, '/');
          const segments = cleanRel.split('/');
          const dir = segments.length > 1 ? segments.slice(0, 2).join('/') : 'root';
          if (!addedNodeIds.has(`folder_${dir}`)) { newNodes.push({ id: `folder_${dir}`, name: `📁 ${dir}`, category: 'other', relativePath: dir, fanIn: 0, isContainer: true }); addedNodeIds.add(`folder_${dir}`); }
        }
        newNodes.push({ id: node.id, name: node.name, category: node.category, relativePath: node.relativePath, fanIn: node.importedBy.length });
        addedNodeIds.add(node.id);
      }
      for (const edge of graph.edges) { if (addedNodeIds.has(edge.source) && addedNodeIds.has(edge.target)) { newEdges.push({ id: edge.id, source: edge.source, target: edge.target, type: edge.type }); } }
    }

    nodesRef.current = newNodes;
    edgesRef.current = newEdges;
    nodeMapRef.current.clear();
    for (const n of newNodes) {
      nodeMapRef.current.set(n.id, n);
    }

    if (simulationRef.current) { simulationRef.current.stop(); simulationRef.current = null; }

    if (viewMode === 'full') {
      const sim = forceSimulation(newNodes as SimulationNodeDatum[])
        .force('link', forceLink<GraphNode, GraphEdge>(newEdges).id(d => d.id).distance(120))
        .force('charge', forceManyBody().strength(-180))
        .force('center', forceCenter(0, 0))
        .force('collide', forceCollide().radius(d => NODE_RADIUS((d as unknown as GraphNode).fanIn) + 4))
        .alphaDecay(0.045)
        .alphaMin(0.015)
        .on('tick', scheduleDraw);
      simulationRef.current = sim as ReturnType<typeof forceSimulation>;
    } else {
      draw();
    }

    onStatsChangeRef.current?.(newNodes.filter(n => !n.isContainer).length, newEdges.length);
    if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
    fitTimerRef.current = setTimeout(() => { fitView(); }, viewMode === 'full' ? 400 : 40);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      if (fitTimerRef.current) {
        clearTimeout(fitTimerRef.current);
        fitTimerRef.current = null;
      }
    };
  }, [graph, activeFileId, viewMode, impactResult, selectedCategories, hideTests, groupByFolder, shouldIncludeNode, draw, fitView, scheduleDraw]);

  useEffect(() => {
    let lastTime = performance.now();
    let isTabActive = !document.hidden;

    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
      if (isTabActive && animLoopIdRef.current === null) {
        lastTime = performance.now();
        animLoopIdRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = (now: number) => {
      if (!isTabActive) {
        animLoopIdRef.current = null;
        return;
      }

      const elapsed = now - lastTime;
      // Target lightweight 30-35 FPS on idle (~28ms interval) for ultra-low CPU on potato laptops
      if (elapsed >= 28) {
        const delta = Math.min(0.1, elapsed / 1000);
        lastTime = now - (elapsed % 28);
        animOffsetRef.current = (animOffsetRef.current + delta * 24) % 10000;
        draw();
      }
      animLoopIdRef.current = requestAnimationFrame(animate);
    };

    animLoopIdRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animLoopIdRef.current !== null) {
        cancelAnimationFrame(animLoopIdRef.current);
        animLoopIdRef.current = null;
      }
    };
  }, [draw]);

  const drawRef = useRef(draw);
  drawRef.current = draw;
  const scheduleDrawRef = useRef(scheduleDraw);
  scheduleDrawRef.current = scheduleDraw;
  const screenToWorldRef = useRef(screenToWorld);
  screenToWorldRef.current = screenToWorld;
  const hitTestRef = useRef(hitTest);
  hitTestRef.current = hitTest;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const t = transformRef.current;
      const newScale = Math.max(0.05, Math.min(3.5, t.scale * zoomFactor));
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      transformRef.current = { x: mx - (mx - t.x) * (newScale / t.scale), y: my - (my - t.y) * (newScale / t.scale), scale: newScale };
      scheduleDrawRef.current();
    };
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x: wx, y: wy } = screenToWorldRef.current(sx, sy);
      const hit = hitTestRef.current(wx, wy);

      if (hit && !hit.isContainer) {
        dragRef.current = {
          nodeId: hit.id,
          isPan: false,
          startX: sx,
          startY: sy,
          startTx: transformRef.current.x,
          startTy: transformRef.current.y,
          offsetX: wx - (hit.x ?? 0),
          offsetY: wy - (hit.y ?? 0),
          hasMoved: false
        };
        hit.fx = hit.x;
        hit.fy = hit.y;
        canvas.style.cursor = 'grabbing';
      } else {
        dragRef.current = {
          nodeId: null,
          isPan: true,
          startX: sx,
          startY: sy,
          startTx: transformRef.current.x,
          startTy: transformRef.current.y,
          offsetX: 0,
          offsetY: 0,
          hasMoved: false
        };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const dx = sx - dragRef.current.startX;
      const dy = sy - dragRef.current.startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.hasMoved = true;
      }

      if (dragRef.current.nodeId) {
        const { x: wx, y: wy } = screenToWorldRef.current(sx, sy);
        const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
        if (node) {
          node.x = wx - dragRef.current.offsetX;
          node.y = wy - dragRef.current.offsetY;
          node.fx = node.x;
          node.fy = node.y;
          scheduleDrawRef.current();
        }
      } else if (dragRef.current.isPan) {
        transformRef.current = {
          ...transformRef.current,
          x: dragRef.current.startTx + dx,
          y: dragRef.current.startTy + dy
        };
        scheduleDrawRef.current();
      } else {
        const { x: wx, y: wy } = screenToWorldRef.current(sx, sy);
        const hit = hitTestRef.current(wx, wy);
        const prevHovered = hoveredNodeRef.current;
        hoveredNodeRef.current = hit && !hit.isContainer ? hit.id : null;
        canvas.style.cursor = hit && !hit.isContainer ? 'pointer' : 'grab';
        if (prevHovered !== hoveredNodeRef.current) {
          scheduleDrawRef.current();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (drag.nodeId) {
        const node = nodesRef.current.find(n => n.id === drag.nodeId);
        if (!drag.hasMoved) {
          const now = Date.now();
          if (lastClickNodeRef.current === drag.nodeId && now - lastClickTimeRef.current < 300) {
            onOpenInEditorRef.current(drag.nodeId);
            lastClickTimeRef.current = 0;
            lastClickNodeRef.current = null;
          } else {
            onSelectFileRef.current(drag.nodeId);
            lastClickTimeRef.current = now;
            lastClickNodeRef.current = drag.nodeId;
          }
        }
        if (node) {
          node.fx = node.x;
          node.fy = node.y;
        }
      }
      dragRef.current = {
        nodeId: null,
        isPan: false,
        startX: 0,
        startY: 0,
        startTx: 0,
        startTy: 0,
        offsetX: 0,
        offsetY: 0,
        hasMoved: false
      };
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const { x: wx, y: wy } = screenToWorldRef.current(sx, sy);
      const hit = hitTestRef.current(wx, wy);
      canvas.style.cursor = hit && !hit.isContainer ? 'pointer' : 'grab';
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const { x: wx, y: wy } = screenToWorldRef.current(sx, sy);
        const hit = hitTestRef.current(wx, wy);
        if (hit && !hit.isContainer) {
          dragRef.current = {
            nodeId: hit.id,
            isPan: false,
            startX: sx,
            startY: sy,
            startTx: transformRef.current.x,
            startTy: transformRef.current.y,
            offsetX: wx - (hit.x ?? 0),
            offsetY: wy - (hit.y ?? 0),
            hasMoved: false
          };
          hit.fx = hit.x;
          hit.fy = hit.y;
        } else {
          dragRef.current = {
            nodeId: null,
            isPan: true,
            startX: sx,
            startY: sy,
            startTx: transformRef.current.x,
            startTy: transformRef.current.y,
            offsetX: 0,
            offsetY: 0,
            hasMoved: false
          };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const dx = sx - dragRef.current.startX;
        const dy = sy - dragRef.current.startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragRef.current.hasMoved = true;
        }

        if (dragRef.current.nodeId) {
          const { x: wx, y: wy } = screenToWorldRef.current(sx, sy);
          const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
          if (node) {
            node.x = wx - dragRef.current.offsetX;
            node.y = wy - dragRef.current.offsetY;
            node.fx = node.x;
            node.fy = node.y;
            scheduleDrawRef.current();
          }
        } else if (dragRef.current.isPan) {
          transformRef.current = {
            ...transformRef.current,
            x: dragRef.current.startTx + dx,
            y: dragRef.current.startTy + dy
          };
          scheduleDrawRef.current();
        }
      }
    };

    const handleTouchEnd = () => {
      const drag = dragRef.current;
      if (drag.nodeId) {
        const node = nodesRef.current.find(n => n.id === drag.nodeId);
        if (!drag.hasMoved && node) {
          onSelectFileRef.current(node.id);
        }
        if (node) {
          node.fx = node.x;
          node.fy = node.y;
        }
      }
      dragRef.current = {
        nodeId: null,
        isPan: false,
        startX: 0,
        startY: 0,
        startTx: 0,
        startTy: 0,
        offsetX: 0,
        offsetY: 0,
        hasMoved: false
      };
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const resizeCanvasRef = useRef(resizeCanvas);
  resizeCanvasRef.current = resizeCanvas;

  useEffect(() => {
    resizeCanvasRef.current();
    const observer = new ResizeObserver(() => {
      resizeCanvasRef.current();
    });
    const container = containerRef.current;
    if (container) observer.observe(container);
    const onResize = () => resizeCanvasRef.current();
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleZoomIn = () => {
    const t = transformRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const newScale = Math.min(3.5, t.scale * 1.25);
    transformRef.current = { x: cw / 2 - (cw / 2 - t.x) * (newScale / t.scale), y: ch / 2 - (ch / 2 - t.y) * (newScale / t.scale), scale: newScale };
    draw();
  };
  const handleZoomOut = () => {
    const t = transformRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const newScale = Math.max(0.05, t.scale * 0.8);
    transformRef.current = { x: cw / 2 - (cw / 2 - t.x) * (newScale / t.scale), y: ch / 2 - (ch / 2 - t.y) * (newScale / t.scale), scale: newScale };
    draw();
  };

  useImperativeHandle(ref, () => ({ fit: fitView, centerNode, exportPng, getMermaidMarkdown }));

  return html`
    <div class="graph-canvas-wrapper" style=${{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref=${containerRef} style=${{ width: '100%', height: '100%' }}>
        <canvas ref=${canvasRef} style=${{ width: '100%', height: '100%' }} />
      </div>
      <div class="canvas-floating-controls">
        <button class="floating-ctrl-btn" onClick=${handleZoomIn} title="Zoom In">${ZoomIn(15)}</button>
        <button class="floating-ctrl-btn" onClick=${handleZoomOut} title="Zoom Out">${ZoomOut(15)}</button>
        <button class="floating-ctrl-btn" onClick=${fitView} title="Fit to Viewport">${Maximize2(15)}</button>
      </div>
    </div>
  `;
});
