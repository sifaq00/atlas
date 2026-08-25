import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AtlasCacheStore, CachedFileRecord } from '../src/cache/store';

describe('AtlasCacheStore Unit Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-cache-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should save and reload cache successfully', async () => {
    const mockStorageUri = { fsPath: tempDir } as any;
    const workspaceRoot = '/app/workspace';

    const mockRecords: Record<string, CachedFileRecord> = {
      '/app/workspace/src/index.ts': {
        mtime: 12345678,
        sizeBytes: 2048,
        node: {
          id: '/app/workspace/src/index.ts',
          name: 'index.ts',
          relativePath: 'src/index.ts',
          extension: '.ts',
          category: 'util',
          lineCount: 50,
          sizeBytes: 2048,
          imports: [],
          importedBy: [],
          externalImports: [],
          exports: ['start'],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        },
        internalEdges: []
      }
    };

    await AtlasCacheStore.saveCache(mockStorageUri, workspaceRoot, mockRecords);

    const loaded = await AtlasCacheStore.loadCache(mockStorageUri, workspaceRoot);
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe('atlas-v1.1');
    expect(loaded?.rootPath).toBe(workspaceRoot);
    expect(loaded?.files['/app/workspace/src/index.ts']?.node.name).toBe('index.ts');
  });

  it('should clear cache on disk', async () => {
    const mockStorageUri = { fsPath: tempDir } as any;
    const workspaceRoot = '/app/workspace';

    await AtlasCacheStore.saveCache(mockStorageUri, workspaceRoot, {});
    let loaded = await AtlasCacheStore.loadCache(mockStorageUri, workspaceRoot);
    expect(loaded).not.toBeNull();

    await AtlasCacheStore.clearCache(mockStorageUri);
    loaded = await AtlasCacheStore.loadCache(mockStorageUri, workspaceRoot);
    expect(loaded).toBeNull();
  });
});
