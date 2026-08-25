import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { AstParser, ParseResult } from './parser';
import { PathResolver } from './resolver';
import { DependencyGraph, DependencyEdge, FileNode } from '../graph/model';
import { CachedFileRecord, SerializedAtlasCache } from '../cache/store';

import { DEFAULT_IGNORE_PATTERNS, createIgnoreMatcher, isSupportedFile } from '../scanner/ignoreRules';

const FILE_GLOB = '**/*.{ts,tsx,js,jsx,mjs,cjs}';
const MAX_FILE_SIZE = 300 * 1024;

function parseGitignore(content: string): string[] {
  return content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      if (line.startsWith('!')) return `!${line.slice(1)}`;
      if (line.endsWith('/')) return line.slice(0, -1);
      return line;
    });
}

export class WorkspaceScanner {
  private rootUri: vscode.Uri;
  private workspaceRoot: string;
  private pathResolver: PathResolver;
  private astParser: AstParser;
  private customExclude: string[];
  private cachedFileRecords: Record<string, CachedFileRecord> = {};

  constructor(rootUri: vscode.Uri, customExclude: string[] = []) {
    this.rootUri = rootUri;
    this.workspaceRoot = rootUri.fsPath;
    this.pathResolver = new PathResolver(this.workspaceRoot);
    this.astParser = new AstParser(this.workspaceRoot, this.pathResolver);
    this.customExclude = customExclude;
  }

  public updateConfig(rootUri: vscode.Uri, customExclude: string[] = []) {
    this.rootUri = rootUri;
    this.workspaceRoot = rootUri.fsPath;
    this.pathResolver.updateWorkspaceRoot(this.workspaceRoot);
    this.astParser.updateWorkspaceRoot(this.workspaceRoot);
    this.customExclude = customExclude;
  }

  public setCache(cache: SerializedAtlasCache | null) {
    if (cache && cache.files) {
      this.cachedFileRecords = { ...cache.files };
    } else {
      this.cachedFileRecords = {};
    }
  }

  public getCacheRecords(): Record<string, CachedFileRecord> {
    return this.cachedFileRecords;
  }

  private buildExcludePattern(): string {
    let gitignorePatterns: string[] = [];

    try {
      const gitignorePath = path.join(this.workspaceRoot, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const content = fs.readFileSync(gitignorePath, 'utf-8');
        gitignorePatterns = parseGitignore(content).map(p => {
          if (p.startsWith('!')) return p;
          if (p.startsWith('**/')) return p;
          return `**/${p}/**`;
        });
      }
    } catch {
      // No .gitignore or read error — proceed without
    }

    const allPatterns = [...DEFAULT_IGNORE_PATTERNS, ...gitignorePatterns, ...this.customExclude];
    return `{${allPatterns.join(',')}}`;
  }

  private async discoverFiles(): Promise<string[]> {
    const excludePattern = this.buildExcludePattern();
    const uris = await vscode.workspace.findFiles(FILE_GLOB, excludePattern);
    const ignoreMatcher = createIgnoreMatcher(this.customExclude);
    return uris
      .map(uri => uri.fsPath)
      .filter(filePath => isSupportedFile(filePath) && !ignoreMatcher(filePath));
  }

  public async scan(onProgress?: (current: number, total: number, stage: string) => void): Promise<DependencyGraph> {
    this.pathResolver.clearCache();

    if (onProgress) onProgress(0, 0, 'Discovering files...');
    let filePaths = await this.discoverFiles();

    // Enforce maxFiles
    const config = vscode.workspace.getConfiguration('atlas');
    const maxFiles = config.get<number>('maxFiles', 5000);
    if (filePaths.length > maxFiles) {
      vscode.window.showWarningMessage(
        `Atlas: ${filePaths.length} files found (limit: ${maxFiles}). Some files skipped. Increase atlas.maxFiles in settings.`
      );
      filePaths = filePaths.slice(0, maxFiles);
    }

    const totalFiles = filePaths.length;
    if (onProgress) onProgress(0, totalFiles, `Mapping ${totalFiles} files...`);

    const nodes: Record<string, FileNode> = {};
    const edges: DependencyEdge[] = [];
    const edgeIdSet = new Set<string>();
    const newCacheRecords: Record<string, CachedFileRecord> = {};

    for (let i = 0; i < totalFiles; i++) {
      const filePath = filePaths[i];
      if (onProgress && i % 25 === 0) {
        onProgress(i + 1, totalFiles, `Mapping ${path.basename(filePath)}...`);
      }

      try {
        const stat = fs.statSync(filePath);

        // Skip files over 300KB
        if (stat.size > MAX_FILE_SIZE) {
          continue;
        }

        const cached = this.cachedFileRecords[filePath];

        if (cached && cached.mtime === stat.mtimeMs && cached.sizeBytes === stat.size) {
          nodes[cached.node.id] = { ...cached.node, importedBy: [] };
          newCacheRecords[filePath] = cached;

          for (const edge of cached.internalEdges) {
            if (!edgeIdSet.has(edge.id)) {
              edgeIdSet.add(edge.id);
              edges.push(edge);
            }
          }
        } else {
          const parseResult = this.astParser.parseFile(filePath);
          if (parseResult) {
            nodes[parseResult.node.id] = parseResult.node;

            newCacheRecords[filePath] = {
              mtime: stat.mtimeMs,
              sizeBytes: stat.size,
              node: parseResult.node,
              internalEdges: parseResult.internalEdges
            };

            for (const edge of parseResult.internalEdges) {
              if (!edgeIdSet.has(edge.id)) {
                edgeIdSet.add(edge.id);
                edges.push(edge);
              }
            }
          }
        }
      } catch {
        const parseResult = this.astParser.parseFile(filePath);
        if (parseResult) {
          nodes[parseResult.node.id] = parseResult.node;
        }
      }
    }

    this.cachedFileRecords = newCacheRecords;

    for (const edge of edges) {
      const targetNode = nodes[edge.target];
      if (targetNode) {
        if (!targetNode.importedBy.includes(edge.source)) {
          targetNode.importedBy.push(edge.source);
        }
      }
    }

    if (onProgress) onProgress(totalFiles, totalFiles, 'Mapping complete.');

    return {
      nodes,
      edges,
      rootPath: this.workspaceRoot,
      scannedAt: Date.now(),
      totalFiles: Object.keys(nodes).length
    };
  }

  public reparseFile(filePath: string): ParseResult | null {
    const parseResult = this.astParser.parseFile(filePath);
    if (parseResult) {
      try {
        const stat = fs.statSync(filePath);
        this.cachedFileRecords[filePath] = {
          mtime: stat.mtimeMs,
          sizeBytes: stat.size,
          node: parseResult.node,
          internalEdges: parseResult.internalEdges
        };
      } catch {
        // Ignore stat error
      }
    }
    return parseResult;
  }
}
