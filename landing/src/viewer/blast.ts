import {
  DependencyGraph,
  FileCategory,
  ImpactResult,
  BlastRadiusNode,
  RiskLevel,
  HealthReport,
  HealthGrade,
  ArchitectureIssue,
  FileNode,
  DependencyEdge,
} from './types';

export class ImpactAnalyzer {
  static analyze(graph: DependencyGraph, targetFileId: string): ImpactResult {
    const target = graph.nodes[targetFileId];
    if (!target) {
      return {
        targetFileId,
        targetFileName: targetFileId.split('/').pop() || targetFileId,
        targetRelativePath: targetFileId,
        targetCategory: 'other',
        totalAffected: 0,
        directDependentsCount: 0,
        indirectDependentsCount: 0,
        maxDepth: 0,
        uiAffected: 0,
        servicesAffected: 0,
        dataAffected: 0,
        utilsAffected: 0,
        otherAffected: 0,
        riskScore: 0,
        riskLevel: 'LOW',
        riskReasons: [],
        affectedNodes: [],
        impactGraphEdges: [],
        hasCircularDependency: false,
      };
    }

    // BFS to find all upstream files that import this file (directly or indirectly)
    const visited = new Set<string>();
    const depthMap = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [{ id: targetFileId, depth: 0 }];
    const affectedNodes: BlastRadiusNode[] = [];

    visited.add(targetFileId);

    let maxDepth = 0;
    let directCount = 0;
    let indirectCount = 0;
    const categoryCounts: Record<FileCategory, number> = {
      ui: 0,
      service: 0,
      data: 0,
      util: 0,
      config: 0,
      other: 0,
    };

    while (queue.length > 0) {
      const current = queue.shift()!;
      const node = graph.nodes[current.id];
      if (!node) continue;

      for (const importerId of node.importedBy) {
        if (!visited.has(importerId)) {
          visited.add(importerId);
          const nextDepth = current.depth + 1;
          depthMap.set(importerId, nextDepth);
          if (nextDepth > maxDepth) maxDepth = nextDepth;

          const isDirect = nextDepth === 1;
          if (isDirect) directCount++;
          else indirectCount++;

          const importerNode = graph.nodes[importerId];
          const category = importerNode ? importerNode.category : 'other';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;

          affectedNodes.push({
            id: importerId,
            relativePath: importerNode ? importerNode.relativePath : importerId,
            name: importerNode ? importerNode.name : importerId.split('/').pop() || importerId,
            category,
            depth: nextDepth,
            isDirect,
          });

          queue.push({ id: importerId, depth: nextDepth });
        }
      }
    }

    const totalAffected = affectedNodes.length;

    // Complete Induced Subgraph: All edges connecting any two affected nodes (including target)
    const affectedIdsSet = new Set<string>([targetFileId, ...affectedNodes.map((n) => n.id)]);
    const impactGraphEdges = graph.edges.filter(
      (e) => affectedIdsSet.has(e.source) && affectedIdsSet.has(e.target)
    );

    // Calculate Risk Score (0 - 100)
    let riskScore = 0;
    const riskReasons: string[] = [];

    if (directCount > 10) {
      riskScore += 35;
      riskReasons.push(`High direct dependents (${directCount} files)`);
    } else if (directCount > 4) {
      riskScore += 20;
      riskReasons.push(`Moderate direct dependents (${directCount} files)`);
    } else if (directCount > 0) {
      riskScore += directCount * 4;
    }

    if (indirectCount > 15) {
      riskScore += 25;
      riskReasons.push(`Deep blast radius (${indirectCount} indirect dependents)`);
    } else if (indirectCount > 0) {
      riskScore += Math.min(20, indirectCount * 2);
    }

    if (categoryCounts.data > 0 || categoryCounts.service > 0) {
      riskScore += 20;
      riskReasons.push('Affects core data models or services');
    }

    if (maxDepth >= 4) {
      riskScore += 15;
      riskReasons.push(`High dependency depth (level ${maxDepth})`);
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel: RiskLevel = 'LOW';
    if (riskScore >= 70) riskLevel = 'CRITICAL';
    else if (riskScore >= 45) riskLevel = 'HIGH';
    else if (riskScore >= 20) riskLevel = 'MEDIUM';

    const circularPaths = this.findCyclesForNode(graph, targetFileId);

    return {
      targetFileId,
      targetFileName: target.name,
      targetRelativePath: target.relativePath,
      targetCategory: target.category,
      totalAffected,
      directDependentsCount: directCount,
      indirectDependentsCount: indirectCount,
      maxDepth,
      uiAffected: categoryCounts.ui,
      servicesAffected: categoryCounts.service,
      dataAffected: categoryCounts.data,
      utilsAffected: categoryCounts.util,
      otherAffected: categoryCounts.other + categoryCounts.config,
      riskScore,
      riskLevel,
      riskReasons,
      affectedNodes,
      impactGraphEdges,
      hasCircularDependency: circularPaths.length > 0,
      circularPaths,
    };
  }

  static analyzeHealth(nodes: Record<string, FileNode>, _edges: DependencyEdge[]): HealthReport {
    const totalFiles = Object.keys(nodes).length;
    let totalLines = 0;
    const issues: ArchitectureIssue[] = [];

    let orphanCount = 0;
    let godModulesCount = 0;

    // Detect Circular Dependencies across whole graph with canonical cycle deduplication
    const allCycles: string[][] = [];
    const seenCycleKeys = new Set<string>();

    for (const fileId of Object.keys(nodes)) {
      const cycles = this.findCyclesForNodeSimple(nodes, fileId);
      for (const c of cycles) {
        const raw = c.slice(0, -1);
        if (raw.length === 0) continue;
        // Normalize rotation to lowest alphabetical node to avoid counting A->B->A and B->A->B as 2 cycles
        let minIdx = 0;
        for (let i = 1; i < raw.length; i++) {
          if (raw[i] < raw[minIdx]) minIdx = i;
        }
        const key = [...raw.slice(minIdx), ...raw.slice(0, minIdx)].join('->');
        if (!seenCycleKeys.has(key)) {
          seenCycleKeys.add(key);
          allCycles.push(c);
        }
      }
    }

    for (const [id, node] of Object.entries(nodes)) {
      totalLines += node.lineCount;

      const isEntryPoint =
        node.relativePath.includes('main.') ||
        node.relativePath.includes('index.') ||
        node.relativePath.includes('App.') ||
        node.relativePath.startsWith('pages/') ||
        node.relativePath.startsWith('app/') ||
        node.relativePath.startsWith('routes/') ||
        node.category === 'config' ||
        node.metadata.isRoute ||
        node.metadata.isTest ||
        node.metadata.isConfig ||
        node.relativePath.endsWith('.d.ts') ||
        node.relativePath.includes('setup') ||
        node.relativePath.includes('stories');

      // 1. Orphan Check (Legitimate dead code: not an entry point, not a test, not imported by anyone)
      if (node.importedBy.length === 0 && !isEntryPoint) {
        orphanCount++;
      }

      // 2. God Module Check (Industry threshold: > 850 lines OR (> 22 imports AND > 450 lines))
      const isGodModule = node.lineCount > 850 || (node.imports.length > 22 && node.lineCount > 450);
      if (isGodModule) {
        godModulesCount++;
        issues.push({
          id: `god-${id}`,
          type: 'god-module',
          severity: node.lineCount > 1200 ? 'high' : 'medium',
          title: `Large Module: ${node.name}`,
          description: `${node.relativePath} has ${node.lineCount} lines and ${node.imports.length} imports. Consider refactoring into smaller sub-modules.`,
          fileIds: [id],
        });
      }
    }

    // Circular Dependency Issues
    if (allCycles.length > 0) {
      for (let i = 0; i < Math.min(5, allCycles.length); i++) {
        const cycle = allCycles[i];
        issues.push({
          id: `cycle-${i}`,
          type: 'circular',
          severity: 'high',
          title: `Circular Dependency Cycle`,
          description: cycle.map((p) => p.split('/').pop()).join(' → '),
          fileIds: cycle,
        });
      }
    }

    // Calculate Health Score (starts at 100 with proportional deduction)
    let score = 100;
    const deadCodePercentage = totalFiles > 0 ? Math.round((orphanCount / totalFiles) * 100) : 0;

    // Deductions calibrated to industry standards
    score -= Math.min(22, allCycles.length * 5); // -5 per circular cycle (max 22)
    score -= Math.min(18, godModulesCount * 3); // -3 per god module (max 18)
    if (deadCodePercentage > 12) {
      score -= Math.min(15, Math.round((deadCodePercentage - 12) * 0.4));
    }

    score = Math.max(25, Math.min(100, Math.round(score)));

    let grade: HealthGrade = 'A+';
    if (score >= 92) grade = 'A+';
    else if (score >= 82) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    return {
      grade,
      score,
      totalLines,
      deadCodePercentage,
      orphanCount,
      circularCyclesCount: allCycles.length,
      godModulesCount,
      issues,
    };
  }

  private static findCyclesForNode(graph: DependencyGraph, startId: string): string[][] {
    return this.findCyclesForNodeSimple(graph.nodes, startId);
  }

  private static findCyclesForNodeSimple(nodes: Record<string, FileNode>, startId: string): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (currentId: string, depth: number) => {
      if (depth > 6) return;
      visited.add(currentId);
      path.push(currentId);

      const node = nodes[currentId];
      if (node) {
        for (const nextId of node.imports) {
          if (nextId === startId && path.length > 1) {
            cycles.push([...path, startId]);
          } else if (!visited.has(nextId) && path.length < 5) {
            dfs(nextId, depth + 1);
          }
        }
      }

      path.pop();
      visited.delete(currentId);
    };

    dfs(startId, 0);
    return cycles;
  }

  static findShortestPath(
    graph: DependencyGraph,
    sourceId: string,
    targetId: string
  ): { path: string[]; edges: DependencyEdge[]; found: boolean } {
    if (!graph.nodes[sourceId] || !graph.nodes[targetId]) {
      return { path: [], edges: [], found: false };
    }
    if (sourceId === targetId) {
      return { path: [sourceId], edges: [], found: true };
    }

    const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
    const visited = new Set<string>([sourceId]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      const { id, path } = current;
      const node = graph.nodes[id];
      if (!node) continue;

      for (const nextId of node.imports) {
        if (nextId === targetId) {
          const fullPath = [...path, nextId];
          const pathEdges: DependencyEdge[] = [];
          for (let i = 0; i < fullPath.length - 1; i++) {
            pathEdges.push({
              id: `${fullPath[i]}->${fullPath[i + 1]}`,
              source: fullPath[i],
              target: fullPath[i + 1],
              type: 'import',
            });
          }
          return { path: fullPath, edges: pathEdges, found: true };
        }

        if (!visited.has(nextId) && graph.nodes[nextId]) {
          visited.add(nextId);
          queue.push({ id: nextId, path: [...path, nextId] });
        }
      }
    }

    return { path: [], edges: [], found: false };
  }
}
