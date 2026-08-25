import { describe, it, expect } from 'vitest';
import { CycleDetector } from '../src/graph/cycle';

import { DependencyGraph } from '../src/graph/model';
describe('CycleDetector Unit Tests', () => {
  it('should return empty array for acyclic DAG graph', () => {
    const dagGraph: DependencyGraph = {
      rootPath: '/app',
      scannedAt: Date.now(),
      totalFiles: 3,
      nodes: {
        'A.ts': { id: 'A.ts', name: 'A.ts', relativePath: 'A.ts', extension: '.ts', category: 'ui', lineCount: 10, sizeBytes: 100, imports: ['B.ts', 'C.ts'], importedBy: [], externalImports: [], exports: [], metadata: { isTest: false, isRoute: true, isComponent: false, isDatabase: false, isService: false, isConfig: false } },
        'B.ts': { id: 'B.ts', name: 'B.ts', relativePath: 'B.ts', extension: '.ts', category: 'service', lineCount: 10, sizeBytes: 100, imports: ['C.ts'], importedBy: ['A.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } },
        'C.ts': { id: 'C.ts', name: 'C.ts', relativePath: 'C.ts', extension: '.ts', category: 'data', lineCount: 10, sizeBytes: 100, imports: [], importedBy: ['A.ts', 'B.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: true, isService: false, isConfig: false } }
      },
      edges: [
        { id: '1', source: 'A.ts', target: 'B.ts', type: 'import' },
        { id: '2', source: 'A.ts', target: 'C.ts', type: 'import' },
        { id: '3', source: 'B.ts', target: 'C.ts', type: 'import' }
      ]
    };

    const cycles = CycleDetector.detectCycles(dagGraph);
    expect(cycles).toHaveLength(0);
  });

  it('should detect simple direct 2-node circular dependency (A <-> B)', () => {
    const cycleGraph: DependencyGraph = {
      rootPath: '/app',
      scannedAt: Date.now(),
      totalFiles: 2,
      nodes: {
        'auth.ts': { id: 'auth.ts', name: 'auth.ts', relativePath: 'auth.ts', extension: '.ts', category: 'service', lineCount: 10, sizeBytes: 100, imports: ['user.ts'], importedBy: ['user.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } },
        'user.ts': { id: 'user.ts', name: 'user.ts', relativePath: 'user.ts', extension: '.ts', category: 'service', lineCount: 10, sizeBytes: 100, imports: ['auth.ts'], importedBy: ['auth.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } }
      },
      edges: [
        { id: '1', source: 'auth.ts', target: 'user.ts', type: 'import' },
        { id: '2', source: 'user.ts', target: 'auth.ts', type: 'import' }
      ]
    };

    const cycles = CycleDetector.detectCycles(cycleGraph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].length).toBe(2);
    expect(cycles[0].files).toContain('auth.ts');
    expect(cycles[0].files).toContain('user.ts');
  });

  it('should detect 3-node loop (A -> B -> C -> A)', () => {
    const loopGraph: DependencyGraph = {
      rootPath: '/app',
      scannedAt: Date.now(),
      totalFiles: 3,
      nodes: {
        'A.ts': { id: 'A.ts', name: 'A.ts', relativePath: 'A.ts', extension: '.ts', category: 'service', lineCount: 10, sizeBytes: 100, imports: ['B.ts'], importedBy: ['C.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } },
        'B.ts': { id: 'B.ts', name: 'B.ts', relativePath: 'B.ts', extension: '.ts', category: 'util', lineCount: 10, sizeBytes: 100, imports: ['C.ts'], importedBy: ['A.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: false, isConfig: false } },
        'C.ts': { id: 'C.ts', name: 'C.ts', relativePath: 'C.ts', extension: '.ts', category: 'service', lineCount: 10, sizeBytes: 100, imports: ['A.ts'], importedBy: ['B.ts'], externalImports: [], exports: [], metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false } }
      },
      edges: [
        { id: '1', source: 'A.ts', target: 'B.ts', type: 'import' },
        { id: '2', source: 'B.ts', target: 'C.ts', type: 'import' },
        { id: '3', source: 'C.ts', target: 'A.ts', type: 'import' }
      ]
    };

    const cycles = CycleDetector.detectCycles(loopGraph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].length).toBe(3);
  });
});
