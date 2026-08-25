import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { DependencyGraph, FileCategory, ImpactResult } from './types';
import { CATEGORY_COLORS } from './GraphCanvas';
import {
  Globe,
  Maximize2,
  Play,
  Pause,
} from 'lucide-react';

interface Graph3DViewProps {
  graph: DependencyGraph | null;
  activeFileId: string | null;
  selectedCategories: Set<FileCategory>;
  searchTerm: string;
  impactResult?: ImpactResult | null;
  onSelectFile: (fileId: string) => void;
}

interface Node3DData {
  id: string;
  name: string;
  relativePath: string;
  category: FileCategory;
  fanIn: number;
  fanOut: number;
  lineCount: number;
  mesh: THREE.Mesh;
  sprite: THREE.Sprite;
  position: THREE.Vector3;
  baseRadius: number;
  material: THREE.MeshStandardMaterial;
  spriteMat: THREE.SpriteMaterial;
}

interface Arc3DData {
  sourceId: string;
  targetId: string;
  curve: THREE.QuadraticBezierCurve3;
  lineMesh: THREE.Line;
  lineMaterial: THREE.LineBasicMaterial;
}

interface EnergyParticle {
  mesh: THREE.Mesh;
  arcIndex: number;
  progress: number;
  speed: number;
}

