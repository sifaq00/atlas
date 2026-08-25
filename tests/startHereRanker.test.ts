import { describe, it, expect } from 'vitest';
import { StartHereRanker } from '../src/graph/rank';

import { DependencyGraph } from '../src/graph/model';
describe('StartHereRanker Unit Tests', () => {
  it('should rank entry points and high fan-in hubs at the top of Start Here', () => {
    const mockGraph: DependencyGraph = {
      rootPath: '/app',
      scannedAt: Date.now(),
      totalFiles: 4,
      nodes: {
        'src/main.ts': {
          id: 'src/main.ts',
          name: 'main.ts',
          relativePath: 'src/main.ts',
          extension: '.ts',
          category: 'util',
          lineCount: 40,
          sizeBytes: 1000,
          imports: ['src/app/router.ts'],
          importedBy: [],
          externalImports: [],
          exports: [],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        },
        'src/app/router.ts': {
          id: 'src/app/router.ts',
          name: 'router.ts',
          relativePath: 'src/app/router.ts',
          extension: '.ts',
          category: 'ui',
          lineCount: 120,
          sizeBytes: 3000,
          imports: [],
          importedBy: ['src/main.ts', 'src/views/home.ts', 'src/views/about.ts'],
          externalImports: [],
          exports: ['createRouter'],
          metadata: { isTest: false, isRoute: true, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        },
        'src/utils/dateHelper.ts': {
          id: 'src/utils/dateHelper.ts',
          name: 'dateHelper.ts',
          relativePath: 'src/utils/dateHelper.ts',
          extension: '.ts',
          category: 'util',
          lineCount: 15,
          sizeBytes: 400,
          imports: [],
          importedBy: [],
          externalImports: [],
          exports: ['formatDate'],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        },
        'src/tests/router.test.ts': {
          id: 'src/tests/router.test.ts',
          name: 'router.test.ts',
          relativePath: 'src/tests/router.test.ts',
          extension: '.ts',
          category: 'other',
          lineCount: 80,
          sizeBytes: 2000,
          imports: ['src/app/router.ts'],
          importedBy: [],
          externalImports: [],
          exports: [],
          metadata: { isTest: true, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        }
      },
      edges: [
        { id: '1', source: 'src/main.ts', target: 'src/app/router.ts', type: 'import' },
        { id: '2', source: 'src/views/home.ts', target: 'src/app/router.ts', type: 'import' },
        { id: '3', source: 'src/views/about.ts', target: 'src/app/router.ts', type: 'import' }
      ]
    };

    const ranked = StartHereRanker.rank(mockGraph, 5);

    expect(ranked.length).toBeGreaterThan(0);
    // Tests should be excluded
    expect(ranked.find((r) => r.id === 'src/tests/router.test.ts')).toBeUndefined();
    // Entry point or high fan-in router should be top 2
    const topIds = ranked.map((r) => r.id);
    expect(topIds).toContain('src/main.ts');
    expect(topIds).toContain('src/app/router.ts');
    expect(ranked[0].isEntryPoint || ranked[0].fanIn > 0).toBe(true);
  });
});
