import fs from 'fs';
import path from 'path';

export interface TsConfigPaths {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

const EXTENSIONS_TO_TRY = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
  '/index.mjs',
  '/index.cjs'
];

export class PathResolver {
  private workspaceRoot: string;
  private tsConfigPaths: TsConfigPaths = {};
  private resolutionCache = new Map<string, string | null>();
  private fileExistsCache = new Map<string, boolean>();
  private packageAliasesCache = new Map<string, { baseDir: string; paths: Record<string, string[]> }>();
  private tsConfigCache = new Map<string, TsConfigPaths>();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.loadConfigs();
  }

  public updateWorkspaceRoot(newRoot: string) {
    this.workspaceRoot = newRoot;
    this.resolutionCache.clear();
    this.fileExistsCache.clear();
    this.packageAliasesCache.clear();
    this.tsConfigCache.clear();
    this.loadConfigs();
  }

  public static normalizePath(p: string): string {
    return path.normalize(p);
  }

  public clearCache() {
    this.resolutionCache.clear();
    this.fileExistsCache.clear();
    this.packageAliasesCache.clear();
    this.tsConfigCache.clear();
  }

  private loadConfigs() {
    this.tsConfigPaths = {
      baseUrl: this.workspaceRoot,
      paths: {
        '@/*': ['src/*', '*'],
        '@root/*': ['*']
      }
    };

    const candidates = [
      path.join(this.workspaceRoot, 'tsconfig.json'),
      path.join(this.workspaceRoot, 'jsconfig.json'),
      path.join(this.workspaceRoot, 'package.json')
    ];

    for (const configPath of candidates) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const stripped = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
          const parsed = JSON.parse(stripped);

          // 1. tsconfig / jsconfig paths
          if (configPath.endsWith('.json') && !configPath.endsWith('package.json')) {
            const compilerOptions = parsed.compilerOptions || {};
            let baseUrl = compilerOptions.baseUrl;
            if (baseUrl) {
              baseUrl = path.resolve(this.workspaceRoot, baseUrl);
            } else {
              baseUrl = this.workspaceRoot;
            }

            this.tsConfigPaths = {
              baseUrl,
              paths: {
                ...this.tsConfigPaths.paths,
                ...(compilerOptions.paths || {})
              }
            };
          }

          // 2. package.json _moduleAliases (module-alias package)
          if (parsed._moduleAliases) {
            const aliases: Record<string, string[]> = {};
            for (const [alias, target] of Object.entries(parsed._moduleAliases as Record<string, string>)) {
              const cleanTarget = target.startsWith('./') ? target.slice(2) : target;
              if (alias.endsWith('/*')) {
                aliases[alias] = [`${cleanTarget}/*`];
              } else {
                aliases[`${alias}/*`] = [`${cleanTarget}/*`];
                aliases[alias] = [cleanTarget];
              }
            }
            this.tsConfigPaths.paths = {
              ...this.tsConfigPaths.paths,
              ...aliases
            };
          }
        } catch {
          // If parsing fails, ignore and use default
        }
      }
    }
  }

  private findNearestPackageAliases(containingDir: string): { baseDir: string; paths: Record<string, string[]> } | null {
    if (this.packageAliasesCache.has(containingDir)) {
      return this.packageAliasesCache.get(containingDir)!;
    }

    let current = containingDir;
    while (current.length >= this.workspaceRoot.length) {
      const pkgJsonPath = path.join(current, 'package.json');
      if (this.fileExists(pkgJsonPath)) {
        try {
          const content = fs.readFileSync(pkgJsonPath, 'utf8');
          const parsed = JSON.parse(content);
          if (parsed._moduleAliases) {
            const pathsMap: Record<string, string[]> = {};
            for (const [alias, target] of Object.entries(parsed._moduleAliases as Record<string, string>)) {
              let cleanTarget = target.startsWith('./') ? target.slice(2) : target;
              if (cleanTarget === '.') cleanTarget = '';
              if (alias.endsWith('/*')) {
                pathsMap[alias] = [cleanTarget ? `${cleanTarget}/*` : '*'];
              } else {
                pathsMap[`${alias}/*`] = [cleanTarget ? `${cleanTarget}/*` : '*'];
                pathsMap[alias] = [cleanTarget];
              }
            }
            const result = { baseDir: current, paths: pathsMap };
            this.packageAliasesCache.set(containingDir, result);
            return result;
          }
        } catch {
          // Ignore
        }
      }

      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }

    const nullResult = { baseDir: this.workspaceRoot, paths: {} };
    this.packageAliasesCache.set(containingDir, nullResult);
    return nullResult;
  }

  private findNearestTsConfig(containingDir: string): TsConfigPaths {
    if (this.tsConfigCache.has(containingDir)) {
      return this.tsConfigCache.get(containingDir)!;
    }

    let current = containingDir;
    while (current.length >= this.workspaceRoot.length) {
      const candidates = [
        path.join(current, 'tsconfig.json'),
        path.join(current, 'jsconfig.json')
      ];

      for (const configPath of candidates) {
        if (this.fileExists(configPath)) {
          try {
            const content = fs.readFileSync(configPath, 'utf8');
            const stripped = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            const parsed = JSON.parse(stripped);
            const compilerOptions = parsed.compilerOptions || {};
            let baseUrl = compilerOptions.baseUrl;
            if (baseUrl) {
              baseUrl = path.resolve(current, baseUrl);
            } else {
              baseUrl = current;
            }

            const paths: Record<string, string[]> = compilerOptions.paths || {};
            const result: TsConfigPaths = {
              baseUrl,
              paths: {
                '@/*': ['src/*', '*'],
                ...paths
              }
            };
            this.tsConfigCache.set(containingDir, result);
            return result;
          } catch {
            // Ignore parse error
          }
        }
      }

      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }

    const fallback = this.tsConfigPaths;
    this.tsConfigCache.set(containingDir, fallback);
    return fallback;
  }

  private fileExists(filePath: string): boolean {
    if (this.fileExistsCache.has(filePath)) {
      return this.fileExistsCache.get(filePath)!;
    }
    try {
      const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
      this.fileExistsCache.set(filePath, exists);
      return exists;
    } catch {
      this.fileExistsCache.set(filePath, false);
      return false;
    }
  }

  private probeExtensions(basePath: string): string | null {
    for (const ext of EXTENSIONS_TO_TRY) {
      const candidate = basePath + ext;
      if (this.fileExists(candidate)) {
        return path.normalize(candidate);
      }
    }
    return null;
  }

  /**
   * Resolves an import specifier from a given containing file.
   * Returns absolute file path if internal, or null if external package / unresolvable.
   */
  public resolve(importSpecifier: string, containingFile: string): { resolvedPath: string | null; isExternal: boolean } {
    const cacheKey = `${containingFile}::${importSpecifier}`;
    if (this.resolutionCache.has(cacheKey)) {
      const cached = this.resolutionCache.get(cacheKey)!;
      return {
        resolvedPath: cached,
        isExternal: cached === null && !importSpecifier.startsWith('.') && !importSpecifier.startsWith('/')
      };
    }

    const containingDir = path.dirname(containingFile);

    // 1. Relative import (./ or ../)
    if (importSpecifier.startsWith('./') || importSpecifier.startsWith('../') || importSpecifier.startsWith('/')) {
      const absoluteTarget = path.resolve(containingDir, importSpecifier);
      const probed = this.probeExtensions(absoluteTarget);
      this.resolutionCache.set(cacheKey, probed);
      return { resolvedPath: probed, isExternal: false };
    }

    // 2. Check nearest package.json _moduleAliases (for sub-apps / backend repos)
    const nearestPkg = this.findNearestPackageAliases(containingDir);
    if (nearestPkg && nearestPkg.paths) {
      for (const [aliasPattern, targetPatterns] of Object.entries(nearestPkg.paths)) {
        const regexPattern = new RegExp('^' + aliasPattern.replace(/\*/g, '(.*)') + '$');
        const match = importSpecifier.match(regexPattern);

        if (match) {
          const wildcardValue = match[1] || '';
          for (const targetPattern of targetPatterns) {
            const resolvedTarget = targetPattern.replace(/\*/g, wildcardValue);
            const fullTargetPath = path.resolve(nearestPkg.baseDir, resolvedTarget);
            const probed = this.probeExtensions(fullTargetPath);
            if (probed) {
              this.resolutionCache.set(cacheKey, probed);
              return { resolvedPath: probed, isExternal: false };
            }
          }
        }
      }
    }

    // 3. Check nearest tsconfig / jsconfig (for frontend/ or backend/ subfolders)
    const nearestTs = this.findNearestTsConfig(containingDir);
    if (nearestTs && nearestTs.paths) {
      for (const [aliasPattern, targetPatterns] of Object.entries(nearestTs.paths)) {
        const regexPattern = new RegExp('^' + aliasPattern.replace(/\*/g, '(.*)') + '$');
        const match = importSpecifier.match(regexPattern);

        if (match) {
          const wildcardValue = match[1] || '';
          for (const targetPattern of targetPatterns) {
            const resolvedTarget = targetPattern.replace(/\*/g, wildcardValue);
            const baseDir = nearestTs.baseUrl || this.workspaceRoot;
            const fullTargetPath = path.resolve(baseDir, resolvedTarget);
            const probed = this.probeExtensions(fullTargetPath);
            if (probed) {
              this.resolutionCache.set(cacheKey, probed);
              return { resolvedPath: probed, isExternal: false };
            }
          }
        }
      }
    }

    // 4. BaseUrl direct resolution on nearest or root
    const activeBaseUrl = nearestTs?.baseUrl || this.tsConfigPaths.baseUrl;
    if (activeBaseUrl) {
      const directTarget = path.resolve(activeBaseUrl, importSpecifier);
      const probed = this.probeExtensions(directTarget);
      if (probed) {
        this.resolutionCache.set(cacheKey, probed);
        return { resolvedPath: probed, isExternal: false };
      }
    }

    // 5. Fallback root resolution for @/ and @root/
    if (importSpecifier.startsWith('@/')) {
      const candidates = [
        path.resolve(containingDir, '..', 'src', importSpecifier.slice(2)),
        path.resolve(containingDir, 'src', importSpecifier.slice(2)),
        path.resolve(this.workspaceRoot, 'src', importSpecifier.slice(2))
      ];
      for (const cand of candidates) {
        const probed = this.probeExtensions(cand);
        if (probed) {
          this.resolutionCache.set(cacheKey, probed);
          return { resolvedPath: probed, isExternal: false };
        }
      }
    }
    if (importSpecifier.startsWith('@root/')) {
      const candidate2 = path.resolve(this.workspaceRoot, importSpecifier.slice(6));
      const probed2 = this.probeExtensions(candidate2);
      if (probed2) {
        this.resolutionCache.set(cacheKey, probed2);
        return { resolvedPath: probed2, isExternal: false };
      }
    }

    // 6. Otherwise it's likely an external package (node_modules) or unresolvable
    this.resolutionCache.set(cacheKey, null);
    return {
      resolvedPath: null,
      isExternal: !importSpecifier.startsWith('.')
    };
  }
}
