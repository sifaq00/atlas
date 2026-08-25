# Change Log

All notable changes to the **Atlas — Codebase Map** extension will be documented in this file.

## [0.1.1] - 2026-08-25

### Added
- **Potato-Proof High-Performance Engine**:
  - RequestAnimationFrame event coalescing for silky-smooth 60fps graph dragging and zooming.
  - Background tab sleep and idle frame throttling (~30 FPS) reducing CPU consumption by >60%.
  - Zero-allocation static graph node indexing eliminating Garbage Collection spikes.
  - Fast-cooling D3 force simulation (< 1s stabilization in Full Map mode).
- **Hierarchical Blast Radius Lines**:
  - Direct Consumers ($L_1$): Bold Crimson Red (`#ef4444`, 2.6px) with rapid fire pulse.
  - Downstream Cascade ($L_2+$): Ultra-Thin Warm Amber Gold (`#f59e0b`, 0.95px) with mini gold particle pulse.
- **Monorepo & Multi-Folder Support**:
  - Multi-root and nested subfolder scanning (`frontend/` + `backend/`).
  - Automatic resolution for nested `tsconfig.json` / `jsconfig.json` path aliases (`@/*`).
- **Compact & GPU-Accelerated UI Panels**:
  - Compact icon-only buttons (Focus & Open) in Blast Radius drawer.
  - GPU hardware compositing (`transform: translateZ(0)`) and `content-visibility: auto` on right Inspector panel and Blast Radius drawer for 60fps scrolling.
- **Official Brand Avatar**:
  - High-DPI square avatar with centered proportional Atlas robot.

### Fixed
- Fixed Search Modal visibility and keyboard Escape behavior.
- Fixed node label duplicate rendering on high-DPI displays.
- Fixed import path resolution in workspaces with custom `_moduleAliases`.

---

## [0.1.0] - 2026-08-20

### Initial Release
- Interactive architecture dependency graph for TypeScript & JavaScript codebases.
- Reverse BFS Blast Radius calculation with risk tier analysis (Low, Medium, High, Critical).
- Start Here onboarding ranking bar for instant entry point discovery.
- Tarjan DFS Circular Dependency detector and Dead Code / Orphan detector.
- Export options for High-Res PNG, Mermaid diagram, and Markdown Architecture Audit Reports.
- Status Bar item and Line 1 CodeLens integration.
