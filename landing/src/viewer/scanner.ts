import { DependencyGraph, FileCategory, FileMetadata, FileNode, DependencyEdge } from './types';
import { ImpactAnalyzer } from './blast';

export interface ScanProgress {
  stage: 'fetching-tree' | 'fetching-files' | 'parsing' | 'done' | 'error';
  message: string;
  totalFiles: number;
  processedFiles: number;
  percentage: number;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
  fullPath: string;
  pullNumber?: number;
}

export function parseRepoInput(input: string): RepoInfo {
  let cleaned = input.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
  cleaned = cleaned.replace(/^github\.com\//, '');
  cleaned = cleaned.replace(/\.git$/, '');

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('Invalid repository format. Please use "owner/repo" (e.g. sifaq00/atlas or facebook/react)');
  }

  const owner = parts[0];
  const repo = parts[1];
  let branch = 'main';
  let pullNumber: number | undefined;

  if (parts.length >= 4 && (parts[2] === 'pull' || parts[2] === 'pulls')) {
    pullNumber = parseInt(parts[3], 10);
  } else if (parts.length >= 4 && parts[2] === 'tree') {
    branch = parts[3];
  }

  return {
    owner,
    repo,
    branch,
    fullPath: `${owner}/${repo}`,
    pullNumber,
  };
}

const SUPPORTED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.css', '.json',
  '.py', '.go', '.rs', '.php', '.rb', '.java', '.c', '.cpp', '.h', '.html'
]);

const IGNORED_PATH_PATTERNS = [
  /node_modules/,
  /^\.git\//,
  /^\.github\//,
  /dist\//,
  /dist-webview\//,
  /build\//,
  /out\//,
  /\.next\//,
  /\.nuxt\//,
  /\.output\//,
  /coverage\//,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /\.min\.(js|css)$/,
  /\.vsix$/,
  /\.zip$/,
  /\.map$/,
  /\.pyc$/,
  /__pycache__/,
  /vendor\//,
];

function isSupportedFile(path: string): boolean {
  for (const pattern of IGNORED_PATH_PATTERNS) {
    if (pattern.test(path)) return false;
  }
  const ext = getExtension(path);
  return SUPPORTED_EXTENSIONS.has(ext);
}

function getExtension(path: string): string {
  const idx = path.lastIndexOf('.');
  return idx !== -1 ? path.substring(idx).toLowerCase() : '';
}

