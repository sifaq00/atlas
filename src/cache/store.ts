import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { DependencyGraph, FileNode, DependencyEdge } from '../graph/model';

export interface CachedFileRecord {
  mtime: number;
  sizeBytes: number;
  node: FileNode;
  internalEdges: DependencyEdge[];
}

export interface SerializedAtlasCache {
  schemaVersion: string;
  createdAt: number;
  rootPath: string;
  files: Record<string, CachedFileRecord>;
}

const CACHE_SCHEMA_VERSION = 'atlas-v1.1';
const CACHE_FILE_NAME = 'index-v1.json';

export class AtlasCacheStore {
  /**
   * Loads cached dependency index from context.storageUri
   */
  public static async loadCache(storageUri: vscode.Uri, workspaceRoot: string): Promise<SerializedAtlasCache | null> {
    try {
      const cacheFilePath = path.join(storageUri.fsPath, CACHE_FILE_NAME);
      if (!fs.existsSync(cacheFilePath)) {
        return null;
      }

      const content = await fs.promises.readFile(cacheFilePath, 'utf8');
      const parsed: SerializedAtlasCache = JSON.parse(content);

      if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION || parsed.rootPath !== workspaceRoot) {
        // Invalidate mismatched cache
        await this.clearCache(storageUri);
        return null;
      }

      return parsed;
    } catch (err) {
      console.warn('[Atlas] Failed to load cache, falling back to full index:', err);
      return null;
    }
  }

  /**
   * Saves dependency index to context.storageUri
   */
  public static async saveCache(
    storageUri: vscode.Uri,
    workspaceRoot: string,
    files: Record<string, CachedFileRecord>
  ): Promise<void> {
    try {
      if (!fs.existsSync(storageUri.fsPath)) {
        await fs.promises.mkdir(storageUri.fsPath, { recursive: true });
      }

      const cacheFilePath = path.join(storageUri.fsPath, CACHE_FILE_NAME);
      const data: SerializedAtlasCache = {
        schemaVersion: CACHE_SCHEMA_VERSION,
        createdAt: Date.now(),
        rootPath: workspaceRoot,
        files
      };

      await fs.promises.writeFile(cacheFilePath, JSON.stringify(data), 'utf8');
    } catch (err) {
      console.warn('[Atlas] Failed to save cache:', err);
    }
  }

  /**
   * Clears the cache on disk (e.g. for atlas.reindex)
   */
  public static async clearCache(storageUri: vscode.Uri): Promise<void> {
    try {
      const cacheFilePath = path.join(storageUri.fsPath, CACHE_FILE_NAME);
      if (fs.existsSync(cacheFilePath)) {
        await fs.promises.unlink(cacheFilePath);
      }
    } catch (err) {
      console.warn('[Atlas] Failed to clear cache:', err);
    }
  }
}
