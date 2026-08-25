import { DependencyGraph, FileCategory, ImpactResult, BlastRadiusNode, RiskLevel } from './types';

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
    const impactGraphEdges = graph.edges.filter(
      (e) => e.target === targetFileId || e.source === targetFileId
    );

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

    // Calculate Risk Score (0 - 100)
    let riskScore = 0;
    const riskReasons: string[] = [];

    // Dependents weight
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

    // Check for circular dependency involving target
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

  private static findCyclesForNode(graph: DependencyGraph, startId: string): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (currentId: string, depth: number) => {
      if (depth > 8) return; // limit depth
      visited.add(currentId);
      path.push(currentId);

      const node = graph.nodes[currentId];
      if (node) {
        for (const nextId of node.imports) {
          if (nextId === startId && path.length > 1) {
            cycles.push([...path, startId]);
          } else if (!visited.has(nextId) && path.length < 6) {
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
}