function categorizeFile(path: string): { category: FileCategory; metadata: FileMetadata } {
  const lower = path.toLowerCase();
  const name = path.split('/').pop() || '';
  const isTest = /\.(test|spec)\.(ts|tsx|js|jsx|py|go)$/.test(lower) || lower.includes('/__tests__/') || lower.includes('/tests/');
  const isRoute = lower.includes('/routes/') || lower.includes('/pages/') || (lower.includes('/app/') && (name.startsWith('page.') || name.startsWith('route.')));
  const isComponent = lower.includes('/components/') || lower.includes('/views/') || /\.(tsx|jsx|vue|svelte)$/.test(lower);
  const isDatabase = lower.includes('/db/') || lower.includes('/prisma/') || lower.includes('/models/') || lower.includes('/schema/') || lower.includes('/entities/');
  const isService = lower.includes('/services/') || lower.includes('/api/') || lower.includes('/controllers/') || lower.includes('/server/') || lower.includes('/handlers/');
  const isConfig = lower.includes('/config') || lower.includes('.config.') || lower.includes('/constants/') || lower.endsWith('.json');

  let category: FileCategory = 'other';
  if (isComponent || isRoute) category = 'ui';
  else if (isService) category = 'service';
  else if (isDatabase || lower.includes('/types/') || lower.includes('/models/')) category = 'data';
  else if (lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/lib/') || lower.includes('/hooks/')) category = 'util';
  else if (isConfig) category = 'config';

  return {
    category,
    metadata: {
      isTest,
      isRoute,
      isComponent,
      isDatabase,
      isService,
      isConfig,
    },
  };
}

// In-Memory & LocalStorage Cache
const CACHE_PREFIX = 'atlas_graph_cache_';

export async function scanGitHubRepo(
  repoInput: string,
  githubToken?: string,
  onProgress?: (progress: ScanProgress) => void,
  forceRefresh: boolean = false
): Promise<DependencyGraph> {
  const { owner, repo, branch, pullNumber } = parseRepoInput(repoInput);
  const cacheKey = `${CACHE_PREFIX}${owner}_${repo}`;

  // 1. Check local cache (Instant load & 0 API requests)
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached && !githubToken) {
        const parsedGraph = JSON.parse(cached) as DependencyGraph;
        if (Date.now() - parsedGraph.scannedAt < 1000 * 60 * 60 * 2) {
          onProgress?.({
            stage: 'done',
            message: `Loaded ${parsedGraph.totalFiles} files from cache!`,
            totalFiles: parsedGraph.totalFiles,
            processedFiles: parsedGraph.totalFiles,
            percentage: 100,
          });
          return parsedGraph;
        }
      }
    } catch {
      // ignore cache read errors
    }
  }

  onProgress?.({
    stage: 'fetching-tree',
    message: `Connecting to repository ${owner}/${repo}...`,
    totalFiles: 0,
    processedFiles: 0,
    percentage: 5,
  });

  let filePaths: string[] = [];
  let activeBranch = branch;

  // 2. Try GitHub Git Trees API first (or fallback to jsDelivr CDN API to avoid rate limits)
  let treeFetched = false;

  try {
    const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
    if (githubToken) headers['Authorization'] = `token ${githubToken}`;

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${activeBranch}?recursive=1`,
      { headers }
    );

    if (res.ok) {
      const treeData = await res.json();
      if (treeData.tree && Array.isArray(treeData.tree)) {
        filePaths = treeData.tree
          .filter((item: any) => item.type === 'blob' && isSupportedFile(item.path))
          .map((item: any) => item.path);
        treeFetched = true;
      }
    } else if (res.status === 404 && activeBranch === 'main') {
      activeBranch = 'master';
      const masterRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${activeBranch}?recursive=1`,
        { headers }
      );
      if (masterRes.ok) {
        const treeData = await masterRes.json();
        if (treeData.tree && Array.isArray(treeData.tree)) {
          filePaths = treeData.tree
            .filter((item: any) => item.type === 'blob' && isSupportedFile(item.path))
            .map((item: any) => item.path);
          treeFetched = true;
        }
      }
    }
  } catch {
    // network or CORS issue, proceed to jsDelivr CDN fallback
  }

  // 3. Fallback to jsDelivr CDN Tree API (100% Rate Limit Free)
  if (!treeFetched || filePaths.length === 0) {
    try {
      onProgress?.({
        stage: 'fetching-tree',
        message: `Fetching tree via global CDN proxy...`,
        totalFiles: 0,
        processedFiles: 0,
        percentage: 10,
      });

      const cdnTreeRes = await fetch(
        `https://data.jsdelivr.com/v1/package/gh/${owner}/${repo}@${activeBranch}/flat`
      );

      if (cdnTreeRes.ok) {
        const cdnData = await cdnTreeRes.json();
        if (cdnData.files && Array.isArray(cdnData.files)) {
          filePaths = cdnData.files
            .map((f: any) => f.name.replace(/^\//, ''))
            .filter((path: string) => isSupportedFile(path));
          treeFetched = true;
        }
      } else if (activeBranch === 'main') {
        activeBranch = 'master';
        const masterCdnRes = await fetch(
          `https://data.jsdelivr.com/v1/package/gh/${owner}/${repo}@${activeBranch}/flat`
        );
        if (masterCdnRes.ok) {
          const cdnData = await masterCdnRes.json();
          if (cdnData.files && Array.isArray(cdnData.files)) {
            filePaths = cdnData.files
              .map((f: any) => f.name.replace(/^\//, ''))
              .filter((path: string) => isSupportedFile(path));
            treeFetched = true;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (!treeFetched || filePaths.length === 0) {
    throw new Error(
      `Unable to fetch repository "${owner}/${repo}". Please check the repository name or provide a GitHub Token.`
    );
  }

  const filesToProcess = filePaths.slice(0, 200);
  const totalFiles = filesToProcess.length;

  onProgress?.({
    stage: 'fetching-files',
    message: `Downloading ${totalFiles} source files...`,
    totalFiles,
    processedFiles: 0,
    percentage: 15,
  });

  const fileMap = new Map<string, { path: string; size: number; content: string }>();

  // Use raw.githubusercontent.com and cdn.jsdelivr.net as fallback
  const batchSize = 15;
  for (let i = 0; i < filesToProcess.length; i += batchSize) {
    const batch = filesToProcess.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (filePath: string) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${activeBranch}/${filePath}`;
          let res = await fetch(rawUrl);
          if (!res.ok) {
            const cdnUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${activeBranch}/${filePath}`;
            res = await fetch(cdnUrl);
          }
          if (res.ok) {
            const content = await res.text();
            fileMap.set(filePath, {
              path: filePath,
              size: content.length,
              content,
            });
          }
        } catch {
          // ignore
        }
      })
    );

    const processed = Math.min(filesToProcess.length, i + batchSize);
    onProgress?.({
      stage: 'fetching-files',
      message: `Downloaded ${processed}/${totalFiles} files...`,
      totalFiles,
      processedFiles: processed,
      percentage: 15 + Math.round((processed / totalFiles) * 65),
    });
  }

  let prChangedFiles: string[] | undefined;
  if (pullNumber) {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (githubToken) headers.Authorization = `token ${githubToken}`;
      const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`, { headers });
      if (prRes.ok) {
        const prData = await prRes.json();
        prChangedFiles = prData.map((f: any) => f.filename);
      }
    } catch {
      // ignore
    }
  }

  const graph = buildGraphFromFiles(fileMap, `${owner}/${repo}`, onProgress, prChangedFiles, pullNumber);

  // 3. Save to localStorage cache (if not a specific PR)
  if (!pullNumber) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(graph));
    } catch {
      // ignore quota errors
    }
  }

  return graph;
}

// Local files / folders analyzer (File System Access API & Drag-and-Drop)
export async function scanLocalFiles(
  files: Array<{ path: string; content: string; size: number }>,
  projectName: string = 'local-project',
  onProgress?: (progress: ScanProgress) => void
): Promise<DependencyGraph> {
  const fileMap = new Map<string, { path: string; size: number; content: string }>();

  for (const f of files) {
    if (isSupportedFile(f.path)) {
      fileMap.set(f.path, f);
    }
  }

  if (fileMap.size === 0) {
    throw new Error('No supported code files found in selected local folder.');
  }

  return buildGraphFromFiles(fileMap, projectName, onProgress);
}

function buildGraphFromFiles(
  fileMap: Map<string, { path: string; size: number; content: string }>,
  repoName: string,
  onProgress?: (progress: ScanProgress) => void,
  prChangedFiles?: string[],
  pullNumber?: number
): DependencyGraph {
  const totalFiles = fileMap.size;
  const filePathsSet = new Set<string>(Array.from(fileMap.keys()));

  onProgress?.({
    stage: 'parsing',
    message: 'Extracting imports, exports, and computing architecture graph...',
    totalFiles,
    processedFiles: totalFiles,
    percentage: 85,
  });

  const nodes: Record<string, FileNode> = {};
  const edges: DependencyEdge[] = [];
  const edgeIdSet = new Set<string>();

  for (const [path, fileData] of fileMap.entries()) {
    const { category, metadata } = categorizeFile(path);
    const lineCount = fileData.content ? fileData.content.split('\n').length : 1;

    nodes[path] = {
      id: path,
      relativePath: path,
      name: path.split('/').pop() || path,
      extension: getExtension(path),
      category,
      lineCount,
      sizeBytes: fileData.size,
      imports: [],
      importedBy: [],
      externalImports: [],
      exports: [],
      metadata,
    };
  }

  const JS_IMPORT_REGEX = /(?:import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?|export\s+(?:[\w*\s{},]*)\s+from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g;
  const JS_EXPORT_REGEX = /export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface)\s+([A-Za-z0-9_$]+)/g;
  const PY_IMPORT_REGEX = /(?:from\s+([.\w]+)\s+import|import\s+([.\w]+))/g;

  for (const [path, fileData] of fileMap.entries()) {
    const sourceNode = nodes[path];
    if (!sourceNode) continue;

    const ext = sourceNode.extension;

    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'].includes(ext)) {
      let exportMatch;
      while ((exportMatch = JS_EXPORT_REGEX.exec(fileData.content)) !== null) {
        if (exportMatch[1]) sourceNode.exports.push(exportMatch[1]);
      }

      let importMatch;
      while ((importMatch = JS_IMPORT_REGEX.exec(fileData.content)) !== null) {
        const rawSpecifier = importMatch[1];
        if (!rawSpecifier) continue;

        const resolved = resolveImportPath(path, rawSpecifier, filePathsSet);
        if (resolved && nodes[resolved] && resolved !== path) {
          if (!sourceNode.imports.includes(resolved)) {
            sourceNode.imports.push(resolved);
          }
          if (!nodes[resolved].importedBy.includes(path)) {
            nodes[resolved].importedBy.push(path);
          }

          const edgeId = `${path}->${resolved}`;
          if (!edgeIdSet.has(edgeId)) {
            edgeIdSet.add(edgeId);
            edges.push({
              id: edgeId,
              source: path,
              target: resolved,
              type: 'import',
            });
          }
        } else if (!rawSpecifier.startsWith('.')) {
          const pkgName = rawSpecifier.startsWith('@')
            ? rawSpecifier.split('/').slice(0, 2).join('/')
            : rawSpecifier.split('/')[0];
          if (!sourceNode.externalImports.includes(pkgName)) {
            sourceNode.externalImports.push(pkgName);
          }
        }
      }
    } else if (ext === '.py') {
      let pyMatch;
      while ((pyMatch = PY_IMPORT_REGEX.exec(fileData.content)) !== null) {
        const mod = pyMatch[1] || pyMatch[2];
        if (!mod) continue;
        const candidatePath = mod.replace(/\./g, '/') + '.py';
        if (filePathsSet.has(candidatePath) && candidatePath !== path) {
          if (!sourceNode.imports.includes(candidatePath)) sourceNode.imports.push(candidatePath);
          if (nodes[candidatePath] && !nodes[candidatePath].importedBy.includes(path)) {
            nodes[candidatePath].importedBy.push(path);
          }
          const edgeId = `${path}->${candidatePath}`;
          if (!edgeIdSet.has(edgeId)) {
            edgeIdSet.add(edgeId);
            edges.push({ id: edgeId, source: path, target: candidatePath, type: 'import' });
          }
        }
      }
    }
  }

  // Calculate Health Report
  const health = ImpactAnalyzer.analyzeHealth(nodes, edges);

  onProgress?.({
    stage: 'done',
    message: `Graph complete! Health score: ${health.score}/100 (${health.grade})`,
    totalFiles: Object.keys(nodes).length,
    processedFiles: Object.keys(nodes).length,
    percentage: 100,
  });

  return {
    nodes,
    edges,
    rootPath: repoName,
    repoName,
    scannedAt: Date.now(),
    totalFiles: Object.keys(nodes).length,
    totalDependencies: edges.length,
    health,
    prChangedFiles,
    pullNumber,
  };
}

function resolveImportPath(sourcePath: string, specifier: string, allPaths: Set<string>): string | null {
  // 1. Relative import (./ or ../)
  if (specifier.startsWith('.')) {
    const dirParts = sourcePath.split('/');
    dirParts.pop();

    const targetParts = specifier.split('/');
    for (const part of targetParts) {
      if (part === '.') continue;
      if (part === '..') {
        if (dirParts.length > 0) dirParts.pop();
      } else {
        dirParts.push(part);
      }
    }

    const baseResolved = dirParts.join('/');
    const found = tryExtensions(baseResolved, allPaths);
    if (found) return found;
  }

  // 2. Monorepo Root / Path alias (@/ or ~/)
  if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
    const cleanSpecifier = specifier.replace(/^[@~]\//, '');
    const pathParts = sourcePath.split('/');

    // Check package-level root (e.g. frontend/src/ or backend/src/)
    if (pathParts.length > 1) {
      const pkgRoot = pathParts[0]; // e.g. 'frontend' or 'packages'
      const candidates = [
        `${pkgRoot}/src/${cleanSpecifier}`,
        `${pkgRoot}/${cleanSpecifier}`,
        `src/${cleanSpecifier}`,
        cleanSpecifier,
      ];
      for (const cand of candidates) {
        const found = tryExtensions(cand, allPaths);
        if (found) return found;
      }
    }
  }

  // 3. Workspace Monorepo package imports (e.g. '@myorg/shared', 'shared/types', 'packages/backend')
  const workspaceMatches = [
    specifier,
    `packages/${specifier}`,
    `packages/${specifier.replace(/^@[^/]+\//, '')}`,
    `packages/${specifier.replace(/^@[^/]+\//, '')}/src`,
    `apps/${specifier}`,
    `libs/${specifier}`,
    `shared/${specifier}`,
  ];
  for (const match of workspaceMatches) {
    const found = tryExtensions(match, allPaths);
    if (found) return found;
    const foundSrc = tryExtensions(`${match}/src/index`, allPaths) || tryExtensions(`${match}/index`, allPaths);
    if (foundSrc) return foundSrc;
  }

  return null;
}

function tryExtensions(base: string, allPaths: Set<string>): string | null {
  if (allPaths.has(base)) return base;
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
    `${base}.vue`,
    `${base}.svelte`,
    `${base}.py`,
    `${base}.go`,
  ];
  for (const c of candidates) {
    if (allPaths.has(c)) return c;
  }
  return null;
}
