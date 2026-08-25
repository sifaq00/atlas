import { describe, it, expect } from 'vitest';
import { ImpactAnalyzer } from '../src/graph/blast';

import { DependencyGraph } from '../src/graph/model';
describe('ImpactAnalyzer Unit Tests', () => {
  const mockGraph: DependencyGraph = {
    rootPath: '/app',
    scannedAt: Date.now(),
    totalFiles: 4,
    nodes: {
      'core.ts': { id: 'core.ts', name: 'core.ts', relativePath: 'core.ts', extension: '.ts', category: 'util', lineCount: 50, sizeBytes: 1000, imports: [], importedBy: ['service.ts'], externalImports: [], exports: ['format'], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false } },
      'service.ts': { id: 'service.ts', name: 'service.ts', relativePath: 'service.ts', extension: '.ts', category: 'service', lineCount: 100, sizeBytes: 2000, imports: ['core.ts'], importedBy: ['route.ts', 'component.ts'], externalImports: [], exports: ['fetchData'], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } },
      'route.ts': { id: 'route.ts', name: 'route.ts', relativePath: 'route.ts', extension: '.ts', category: 'ui', lineCount: 40, sizeBytes: 800, imports: ['service.ts'], importedBy: [], externalImports: [], exports: ['GET'], metadata: { isTest: false, isRoute: true, isComponent: false, isDatabase: false, isService: false, isConfig: false } },
      'component.ts': { id: 'component.ts', name: 'component.ts', relativePath: 'component.ts', extension: '.ts', category: 'ui', lineCount: 80, sizeBytes: 1500, imports: ['service.ts'], importedBy: [], externalImports: [], exports: ['Widget'], metadata: { isTest: false, isRoute: false, isComponent: true, isDatabase: false, isService: false, isConfig: false } }
    },
    edges: [
      { id: '1', source: 'service.ts', target: 'core.ts', type: 'import' },
      { id: '2', source: 'route.ts', target: 'service.ts', type: 'import' },
      { id: '3', source: 'component.ts', target: 'service.ts', type: 'import' }
    ]
  };

  it('should traverse reverse BFS and find direct and indirect dependents of core.ts', () => {
    const impact = ImpactAnalyzer.analyze(mockGraph, 'core.ts');

    expect(impact).not.toBeNull();
    expect(impact!.targetFileName).toBe('core.ts');
    expect(impact!.totalAffected).toBe(3);
    expect(impact!.directDependentsCount).toBe(1); // service.ts (L1)
    expect(impact!.indirectDependentsCount).toBe(2); // route.ts, component.ts (L2)
    expect(impact!.maxDepth).toBe(2);
    expect(impact!.uiAffected).toBe(2);
  });

  it('should return 0 affected for leaf consumer routes', () => {
    const impact = ImpactAnalyzer.analyze(mockGraph, 'route.ts');

    expect(impact).not.toBeNull();
    expect(impact!.totalAffected).toBe(0);
    expect(impact!.riskLevel).toBe('LOW');
  });
});
