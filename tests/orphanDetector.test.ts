import { describe, it, expect } from 'vitest';
import { OrphanDetector } from '../src/graph/orphan';

import { DependencyGraph } from '../src/graph/model';
describe('OrphanDetector Unit Tests', () => {
  it('should detect unused orphan files and ignore entrypoints, routes, and tests', () => {
    const mockGraph: DependencyGraph = {
      rootPath: '/app',
      scannedAt: Date.now(),
      totalFiles: 5,
      nodes: {
        'src/services/authService.ts': {
          id: 'src/services/authService.ts',
          name: 'authService.ts',
          relativePath: 'src/services/authService.ts',
          extension: '.ts',
          category: 'service',
          lineCount: 80,
          sizeBytes: 2000,
          imports: [],
          importedBy: ['src/routes/authRoute.ts'],
          externalImports: [],
          exports: ['login'],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false }
        },
        'src/routes/authRoute.ts': {
          id: 'src/routes/authRoute.ts',
          name: 'authRoute.ts',
          relativePath: 'src/routes/authRoute.ts',
          extension: '.ts',
          category: 'ui',
          lineCount: 40,
          sizeBytes: 1000,
          imports: ['src/services/authService.ts'],
          importedBy: [],
          externalImports: [],
          exports: ['POST'],
          metadata: { isTest: false, isRoute: true, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        },
        'src/tests/auth.test.ts': {
          id: 'src/tests/auth.test.ts',
          name: 'auth.test.ts',
          relativePath: 'src/tests/auth.test.ts',
          extension: '.ts',
          category: 'other',
          lineCount: 50,
          sizeBytes: 1200,
          imports: ['src/services/authService.ts'],
          importedBy: [],
          externalImports: [],
          exports: [],
          metadata: { isTest: true, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        },
        'src/utils/legacyDeadHelper.ts': {
          id: 'src/utils/legacyDeadHelper.ts',
          name: 'legacyDeadHelper.ts',
          relativePath: 'src/utils/legacyDeadHelper.ts',
          extension: '.ts',
          category: 'util',
          lineCount: 120,
          sizeBytes: 3500,
          imports: [],
          importedBy: [], // 0 consumers!
          externalImports: [],
          exports: ['oldFormatter'],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        },
        'src/index.ts': {
          id: 'src/index.ts',
          name: 'index.ts',
          relativePath: 'src/index.ts',
          extension: '.ts',
          category: 'util',
          lineCount: 20,
          sizeBytes: 500,
          imports: [],
          importedBy: [], // 0 consumers, but it's an entrypoint
          externalImports: [],
          exports: [],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        }
      },
      edges: [
        { id: '1', source: 'src/routes/authRoute.ts', target: 'src/services/authService.ts', type: 'import' },
        { id: '2', source: 'src/tests/auth.test.ts', target: 'src/services/authService.ts', type: 'import' }
      ]
    };

    const orphans = OrphanDetector.detectOrphans(mockGraph);

    expect(orphans).toHaveLength(1);
    expect(orphans[0].name).toBe('legacyDeadHelper.ts');
    expect(orphans[0].lineCount).toBe(120);
  });
});
