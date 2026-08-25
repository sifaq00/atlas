# Atlas Dev Brief Compliance — Implementation Plan (v2)

> Use superpowers:subagent-driven-development or executing-plans to implement task-by-task.

**Goal:** Align codebase with atlas-dev-brief.md — parser, webview, graph, structure, protocol, features.

**Architecture:** React 18 + tsc API + Cytoscape → Preact + htm + oxc-parser + D3-force Canvas.

**Tech Stack:** oxc-parser, preact, htm, d3-force, picomatch

## Global Constraints
- Engine: vscode ^1.85.0
- Production deps: <= 5 packages
- No servers, no telemetry, 100% local
- TS/JS/JSX/TSX only
- Cache: context.storageUri/index-v1.json
- Activation: onStartupFinished
- Graph logic NEVER runs in webview (extension host only)

---

## Task 1: Project Structure Reorganization

Move files to match brief layout. Pure file moves + import updates.

New layout:
- src/extension.ts <- from src/extension/extension.ts
- src/indexer/scanner.ts <- from src/scanner/workspaceScanner.ts
- src/indexer/parser.ts <- from src/analyzer/astParser.ts
- src/indexer/resolver.ts <- from src/analyzer/pathResolver.ts
- src/indexer/classifier.ts <- from src/analyzer/classifier.ts
- src/indexer/incremental.ts <- NEW (extract from graphStore.ts file watcher)
- src/graph/model.ts <- from src/shared/types.ts
- src/graph/build.ts <- from src/graph/graphStore.ts
- src/graph/blast.ts <- from src/impact/impactAnalyzer.ts
- src/graph/risk.ts <- from src/impact/riskCalculator.ts
- src/graph/rank.ts <- from src/analyzer/startHereRanker.ts
- src/graph/layers.ts <- RENAME classifier categories to brief spec (ui/service/data/util/config/other)
- src/graph/cycle.ts <- from src/analyzer/cycleDetector.ts
- src/graph/orphan.ts <- from src/analyzer/orphanDetector.ts
- src/cache/store.ts <- from src/cache/store.ts (no change)
- src/ui/sidebar.ts <- from src/ui/sidebarProvider.ts
- src/ui/statusbar.ts <- from src/ui/statusbar.ts (no change)
- src/ui/codelens.ts <- from src/ui/codelens.ts (no change)
- src/ui/protocol.ts <- from src/shared/messages.ts (REWRITE to match brief spec)
- src/audit/report.ts <- from src/analyzer/auditReportGenerator.ts
- src/git/diff.ts <- from src/git/gitDiffAnalyzer.ts
- src/telemetry.ts <- NEW (no-op)

Steps:
1. Create directories: src/indexer/, src/graph/, src/audit/
2. Move files with git mv
3. Update all import paths (bulk find-replace)
4. Update tsconfig.json path aliases
5. Rename classifier categories: route->ui, component->ui, service->service, utility->util, database->data, config->config, test->other, unknown->other
6. Verify pnpm run build passes
7. Commit

---

## Task 2: Message Protocol Rewrite (protocol.ts)

Rewrite protocol to match brief Section 9 exactly. Single shared file, imported both sides.

Target types (from brief):
```
// Extension -> Webview
ToWebview =
  | { type: 'graph/full';   payload: SerializedGraph }
  | { type: 'graph/patch';  payload: GraphDiff }
  | { type: 'select';       payload: { id: string; blast: [string, number][] } }
  | { type: 'activeFile';   payload: { id: string | null } }
  | { type: 'startHere';    payload: RankedFile[] }
  | { type: 'status';       payload: { state: 'indexing'|'ready'|'error'; detail?: string } }

// Webview -> Extension
ToExtension =
  | { type: 'openFile';     payload: { id: string } }
  | { type: 'requestBlast'; payload: { id: string } }
  | { type: 'reindex' }
  | { type: 'ready' }
```

Steps:
1. Rewrite src/ui/protocol.ts with exact brief types
2. Update extension.ts message sends to use new types
3. Update webview message handler to use new types
4. Move blast calculation to extension host (remove ImpactAnalyzer.analyze from webview)
5. Verify build passes
6. Commit

