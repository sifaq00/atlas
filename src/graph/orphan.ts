import { DependencyGraph, OrphanNode } from './model';
import path from 'path';

export class OrphanDetector {
  private static readonly ENTRYPOINT_PATTERNS = [
    /^index\.[a-z]+$/i,
    /^main\.[a-z]+$/i,
    /^app\.[a-z]+$/i,
    /^extension\.[a-z]+$/i,
    /^server\.[a-z]+$/i,
    /^client\.[a-z]+$/i,
    /^setupTests\.[a-z]+$/i,
    /^vite\.config\.[a-z]+$/i,
    /^next\.config\.[a-z]+$/i,
    /^webpack\.config\.[a-z]+$/i,
    /^tailwind\.config\.[a-z]+$/i,
    /^esbuild\.[a-z]+$/i,
    /^jest\.config\.[a-z]+$/i,
    /^vitest\.config\.[a-z]+$/i
  ];

  /**
   * Detects unused / orphan files across the workspace dependency graph
   */
  public static detectOrphans(graph: DependencyGraph): OrphanNode[] {
    const orphans: OrphanNode[] = [];

    for (const node of Object.values(graph.nodes)) {
      // 1. Must have zero consumers in workspace
      if (node.importedBy.length > 0) {
        continue;
      }

      // 2. Ignore routes, pages, controllers (they are invoked via URL/routing)
      if (node.category === 'ui' || node.metadata.isRoute) {
        continue;
      }

      // 3. Ignore test files (they are invoked via test runner)
      if (node.category === 'other' || node.metadata.isTest) {
        continue;
      }

      // 4. Ignore config files
      if (node.metadata.isConfig || node.name.includes('.config.')) {
        continue;
      }

      // 5. Ignore standard entrypoint file names
      const fileName = node.name.toLowerCase();
      const isEntrypoint = this.ENTRYPOINT_PATTERNS.some((pattern) => pattern.test(fileName));
      if (isEntrypoint) {
        continue;
      }

      // 6. Ignore root-level top files if they look like entrypoints
      const parts = node.relativePath.split(/[/\\]/);
      if (parts.length === 1 && (fileName.startsWith('index') || fileName.startsWith('main') || fileName.startsWith('app'))) {
        continue;
      }

      orphans.push({
        id: node.id,
        name: node.name,
        relativePath: node.relativePath,
        category: node.category,
        lineCount: node.lineCount,
        sizeBytes: node.sizeBytes,
        reason: 'Zero files in the workspace import this module. Safe candidate for removal if not called externally.'
      });
    }

    // Sort by largest file size first
    return orphans.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }
}
