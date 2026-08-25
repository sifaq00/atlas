import { describe, it, expect } from 'vitest';
import { GitDiffAnalyzer } from '../src/git/diff';
import { DependencyGraph } from '../src/graph/model';
import * as path from 'path';

describe('GitDiffAnalyzer Unit Tests', () => {
  const workspaceRoot = path.resolve(__dirname, '..');

  it('should retrieve working tree status from Git', async () => {
    const status = await GitDiffAnalyzer.getChangedFiles(workspaceRoot);

    expect(status).not.toBeNull();
    expect(typeof status.branch).toBe('string');
    expect(Array.isArray(status.files)).toBe(true);
  });

  it('should calculate combined cumulative blast radius on graph', async () => {
    const mockGraph: DependencyGraph = {
      rootPath: workspaceRoot,
      scannedAt: Date.now(),
      totalFiles: 3,
      nodes: {
        [path.resolve(workspaceRoot, 'fileA.ts')]: {
          id: path.resolve(workspaceRoot, 'fileA.ts'),
          name: 'fileA.ts',
          relativePath: 'fileA.ts',
          extension: '.ts',
          category: 'service',
          lineCount: 10,
          sizeBytes: 100,
          imports: [],
          importedBy: [path.resolve(workspaceRoot, 'fileB.ts')],
          externalImports: [],
          exports: ['run'],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false }
        },
        [path.resolve(workspaceRoot, 'fileB.ts')]: {
          id: path.resolve(workspaceRoot, 'fileB.ts'),
          name: 'fileB.ts',
          relativePath: 'fileB.ts',
          extension: '.ts',
          category: 'ui',
          lineCount: 20,
          sizeBytes: 200,
          imports: [path.resolve(workspaceRoot, 'fileA.ts')],
          importedBy: [],
          externalImports: [],
          exports: ['GET'],
          metadata: { isTest: false, isRoute: true, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        }
      },
      edges: [
        {
          id: '1',
          source: path.resolve(workspaceRoot, 'fileB.ts'),
          target: path.resolve(workspaceRoot, 'fileA.ts'),
          type: 'import'
        }
      ]
    };

    const impact = await GitDiffAnalyzer.analyzeGitImpact(mockGraph);
    expect(impact).not.toBeNull();
    expect(typeof impact.branchName).toBe('string');
    expect(typeof impact.riskScore).toBe('number');
    expect(typeof impact.totalAffected).toBe('number');
  });
});