---

## Task 3: Scanner Rewrite (brief Section 5.1)

Rewrite scanner to match brief spec: vscode.workspace.findFiles + .gitignore integration.

Steps:
1. Rewrite src/indexer/scanner.ts:
   - Use vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,mjs,cjs}', exclude)
   - Parse .gitignore manually (simple pattern matching, or use picomatch)
   - Merge exclude from: settings atlas.exclude + .gitignore contents
   - Hard cap atlas.maxFiles (enforce, don't just declare)
   - Skip files > 300KB with toast warning
   - Use vscode.window.withProgress for indexing progress
2. Add .gitignore parser (simple: lines starting with # = comment, ! = negate, rest = picomatch pattern)
3. Add maxFiles enforcement with warning message
4. Add progress reporting: "Mapping {N} files..."
5. Verify build passes
6. Commit

---

## Task 4: Parser Migration — oxc-parser

Replace TypeScript compiler API with oxc-parser. 50-100x faster.

Steps:
1. pnpm add oxc-parser && pnpm add -D @oxc-project/types
2. Write failing test in tests/parser.test.ts covering:
   - Static import declaration
   - Dynamic import() with string literal
   - require() with string literal
   - Export named from
   - Export all from
   - External packages (skipped)
   - Non-literal dynamic imports (skipped)
3. Implement src/indexer/parser.ts using parseSync + ESTree walker
4. Add oxc-parser fallback: if napi fails to load, fall back to regex matcher:
   ```
   /import\s+.*?\s+from\s+['"](.+?)['"]|require\s*\(\s*['"](.+?)['"]\s*\)|import\s*\(\s*['"](.+?)['"]\s*\)/g
   ```
   Log to output channel: "Atlas: running in compatibility mode (oxc-parser napi unavailable)"
5. Adapt src/indexer/resolver.ts for oxc AST types
6. Move typescript from dependencies to devDependencies
7. Verify all tests pass
8. Commit

---

## Task 5: Layer Classification Rename (brief Section 6.4)

Rename categories to match brief spec exactly.

Brief categories: ui, service, data, util, config, other
Current categories: route, component, service, utility, database, config, test, unknown

Mapping:
- route -> ui
- component -> ui
- service -> service (unchanged)
- utility -> util
- database -> data
- config -> config (unchanged)
- test -> other
- unknown -> other

Steps:
1. Update src/graph/layers.ts (renamed classifier.ts):
   - Path heuristics per brief Section 6.4:
     1. Path contains components|pages|app|views|screens|ui -> ui
     2. api|services|server|controllers|handlers|routes -> service
     3. db|models|prisma|schema|store|repositories -> data
     4. utils|lib|helpers|shared|common -> util
     5. config|*.config.*|constants -> config
     6. Fallback: imports from React/Vue/Svelte -> ui; else other
2. Update all TypeScript types: FileCategory union type
3. Update all CSS class names: category-route -> category-ui, etc.
4. Update Cytoscape/D3 color scheme for new categories
5. Verify build + tests pass
6. Commit

---

## Task 6: Webview Migration — Preact + htm

Replace React 18 with Preact + htm. ~3.5KB vs ~42KB.

Steps:
1. pnpm remove react react-dom lucide-react
2. pnpm add preact htm && pnpm add -D @preact/preset-vite
3. Update vite.config.ts with preact preset
4. Convert main.tsx -> main.ts using htm render
5. Convert App.tsx -> app.ts with htm syntax
6. Convert all 11 component .tsx -> .ts with htm
7. Replace lucide-react icons with inline SVG components. Required icons:
   Flame, AlertTriangle, ShieldCheck, AlertOctagon, ChevronUp, ChevronDown,
   ExternalLink, Compass, CheckCircle2, Target, Network, Search, RotateCw,
   Maximize2, HelpCircle, GitBranch, Camera, Download, Copy, Ghost, FileText,
   ArrowLeft, ArrowRight, X, FileCode, ArrowUpRight, ArrowDownLeft, ChevronRight,
   Info, EyeOff, FolderTree, Layers, Server, Globe, Box, Wrench, Database, Settings,
   Filter, Sparkles (remove), Trash2 (remove)
8. Verify pnpm run build:webview passes
9. Verify bundle size < 100KB gzipped
10. Commit

---

## Task 7: Graph Renderer — D3-force + Canvas

Replace Cytoscape.js with D3-force + HTML Canvas. 5000+ nodes at 60fps.

Steps:
1. pnpm add d3-force && pnpm add -D @types/d3-force
2. pnpm remove cytoscape cytoscape-dagre cytoscape-fcose dagre
3. Rewrite GraphCanvas.ts:
   - forceSimulation with link/charge/center/collide forces
   - Canvas batch rendering (one beginPath/fill for all nodes)
   - Manual zoom (wheel handler with transform)
   - Manual drag (mousedown/move/up with hit detection)
   - Click handler with world-coordinate hit test
   - Node radius: 4 + sqrt(fanIn) * 1.5, cap 16px
   - Edge: 1px, opacity 0.25 -> 0.8 on selection
4. Implement view modes:
   - Focus: active node center, 1-hop upstream left, 1-hop downstream right
   - Impact: tiered depth cascade (L0 target, L1 direct consumers orange, L2+ indirect dark orange)
   - Full map: all nodes with category colors, optional folder grouping
5. Implement hover highlighting (Obsidian-style neighborhood dim)
6. Implement exportPng() and getMermaidMarkdown()
7. Test with 5000+ node graph — must hit 60fps idle, >= 30fps drag
8. Commit

---

## Task 8: Sidebar Panel — WebviewViewProvider

Implement proper sidebar using VS Code WebviewViewProvider API.

Steps:
1. Implement AtlasSidebarViewProvider in src/ui/sidebar.ts:
   - resolveWebviewView: set options, generate HTML with script/style URVs
   - handleMessage: forward webview messages to extension logic
   - postMessage: send messages to webview
2. Register in extension.ts:
   ```
   vscode.window.registerWebviewViewProvider(AtlasSidebarViewProvider.viewType, provider)
   ```
3. Verify package.json contributes:
   - viewsContainers.activitybar: [{ id: "atlas", title: "Atlas", icon: "media/activity-icon.svg" }]
   - views.atlas: [{ type: "webview", id: "atlas.mapView", name: "Architecture Map" }]
4. Create media/activity-icon.svg if missing (simple graph icon)
5. Keep ScopeWebviewPanel as secondary (editor tab for atlas.open command)
6. Clean up ScopeWebviewPanel class name -> AtlasWebviewPanel
7. Test sidebar opens in Activity Bar with graph rendering
8. Commit

---

## Task 9: Missing Features

### 9a: telemetry.ts (no-op)
- Create src/telemetry.ts:
  ```
  export function trackEvent(_event: string, _data?: Record<string, unknown>) {
    // Intentionally empty. No telemetry. This is a feature.
  }
  ```
- Commit

### 9b: Test fixtures (20 files)
Create tests/fixtures/mini-repo/ with:
- src/index.ts (entry point, imports app)
- src/app.ts (imports router, db)
- src/router.ts (imports routes/*, service/*)
- src/routes/login.ts (imports service/auth, lib/utils)
- src/routes/signup.ts (imports service/auth)
- src/routes/dashboard.ts (imports service/user, components/Dashboard)
- src/service/auth.ts (imports db/client, lib/crypto)
- src/service/user.ts (imports db/client)
- src/db/client.ts (imports config/db)
- src/db/schema.ts (no imports)
- src/lib/utils.ts (no imports)
- src/lib/crypto.ts (no imports)
- src/config/db.ts (no imports)
- src/config/app.ts (no imports)
- src/components/Dashboard.tsx (imports lib/utils)
- src/components/Header.tsx (no imports)
- src/workers/email.ts (imports lib/utils, service/user)
- src/types.ts (no imports)
- src/legacy/old-helper.ts (ORPHAN - zero consumers)
- src/routes/circular-a.ts (imports routes/circular-b) -- circular dep
- src/routes/circular-b.ts (imports routes/circular-a) -- circular dep

Update tests to use fixtures. Commit

### 9c: Empty state messages (exact brief copy)
- Workspace empty / non-JS-TS: "Atlas maps TypeScript & JavaScript projects. Open a folder with .ts/.js files to see it come alive."
- Indexing: progress bar + "Mapping {N} files..."
- File > maxFiles: toast one-time, link to settings
- Parser napi fallback: small line in panel "running in compatibility mode"
- Commit

### 9d: Incremental re-index on save
- Extract from graphStore.ts into src/indexer/incremental.ts
- onDidSaveTextDocument -> re-parse single file -> replace edges -> recompute fan-in -> push diff
- Debounce 300ms
- Wire into extension.ts activate()
- Commit

---

## Task 10: Status Bar + CodeLens Update (brief Section 8.4)

Update status bar and CodeLens to work with new protocol.

Steps:
1. Status bar item (right): "$(circuit-board) N affected" for active file
   - Click -> atlas.showBlast (focus sidebar + select node)
   - Color: default; if > blastThreshold -> statusBarItem.warningBackground
2. CodeLens line 1: "Atlas: N files depend on this . show map"
   - Disableable via settings atlas.codelens.enabled
3. Update src/ui/statusbar.ts to use new protocol types
4. Update src/ui/codelens.ts to use new protocol types
5. Verify build passes
6. Commit

---

## Task 11: Legacy Cleanup

Clean up legacy scope naming.

Steps:
1. Remove scope.* command aliases from extension.ts (or keep for backward compat and add to package.json)
2. Rename ScopeWebviewPanel -> AtlasWebviewPanel
3. Rename scopeWebviewPanel.ts -> atlasWebviewPanel.ts
4. Update all references
5. Clean up fallback HTML: "Scope" -> "Atlas" (already done in earlier fix)
6. Verify build passes
7. Commit

---

## Task 12: esbuild Configuration

Ensure esbuild config matches brief.

Steps:
1. Verify esbuild.js (or rename to esbuild.mjs per brief):
   - entry: src/extension.ts
   - external: ['vscode']
   - bundle: true
   - platform: node
   - target: node18
   - format: cjs
   - outfile: dist/extension.js
2. If needed, rename esbuild.js -> esbuild.mjs and update package.json scripts
3. Verify build passes
4. Commit

---

## Task 13: Dependency Budget Audit

Verify <= 5 production dependencies.

Target:
1. oxc-parser — AST parsing
2. preact — UI framework
3. htm — template literals
4. d3-force — graph physics
5. picomatch — glob matching (for .gitignore + scanner)

Steps:
1. pnpm list --depth=0 --prod
2. Verify count <= 5
3. Remove any excess
4. Verify build + tests pass
5. Commit

---

## Task 14: Final Verification

Steps:
1. pnpm run lint (tsc --noEmit) — zero errors
2. pnpm run build — success
3. pnpm run test — all pass
4. Manual test: open VS Code extension dev host
   - Verify sidebar opens in Activity Bar
   - Verify graph renders
   - Verify click node -> select
   - Verify blast radius calculation
   - Verify Start Here ranking
   - Verify status bar shows "N affected"
   - Verify CodeLens shows "N files depend on this"
5. Performance test: open repo with 1500+ files, verify < 10s cold index
6. pnpm run package (vsce package)
7. Commit

---

## Notes

Extra features from current codebase (NOT in brief) — preserved but adapted:
- Git diff blast radius (adapted to new protocol)
- Circular dependency detection (adapted to new categories)
- Orphan file detection (adapted to new categories)
- Audit report generator (adapted to new model)
- Search modal (preserved)
- Export PNG/Mermaid (preserved)
- Inspector panel (preserved, adapted to new categories)
- Filter by category (adapted to ui/service/data/util/config/other)
- 3 layout modes (focus/impact/full — preserved, aligned with brief)