import { DependencyGraph, FileCategory, FileMetadata, FileNode, DependencyEdge } from './types';

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
}

export function parseRepoInput(input: string): RepoInfo {
  let cleaned = input.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
  cleaned = cleaned.replace(/^github\.com\//, '');
  cleaned = cleaned.replace(/\.git$/, '');

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new Error('Invalid repository format. Please use "owner/repo" (e.g. sifaq00/atlas)');
  }

  const owner = parts[0];
  const repo = parts[1];
  let branch = 'main';

  if (parts.length >= 4 && parts[2] === 'tree') {
    branch = parts[3];
  }

  return {
    owner,
    repo,
    branch,
    fullPath: `${owner}/${repo}`,
  };
}

const SUPPORTED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.css', '.json'
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
  const isTest = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(lower) || lower.includes('/__tests__/');
  const isRoute = lower.includes('/routes/') || lower.includes('/pages/') || lower.includes('/app/') && (name.startsWith('page.') || name.startsWith('route.'));
  const isComponent = lower.includes('/components/') || lower.includes('/views/') || /\.(tsx|jsx|vue|svelte)$/.test(lower);
  const isDatabase = lower.includes('/db/') || lower.includes('/prisma/') || lower.includes('/models/') || lower.includes('/schema/');
  const isService = lower.includes('/services/') || lower.includes('/api/') || lower.includes('/controllers/') || lower.includes('/server/');
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

export async function scanGitHubRepo(
  repoInput: string,
  githubToken?: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<DependencyGraph> {
  const { owner, repo, branch } = parseRepoInput(repoInput);
  
  onProgress?.({
    stage: 'fetching-tree',
    message: `Connecting to GitHub for ${owner}/${repo}...`,
    totalFiles: 0,
    processedFiles: 0,
    percentage: 5,
  });

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  // 1. Fetch Tree
  let treeData: any;
  let activeBranch = branch;
  
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${activeBranch}?recursive=1`,
      { headers }
    );

    if (res.status === 404 && activeBranch === 'main') {
      // Try master branch
      activeBranch = 'master';
      const masterRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${activeBranch}?recursive=1`,
        { headers }
      );
      if (!masterRes.ok) {
        throw new Error(`Repository not found or private (${res.status})`);
      }
      treeData = await masterRes.json();
    } else if (res.status === 403) {
      throw new Error('GitHub API rate limit reached. Please wait a few minutes or provide a GitHub Token.');
    } else if (!res.ok) {
      throw new Error(`GitHub API returned error: ${res.status} ${res.statusText}`);
    } else {
      treeData = await res.json();
    }
  } catch (err: any) {
    throw new Error(err.message || 'Failed to fetch repository tree.');
  }

  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    throw new Error('No files found in this repository.');
  }

  // 2. Filter code files
  const candidateFiles = treeData.tree.filter(
    (item: any) => item.type === 'blob' && isSupportedFile(item.path)
  );

  if (candidateFiles.length === 0) {
    throw new Error('No supported source files (.ts, .js, .tsx, etc.) found in repository.');
  }

  // Cap files for web performance (max 200 files for fast client experience)
  const filesToProcess = candidateFiles.slice(0, 200);
  const totalFiles = filesToProcess.length;

  onProgress?.({
    stage: 'fetching-files',
    message: `Analyzing ${totalFiles} source files in ${owner}/${repo}...`,
    totalFiles,
    processedFiles: 0,
    percentage: 15,
  });

  const fileMap = new Map<string, { path: string; size: number; content: string }>();
  const filePathsSet = new Set<string>(candidateFiles.map((f: any) => f.path));

  // Batch download in groups of 12
  const batchSize = 12;
  for (let i = 0; i < filesToProcess.length; i += batchSize) {
    const batch = filesToProcess.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (file: any) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${activeBranch}/${file.path}`;
          const res = await fetch(rawUrl);
          if (res.ok) {
            const content = await res.text();
            fileMap.set(file.path, {
              path: file.path,
              size: file.size || content.length,
              content,
            });
          }
        } catch {
          // ignore individual fetch errors
        }
      })
    );

    const processed = Math.min(filesToProcess.length, i + batchSize);
    onProgress?.({
      stage: 'fetching-files',
      message: `Downloaded ${processed}/${totalFiles} files...`,
      totalFiles,
      processedFiles: processed,
      percentage: 15 + Math.round((processed / totalFiles) * 60),
    });
  }

  onProgress?.({
    stage: 'parsing',
    message: 'Extracting imports, exports, and building dependency graph...',
    totalFiles,
    processedFiles: totalFiles,
    percentage: 85,
  });

  // 3. Build Nodes & Parse Imports
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

  // Parse imports using regex AST matcher
  const IMPORT_REGEX = /(?:import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?|export\s+(?:[\w*\s{},]*)\s+from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g;
  const EXPORT_REGEX = /export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface)\s+([A-Za-z0-9_$]+)/g;

  for (const [path, fileData] of fileMap.entries()) {
    const sourceNode = nodes[path];
    if (!sourceNode) continue;

    // Find exports
    let exportMatch;
    while ((exportMatch = EXPORT_REGEX.exec(fileData.content)) !== null) {
      if (exportMatch[1]) sourceNode.exports.push(exportMatch[1]);
    }

    // Find imports
    let importMatch;
    while ((importMatch = IMPORT_REGEX.exec(fileData.content)) !== null) {
      const rawSpecifier = importMatch[1];
      if (!rawSpecifier) continue;

      if (rawSpecifier.startsWith('.')) {
        // Relative import -> resolve path
        const resolved = resolveRelativePath(path, rawSpecifier, filePathsSet);
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
        }
      } else {
        // External package (e.g. react, lodash)
        const pkgName = rawSpecifier.startsWith('@')
          ? rawSpecifier.split('/').slice(0, 2).join('/')
          : rawSpecifier.split('/')[0];
        if (!sourceNode.externalImports.includes(pkgName)) {
          sourceNode.externalImports.push(pkgName);
        }
      }
    }
  }

  onProgress?.({
    stage: 'done',
    message: `Graph generated successfully with ${Object.keys(nodes).length} files!`,
    totalFiles,
    processedFiles: totalFiles,
    percentage: 100,
  });

  return {
    nodes,
    edges,
    rootPath: `${owner}/${repo}`,
    repoName: `${owner}/${repo}`,
    scannedAt: Date.now(),
    totalFiles: Object.keys(nodes).length,
    totalDependencies: edges.length,
  };
}

function resolveRelativePath(sourcePath: string, specifier: string, allPaths: Set<string>): string | null {
  const dirParts = sourcePath.split('/');
  dirParts.pop(); // remove filename

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

  // 1. Direct match
  if (allPaths.has(baseResolved)) return baseResolved;

  // 2. Try extensions
  const candidates = [
    `${baseResolved}.ts`,
    `${baseResolved}.tsx`,
    `${baseResolved}.js`,
    `${baseResolved}.jsx`,
    `${baseResolved}/index.ts`,
    `${baseResolved}/index.tsx`,
    `${baseResolved}/index.js`,
    `${baseResolved}/index.jsx`,
    `${baseResolved}.vue`,
    `${baseResolved}.svelte`,
  ];

  for (const candidate of candidates) {
    if (allPaths.has(candidate)) return candidate;
  }

  return null;
}
