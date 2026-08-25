# Atlas — Dev Brief v1.0

**VS Code extension: peta arsitektur interaktif untuk repo apa pun, langsung di editor.**

> Pitch: *Never feel lost in a codebase again.* Clone → open → lihat peta. Zero config, zero server, zero upload.

- Owner: Fine
- Dev: 1 developer
- Target timeline: **10 hari kerja** ke Marketplace v0.1.0
- Referensi konsep: [braedonsaunders/codeflow](https://github.com/braedonsaunders/codeflow) (MIT) — kita port konsepnya, bukan fork kodenya
- Landing page: `atlas-landing.html` (sudah ada, aesthetic sky/lime)

---

## 1. Product Definition

### 1.1 Core loop
```
git clone <repo> && code .
        ↓ (otomatis, background)
Atlas parse semua import → build dependency graph → cache
        ↓
Sidebar panel: peta arsitektur + panel "Start Here"
        ↓
User klik node → file terbuka → status bar nampilin blast radius
```

**Prinsip #1:** tidak ada tombol "Analyze". Analisis jalan otomatis saat workspace dibuka (dengan opt-out di settings). Momen user paling butuh peta = detik pertama buka repo asing — jangan minta dia melakukan apa pun.

### 1.2 Tiga fitur v1 (dan HANYA tiga ini)

| # | Fitur | Jawab pertanyaan | Surface |
|---|-------|------------------|---------|
| 1 | **The Map** | "Struktur project ini kayak gimana?" | Sidebar webview (force graph) |
| 2 | **Start Here** | "Mulai baca dari mana?" | Panel list di atas graph |
| 3 | **Blast Radius** | "Kalau file ini gue ubah, apa yang rusak?" | Graph highlight + status bar + CodeLens |

### 1.3 Explicitly OUT of scope v1
Tulis ini di README juga biar kontributor nggak nge-PR fitur random:
- ❌ Security scanner
- ❌ Health grade A–F
- ❌ Git ownership / churn heatmap
- ❌ PR impact analysis
- ❌ Export PDF/SVG/JSON
- ❌ Bahasa selain TS/JS/JSX/TSX (Python & Go = v2)
- ❌ Monorepo multi-root workspace (v1: root pertama saja, tampilkan warning)

---

## 2. Tech Stack

| Layer | Pilihan | Alasan |
|-------|---------|--------|
| Extension host | TypeScript, VS Code Extension API (`engines.vscode: ^1.85.0`) | Baseline aman, coverage user luas |
| Bundler | esbuild (`--bundle --external:vscode`) | Cepat, config 10 baris |
| Parser | **`oxc-parser`** (napi binding) | AST beneran, 50–100x lebih cepat dari Babel. Fallback: regex import matcher kalau napi gagal load di platform user |
| Webview UI | **Preact + htm** (no-JSX build) ATAU vanilla + D3 | Bundle kecil (<50KB). JANGAN React 18 full — webview harus instan |
| Graph render | D3 v7 `forceSimulation` + **Canvas** (bukan SVG) | SVG mati di atas ~500 node. Canvas handle 5.000 node |
| Cache | JSON file di `context.storageUri` | Bukan di folder project user (jangan kotorin repo orang) |
| Test | `vitest` untuk graph logic, `@vscode/test-electron` untuk smoke test | Logic graph = pure function, gampang di-test |

**Dependency budget:** total `node_modules` production ≤ 5 package. Setiap tambahan harus dijustifikasi di PR.

---

## 3. Repo Structure

```
atlas/
├── package.json              # manifest + contributes (lihat §4)
├── esbuild.mjs               # build script (extension + webview, 2 entry)
├── src/
│   ├── extension.ts          # activate(), wiring semua modul
│   ├── indexer/
│   │   ├── scanner.ts        # walk workspace, respect .gitignore
│   │   ├── parser.ts         # oxc → ImportRecord[]
│   │   ├── resolver.ts       # resolve './x', '@/x', tsconfig paths
│   │   └── incremental.ts    # re-index on save (single file)
│   ├── graph/
│   │   ├── model.ts          # types: FileNode, Edge, Graph
│   │   ├── build.ts          # records → adjacency list
│   │   ├── blast.ts          # BFS downstream/upstream
│   │   ├── rank.ts           # Start Here ranking
│   │   └── layers.ts         # klasifikasi UI/service/data/util
│   ├── cache/
│   │   └── store.ts          # load/save/invalidate
│   ├── ui/
│   │   ├── sidebar.ts        # WebviewViewProvider
│   │   ├── statusbar.ts      # blast counter
│   │   ├── codelens.ts       # "N files depend on this"
│   │   └── protocol.ts       # message types ext↔webview (shared)
│   └── telemetry.ts          # KOSONG. File ada, isi no-op. Statement.
├── webview/
│   ├── main.ts               # entry webview
│   ├── graph-canvas.ts       # D3 force + canvas renderer
│   ├── start-here.ts         # panel list
│   └── style.css             # dark, ikut VS Code theme vars
├── media/
│   └── icon.png              # 128×128, lihat §9 branding
├── tests/
│   ├── graph.test.ts
│   ├── rank.test.ts
│   └── fixtures/mini-repo/   # repo mainan 20 file untuk test
└── README.md                 # + GIF demo 10 detik (wajib untuk Marketplace)
```

---

## 4. package.json — `contributes`

```jsonc
{
  "name": "atlas-map",
  "displayName": "Atlas — Codebase Map",
  "description": "Never feel lost in a codebase again. Interactive architecture map, Start Here ranking, and blast radius — right in your sidebar.",
  "publisher": "<publisher-id>",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Visualization", "Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "atlas",
        "title": "Atlas",
        "icon": "media/activity-icon.svg"
      }]
    },
    "views": {
      "atlas": [{
        "type": "webview",
        "id": "atlas.mapView",
        "name": "Architecture Map"
      }]
    },
    "commands": [
      { "command": "atlas.reindex",     "title": "Atlas: Re-index Workspace" },
      { "command": "atlas.showBlast",   "title": "Atlas: Show Blast Radius of Current File" },
      { "command": "atlas.focusFile",   "title": "Atlas: Locate Current File in Map" }
    ],
    "configuration": {
      "title": "Atlas",
      "properties": {
        "atlas.autoIndex":        { "type": "boolean", "default": true },
        "atlas.exclude":          { "type": "array",   "default": ["**/node_modules/**", "**/dist/**", "**/*.test.*", "**/*.spec.*"] },
        "atlas.blastThreshold":   { "type": "number",  "default": 30, "description": "Warn when a file's blast radius exceeds this" },
        "atlas.maxFiles":         { "type": "number",  "default": 5000 },
        "atlas.codelens.enabled": { "type": "boolean", "default": true }
      }
    }
  }
}
```

Catatan:
- `onStartupFinished` — bukan `*`. Jangan bikin VS Code startup lambat, Marketplace menghukum ini.
- Indexing dimulai **setelah** activation, di background, dengan `vscode.window.withProgress` (location: `Window`, bukan modal).

---

## 5. Indexer

### 5.1 Scanner (`scanner.ts`)
- Pakai `vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,mjs,cjs}', exclude)`.
- Gabungkan exclude dari: settings `atlas.exclude` + isi `.gitignore` (parse manual, cukup pattern sederhana; pakai lib `ignore` kalau perlu — masuk dependency budget).
- Hard cap `atlas.maxFiles`. Kalau lewat: index N file terbesar fan-in-nya nggak bisa diketahui duluan → strategi: index semua path, tapi **skip parsing** file > 300KB dan tampilkan toast "Workspace besar — X file dilewati, atur atlas.exclude".

### 5.2 Parser (`parser.ts`)
Untuk tiap file, ekstrak:
```ts
interface ImportRecord {
  file: string;            // path relatif dari root
  specifier: string;       // './auth', '@/lib/db', 'react'
  kind: 'static' | 'dynamic' | 'require' | 'export-from';
}
```
- `oxc-parser` `parseSync` → jalan di `ImportDeclaration`, `ExportNamedDeclaration.source`, `ExportAllDeclaration`, `ImportExpression` (dynamic), `require()` call dengan string literal.
- **Dynamic import dengan argumen non-literal → skip, jangan tebak.** Akurasi > coverage.
- Package eksternal (`react`, `lodash`) → **dibuang dari graph** v1. Graph = file-to-file internal saja. External deps bikin graph jadi bulu landak yang nggak informatif.

### 5.3 Resolver (`resolver.ts`)
Urutan resolve specifier relatif/alias ke path file nyata:
1. `./x` → coba `x.ts`, `x.tsx`, `x.js`, `x.jsx`, `x/index.ts`, dst.
2. Alias: baca `tsconfig.json` → `compilerOptions.paths` + `baseUrl`. Support pattern `@/*` style. `jsconfig.json` juga.
3. Gagal resolve → edge dibuang, catat ke output channel `Atlas` (bukan popup).

**Test wajib:** fixture `mini-repo` harus punya kasus: index file, alias, dynamic import, export-from, circular.

### 5.4 Incremental (`incremental.ts`)
- `onDidSaveTextDocument` → re-parse 1 file itu → replace edges keluar dari file tsb → recompute fan-in yang berubah → push diff ke webview.
- File create/delete/rename (`onDidCreateFiles` dll) → sama, granular.
- Debounce 300ms (save-all bisa nembak 50 event).

---

## 6. Graph Logic (pure functions — semua unit-tested)

### 6.1 Model (`model.ts`)
```ts
interface FileNode {
  id: string;        // path relatif
  loc: number;       // baris kode (untuk ukuran node)
  layer: Layer;      // 'ui' | 'service' | 'data' | 'util' | 'config' | 'other'
  fanIn: number;     // berapa file yang import dia
  fanOut: number;
}
interface Graph {
  nodes: Map<string, FileNode>;
  out: Map<string, Set<string>>;  // adjacency: file → yang dia import
  in:  Map<string, Set<string>>;  // reverse
}
```

### 6.2 Blast radius (`blast.ts`)
```ts
// BFS di reverse graph (in). Return per-depth biar UI bisa gradasi warna.
function blastRadius(g: Graph, id: string, maxDepth = 6): Map<string, number>
// upstream = BFS di `out` — untuk panel "what does this file need"
```
Circular dependency: visited set standard, tapi **deteksi cycle** dan simpan `cycles: string[][]` di hasil index — dipakai UI untuk badge ⚠ di node yang terlibat cycle.

### 6.3 Start Here ranking (`rank.ts`)
Skor per file, ambil top 5:
```
score = 3.0 * isEntryPoint        // dari package.json main/module/bin,
                                  // + heuristik nama: main.*, index.* di root,
                                  // app.*, server.*, next.config → pages/app dir
      + 1.0 * normalizedFanIn     // fanIn / maxFanIn
      + 0.3 * normalizedLoc
      - 2.0 * isConfigOrUtil      // jangan rekomendasiin utils/date.ts
```
Label di UI: `entry point`, `imported by N files`. Jangan tampilkan skor mentah — nggak ada artinya buat user.

### 6.4 Layer classification (`layers.ts`)
Heuristik path + import pattern, urutan prioritas:
1. Path mengandung `components|pages|app|views|screens|ui` → **ui**
2. `api|services|server|controllers|handlers|routes` → **service**
3. `db|models|prisma|schema|store|repositories` → **data**
4. `utils|lib|helpers|shared|common` → **util**
5. `config|*.config.*|constants` → **config**
6. Fallback: kalau file import dari React/Vue/Svelte → ui; else **other**

Ini heuristik dan boleh salah — user bisa lihat warna aneh dan hidup jalan terus. JANGAN bikin konfigurasi custom layer di v1.

---

## 7. Cache (`store.ts`)

- Lokasi: `context.storageUri/index-v1.json` (per-workspace, dikelola VS Code, aman).
- Isi: `{ schemaVersion, createdAt, files: { [path]: { mtime, size, imports: [...] } } }`
- Load saat startup → untuk tiap file, bandingkan `mtime + size` vs disk → hanya re-parse yang berubah. Repo 2.000 file yang nggak berubah = load cache ~200ms, no parsing.
- `schemaVersion` mismatch → buang cache, full re-index. Jangan pernah coba migrate.
- Command `atlas.reindex` = nuke cache + full index (escape hatch kalau ada bug).

**Target performa (ukur, jangan asumsi):**
| Skenario | Target |
|---|---|
| Cold index, 500 file | < 3s |
| Cold index, 2.000 file | < 10s |
| Warm open (cache valid) | < 500ms sampai graph tampil |
| Incremental re-index 1 file | < 100ms |
| Graph render 2.000 node | 60fps saat idle, ≥30fps saat drag |

---

## 8. UI Spec

### 8.1 Webview sidebar — layout

```
┌──────────────────────────────┐
│ ATLAS          [⟳] [⊙] [⚙]  │  ⟳ reindex · ⊙ locate current file
├──────────────────────────────┤
│ START HERE                   │
│ ① src/main.ts    entry point │  ← klik = buka file
│ ② app/router.ts  ← 34 files  │
│ ③ lib/db.ts      ← 28 files  │
│ ④ api/client.ts  ← 21 files  │
├──────────────────────────────┤
│                              │
│        ● ●    ●              │
│      ●   ◉  ●   ●            │  ← canvas force graph
│        ●   ● ●               │     warna = layer
│                              │     ukuran = fanIn
├──────────────────────────────┤
│ ▸ auth/session.ts            │  ← selected file detail
│   ⚠ 23 downstream · 4 up     │
│   DEPTH 1  api/login.ts      │
│   DEPTH 1  api/logout.ts     │
│   DEPTH 2  hooks/useUser.ts  │
└──────────────────────────────┘
```

### 8.2 Interaksi graph
- **Klik node** → select: node putih terang, downstream merah gradasi by depth (depth 1 paling pekat), upstream biru redup, sisanya fade 20% opacity. Detail panel terisi.
- **Double-click / klik nama di list** → `vscode.window.showTextDocument`.
- **Hover** → tooltip: path, layer, fanIn/fanOut.
- **Editor ganti file aktif** → node terkait auto-highlight ring (subtle, bukan full select).
- Zoom scroll, pan drag, `+/-` keyboard. `Esc` = clear selection.
- Search box kecil (filter node by path substring) — murah, value tinggi.

### 8.3 Visual
- Ikut theme VS Code: pakai `var(--vscode-sideBar-background)`, `--vscode-foreground`, dst. Jangan hardcode dark.
- Warna layer (aksesibel di dark & light):
  - ui `#4FC1FF` · service `#C586C0` · data `#4EC9B0` · util `#858585` · config `#6A6A6A` · other `#B5BAC1`
  - blast: `#FF6B57` gradasi opacity by depth · selected: `--vscode-focusBorder`
- Node radius: `4 + sqrt(fanIn) * 1.5`, cap 16px.
- Edge: garis 1px, opacity 0.25; naik ke 0.8 kalau kedua ujungnya dalam selection set.

### 8.4 Status bar + CodeLens
- Status bar item (kanan): `$(circuit-board) 23 affected` untuk file aktif. Klik → `atlas.showBlast` (fokus sidebar + select node).
- Warna: default; kalau > `blastThreshold` → `statusBarItem.warningBackground`.
- CodeLens baris 1: `Atlas: 23 files depend on this · show map`. Bisa dimatikan via settings (sebagian orang benci CodeLens — hormati itu).

### 8.5 Empty & error states (tulis copy-nya sekarang, bukan nanti)
- Workspace kosong / bukan JS-TS: `"Atlas maps TypeScript & JavaScript projects. Open a folder with .ts/.js files to see it come alive."`
- Indexing: progress bar tipis + `"Mapping 1,847 files…"`
- File > maxFiles: toast satu kali, link ke settings.
- Parser napi gagal load: fallback regex + baris kecil di panel `"running in compatibility mode"` — jangan drama.

---

## 9. Message Protocol (ext ↔ webview) — `protocol.ts`

Satu file shared, di-import dua sisi. Semua message punya `type`.

```ts
// Extension → Webview
type ToWebview =
  | { type: 'graph/full';   payload: SerializedGraph }        // initial / after reindex
  | { type: 'graph/patch';  payload: GraphDiff }              // incremental
  | { type: 'select';       payload: { id: string; blast: [string, number][] } }
  | { type: 'activeFile';   payload: { id: string | null } }
  | { type: 'startHere';    payload: RankedFile[] }
  | { type: 'status';       payload: { state: 'indexing'|'ready'|'error'; detail?: string } };

// Webview → Extension
type ToExtension =
  | { type: 'openFile';     payload: { id: string } }
  | { type: 'requestBlast'; payload: { id: string } }
  | { type: 'reindex' }
  | { type: 'ready' };  // webview minta graph/full saat mount
```

Aturan: **graph logic tidak pernah jalan di webview.** Webview = render + input saja. Blast dihitung di extension host (punya graph lengkap), webview cuma terima hasil. Ini bikin webview tetap ringan dan logic tetap testable.

---

## 10. Branding & Marketplace

- **Nama:** Atlas (working title). Cek ketersediaan di Marketplace sebelum publish — kalau bentrok, alternatif: `Codemap`, `Wayline`, `Peta`. Keputusan final: Fine.
- **Icon:** node graph 3 titik (1 lime `#D9F65A`, 2 putih) di background sky-blue `#2E9BEA` — konsisten sama landing. 128×128 PNG.
- **README Marketplace** (ini landing page kedua, seriusin):
  1. GIF 10 detik: buka repo → peta muncul → klik node → blast merah. (Rekam pakai repo populer yang orang kenal, misal `expressjs/express`.)
  2. Tiga fitur, satu kalimat masing-masing.
  3. Privacy block: *"0 servers. Your code never leaves your machine."*
  4. Supported: TS/JS/JSX/TSX. Roadmap singkat.
- **Lisensi:** MIT.
- **Telemetry: TIDAK ADA.** Ini fitur, tulis di README. (Konsisten dengan positioning semua produk Fine.)

---

## 11. Milestones

| Hari | Deliverable | Definition of done |
|------|-------------|-------------------|
| 1–2 | Scaffold + indexer | `atlas.reindex` jalan, output channel nampilin jumlah file & edge di fixture repo |
| 3–4 | Graph logic + tests | `blast.ts`, `rank.ts`, `layers.ts` hijau di vitest; fixture cover circular & alias |
| 5–6 | Webview graph | Canvas force graph render 2.000 node, klik-select, buka file |
| 7 | Start Here + detail panel + status bar + CodeLens | Semua surface nyambung |
| 8 | Cache + incremental | Warm open < 500ms; save file → graph update tanpa full reindex |
| 9 | Polish | Theme vars, empty states, `prefers-reduced-motion`, uji di light theme, uji di Windows |
| 10 | Ship | Icon, README + GIF, `vsce package`, publish v0.1.0, smoke test install dari Marketplace |

**Acceptance test akhir (manual):** clone `vercel/next.js` docs app atau repo ~1.500 file → buka → peta tampil < 10s → Start Here masuk akal → klik file auth-ish → blast radius benar (spot check 3 edge manual).

---

## 12. Risiko & mitigasi

| Risiko | Mitigasi |
|--------|----------|
| `oxc-parser` napi gagal di platform tertentu (Alpine, arm lama) | Fallback regex matcher untuk `import ... from '...'` & `require('...')` — akurasi turun, tapi extension tetap hidup |
| Graph 5.000+ node jadi bubur visual | Cap render: > 3.000 node → default collapse ke folder-level view (node = folder), expand on click. Kalau nggak sempat di v1: hard cap + pesan jelas |
| Marketplace review lambat | Publish sebagai pre-release channel dulu (`vsce publish --pre-release`) |
| Nama bentrok | Cek hari 1, bukan hari 10 |

---

## 13. v2 backlog (JANGAN dikerjakan sekarang, cukup dicatat)
- Python + Go parser
- Folder-level collapse/expand sebagai first-class mode
- Churn overlay (git log) — fitur CodeFlow yang paling layak diangkat
- Multi-root workspace
- "Explain this area" — kirim subgraph + file ke Claude via user's own API key (opt-in). Ini calon fitur pembeda paling kuat, tapi butuh v1 yang solid dulu.