export const Graph3DView: React.FC<Graph3DViewProps> = ({
  graph,
  activeFileId,
  selectedCategories,
  searchTerm,
  onSelectFile,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodeMapRef = useRef<Map<string, Node3DData>>(new Map());
  const arcsRef = useRef<Arc3DData[]>([]);
  const particlesRef = useRef<EnergyParticle[]>([]);

  // Filter visible nodes
  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    return Object.values(graph.nodes).filter((node) => {
      if (!selectedCategories.has(node.category)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = node.id.toLowerCase().includes(q) || node.name.toLowerCase().includes(q) || node.relativePath.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [graph, selectedCategories, searchTerm]);

  // Create text billboard texture
  const createTextTexture = (text: string, color: string): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 64);
      ctx.fillStyle = color;
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !graph) return;

    // 1. Scene & Camera Setup
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060B12');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 40, 310);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xD9F65A, 1.3);
    dirLight1.position.set(120, 160, 120);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight2.position.set(-120, -120, -120);
    scene.add(dirLight2);

    // 3. Central Wireframe Globe Sphere
    const globeRadius = 110;
    const globeGeo = new THREE.SphereGeometry(globeRadius, 24, 24);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globeMesh);

    // Inner glowing core
    const coreGeo = new THREE.SphereGeometry(18, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 4. Position Nodes on Fibonacci 3D Sphere Surface
    const nodeMap = new Map<string, Node3DData>();
    const nodesList: Node3DData[] = [];
    const N = visibleNodes.length;

    const categorySort: Record<FileCategory, number> = {
      ui: 0,
      service: 1,
      data: 2,
      util: 3,
      config: 4,
      other: 5,
    };
    const sortedNodes = [...visibleNodes].sort(
      (a, b) => (categorySort[a.category] ?? 5) - (categorySort[b.category] ?? 5)
    );

    const sphereNodeGeo = new THREE.SphereGeometry(1, 24, 24);

    sortedNodes.forEach((node, i) => {
      const colors = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.other;
      const baseRadius = Math.max(3.5, Math.min(8.5, 3.5 + Math.sqrt(node.importedBy.length) * 1.5));

      const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(1, N));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = globeRadius * Math.sin(phi) * Math.cos(theta);
      const y = globeRadius * Math.cos(phi);
      const z = globeRadius * Math.sin(phi) * Math.sin(theta);
      const pos = new THREE.Vector3(x, y, z);

      const mat = new THREE.MeshStandardMaterial({
        color: colors.bg,
        emissive: colors.bg,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.7,
        transparent: true,
        opacity: 1.0,
      });

      const mesh = new THREE.Mesh(sphereNodeGeo, mat);
      mesh.scale.set(baseRadius, baseRadius, baseRadius);
      mesh.position.copy(pos);
      mesh.userData = { id: node.id };
      scene.add(mesh);

      // 3D Billboard text sprite
      const texture = createTextTexture(node.name, colors.text);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(22, 5.5, 1);
      const labelPos = pos.clone().normalize().multiplyScalar(globeRadius + baseRadius + 6);
      sprite.position.copy(labelPos);
      scene.add(sprite);

      const nodeData: Node3DData = {
        id: node.id,
        name: node.name,
        relativePath: node.relativePath,
        category: node.category,
        fanIn: node.importedBy.length,
        fanOut: node.imports.length,
        lineCount: node.lineCount,
        mesh,
        sprite,
        position: pos,
        baseRadius,
        material: mat,
        spriteMat,
      };

      nodesList.push(nodeData);
      nodeMap.set(node.id, nodeData);
    });

    nodeMapRef.current = nodeMap;

    // 5. Create Curved 3D Arcs Across Sphere Surface
    const arcs: Arc3DData[] = [];

    for (const edge of graph.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const mid = new THREE.Vector3().addVectors(src.position, tgt.position).multiplyScalar(0.5);
      const dist = src.position.distanceTo(tgt.position);
      const midLen = mid.length();
      if (midLen > 0.01) {
        const lift = dist < globeRadius * 1.2 ? globeRadius * 1.15 : globeRadius * 0.7;
        mid.normalize().multiplyScalar(lift);
      }

      const curve = new THREE.QuadraticBezierCurve3(src.position, mid, tgt.position);
      const points = curve.getPoints(24);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.18,
        linewidth: 1,
      });

      const lineMesh = new THREE.Line(geometry, lineMaterial);
      scene.add(lineMesh);

      arcs.push({
        sourceId: edge.source,
        targetId: edge.target,
        curve,
        lineMesh,
        lineMaterial,
      });
    }

    arcsRef.current = arcs;

    // 6. Create Glowing Energy Flow Particles
    const particleGeo = new THREE.SphereGeometry(1.6, 12, 12);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xD9F65A });
    const particles: EnergyParticle[] = [];

    for (let p = 0; p < Math.min(30, arcs.length); p++) {
      const pMesh = new THREE.Mesh(particleGeo, particleMat);
      pMesh.visible = false;
      scene.add(pMesh);
      particles.push({
        mesh: pMesh,
        arcIndex: p % arcs.length,
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.0015,
      });
    }
    particlesRef.current = particles;

    // 7. Camera Orbit & Drag Controls
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;
    let cameraAngleX = 0;
    let cameraAngleY = 0.2;
    let cameraDistance = 310;

    const updateCameraPos = () => {
      camera.position.x = Math.sin(cameraAngleX) * Math.cos(cameraAngleY) * cameraDistance;
      camera.position.y = Math.sin(cameraAngleY) * cameraDistance;
      camera.position.z = Math.cos(cameraAngleX) * Math.cos(cameraAngleY) * cameraDistance;
      camera.lookAt(0, 0, 0);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        isDragging = true;
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;

        cameraAngleX -= deltaX * 0.005;
        cameraAngleY = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraAngleY + deltaY * 0.005));

        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
        updateCameraPos();
      } else {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const meshes = nodesList.map((n) => n.mesh);
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
          const hitId = intersects[0].object.userData.id;
          setHoveredNodeId(hitId);
          setTooltipPos({ x: e.clientX, y: e.clientY });
          container.style.cursor = 'pointer';
        } else {
          setHoveredNodeId(null);
          container.style.cursor = 'grab';
        }
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
      const meshes = nodesList.map((n) => n.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hitId = intersects[0].object.userData.id;
        onSelectFile(hitId);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance = Math.max(140, Math.min(550, cameraDistance + e.deltaY * 0.28));
      updateCameraPos();
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('click', handleClick);
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    // 8. Render Animation Loop with Focus Lines & Particles
    let animId: number;
    const animate = () => {
      if (autoRotate && !isDragging) {
        cameraAngleX += 0.0006;
        updateCameraPos();
      }

      globeMesh.rotation.y += 0.0003;
      coreMesh.rotation.y -= 0.0005;

      // Determine Focus Node (Hovered or Active)
      const focusId = hoveredNodeId || activeFileId;

      const connectedNeighborIds = new Set<string>();
      const focusedArcIndices: number[] = [];

      if (focusId) {
        connectedNeighborIds.add(focusId);
        arcs.forEach((arc, idx) => {
          if (arc.sourceId === focusId) {
            connectedNeighborIds.add(arc.targetId);
            focusedArcIndices.push(idx);
          } else if (arc.targetId === focusId) {
            connectedNeighborIds.add(arc.sourceId);
            focusedArcIndices.push(idx);
          }
        });
      }

      // Update Arc Colors and Opacity
      arcs.forEach((arc) => {
        if (!focusId) {
          arc.lineMaterial.color.setHex(0x38bdf8);
          arc.lineMaterial.opacity = 0.18;
        } else if (arc.sourceId === focusId) {
          // Outgoing (Downstream dependencies): Glowing Cyan
          arc.lineMaterial.color.setHex(0x38bdf8);
          arc.lineMaterial.opacity = 0.95;
        } else if (arc.targetId === focusId) {
          // Incoming (Upstream importers): Electric Lime
          arc.lineMaterial.color.setHex(0xD9F65A);
          arc.lineMaterial.opacity = 0.95;
        } else {
          // Unconnected lines: Dim ghost lines
          arc.lineMaterial.color.setHex(0x1e293b);
          arc.lineMaterial.opacity = 0.04;
        }
      });

      // Update Nodes Glow and Scaling
      nodesList.forEach((n) => {
        if (!focusId) {
          n.material.opacity = 1.0;
          n.material.emissiveIntensity = 0.4;
          n.spriteMat.opacity = 0.95;
          n.mesh.scale.set(n.baseRadius, n.baseRadius, n.baseRadius);
        } else if (n.id === focusId) {
          // Gentle Calm Breathing Pulse
          const s = 1.08 + Math.sin(performance.now() * 0.002) * 0.05;
          n.mesh.scale.set(n.baseRadius * s, n.baseRadius * s, n.baseRadius * s);
          n.material.opacity = 1.0;
          n.material.emissiveIntensity = 0.85;
          n.spriteMat.opacity = 1.0;
        } else if (connectedNeighborIds.has(n.id)) {
          // Connected Direct Neighbors
          n.mesh.scale.set(n.baseRadius * 1.05, n.baseRadius * 1.05, n.baseRadius * 1.05);
          n.material.opacity = 1.0;
          n.material.emissiveIntensity = 0.6;
          n.spriteMat.opacity = 0.95;
        } else {
          // Dimmed Unrelated Nodes
          n.mesh.scale.set(n.baseRadius * 0.8, n.baseRadius * 0.8, n.baseRadius * 0.8);
          n.material.opacity = 0.18;
          n.material.emissiveIntensity = 0.1;
          n.spriteMat.opacity = 0.12;
        }
      });

      // Animate Energy Flow Particles along Focused Arcs
      particles.forEach((p, pIdx) => {
        if (focusedArcIndices.length > 0) {
          const arcIdx = focusedArcIndices[pIdx % focusedArcIndices.length];
          const arc = arcs[arcIdx];
          if (arc) {
            p.progress = (p.progress + p.speed) % 1.0;
            const pt = arc.curve.getPoint(p.progress);
            p.mesh.position.copy(pt);
            p.mesh.visible = true;
          } else {
            p.mesh.visible = false;
          }
        } else {
          p.mesh.visible = false;
        }
      });

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [graph, visibleNodes, activeFileId, hoveredNodeId, autoRotate, onSelectFile]);

  const hoveredNode = hoveredNodeId ? nodeMapRef.current.get(hoveredNodeId) : null;

  return (
    <div className="relative w-full h-full bg-[#060B12] select-none overflow-hidden" data-lenis-prevent>
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Header Info */}
      <div className="absolute top-4 left-6 flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-mono text-slate-300 shadow-xl pointer-events-none z-20">
        <Globe size={14} className="text-[#D9F65A]" />
        <span>3D Codebase Globe Sphere</span>
        <span className="text-slate-500">•</span>
        <span className="text-sky-400 font-bold">{visibleNodes.length} nodes</span>
      </div>

      {/* 3D Controls Bar */}
      <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl z-20">
        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
            autoRotate
              ? 'bg-[#D9F65A]/20 border border-[#D9F65A]/40 text-[#D9F65A] font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Cinematic 3D Auto-Rotation"
        >
          {autoRotate ? <Pause size={12} /> : <Play size={12} />}
          <span>{autoRotate ? 'Rotating' : 'Paused'}</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        <button
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.position.set(0, 40, 310);
              cameraRef.current.lookAt(0, 0, 0);
            }
          }}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Reset 3D Camera"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* 3D Hover Tooltip */}
      {hoveredNode && (
        <div
          className="fixed pointer-events-none z-50 bg-slate-950/95 border border-white/20 text-white rounded-lg p-2.5 shadow-2xl text-xs backdrop-blur-md max-w-xs font-mono animate-in fade-in zoom-in-95"
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
