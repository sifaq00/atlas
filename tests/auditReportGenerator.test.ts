import { describe, it, expect } from 'vitest';
import { AuditReportGenerator } from '../src/audit/report';

import { DependencyGraph } from '../src/graph/model';
describe('AuditReportGenerator Unit Tests', () => {
  it('should generate a structured Markdown audit report', () => {
    const mockGraph: DependencyGraph = {
      rootPath: '/app/project',
      scannedAt: Date.now(),
      totalFiles: 3,
      nodes: {
        'src/services/api.ts': {
          id: 'src/services/api.ts',
          name: 'api.ts',
          relativePath: 'src/services/api.ts',
          extension: '.ts',
          category: 'service',
          lineCount: 150,
          sizeBytes: 4000,
          imports: [],
          importedBy: ['src/routes/home.ts'],
          externalImports: [],
          exports: ['fetchUser'],
          metadata: { isTest: false, isRoute: false, isComponent: false, isDatabase: false, isService: true, isConfig: false }
        },
        'src/routes/home.ts': {
          id: 'src/routes/home.ts',
          name: 'home.ts',
          relativePath: 'src/routes/home.ts',
          extension: '.ts',
          category: 'ui',
          lineCount: 50,
          sizeBytes: 1200,
          imports: ['src/services/api.ts'],
          importedBy: [],
          externalImports: [],
          exports: ['GET'],
          metadata: { isTest: false, isRoute: true, isComponent: false, isDatabase: false, isService: false, isConfig: false }
        }
      },
      edges: [
        { id: '1', source: 'src/routes/home.ts', target: 'src/services/api.ts', type: 'import' }
      ]
    };

    const report = AuditReportGenerator.generateMarkdownReport(mockGraph);

    expect(typeof report).toBe('string');
    expect(report).toContain('# 🏗️ Atlas Architecture & Health Audit Report');
    expect(report).toContain('Executive Summary');
    expect(report).toContain('Architectural Layer Distribution');
    expect(report).toContain('Core Architectural Hubs');
  });
});
