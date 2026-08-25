import { BlastRadiusNode, DependencyEdge, DependencyGraph, ImpactResult } from './model';
import { calculateRisk } from './risk';

export class ImpactAnalyzer {
  /**
   * Analyzes blast radius of changing a target file in the dependency graph.
   */
  public static analyze(graph: DependencyGraph, targetFileId: string, maxTraversalDepth = 15): ImpactResult | null {
    if (!graph || !graph.nodes) return null;
    const normalizedTarget = targetFileId.replace(/\\/g, '/');
    const targetNode =
      graph.nodes[targetFileId] ||
      graph.nodes[normalizedTarget] ||
      Object.values(graph.nodes).find(
        (n) =>
          n.id === targetFileId ||
          n.relativePath === targetFileId ||
          n.id.replace(/\\/g, '/') === normalizedTarget ||
          n.relativePath.replace(/\\/g, '/') === normalizedTarget ||
          n.id.toLowerCase() === targetFileId.toLowerCase()
      );

    if (!targetNode) {
      return null;
    }

    const actualTargetId = targetNode.id;

    // Helper to register reverse consumer
    const reverseAdj = new Map<string, string[]>();
    const addConsumer = (targetKey: string, sourceKey: string) => {
      const variants = [
        targetKey,
        targetKey.replace(/\\/g, '/'),
        targetKey.replace(/\//g, '\\'),
        targetKey.toLowerCase(),
        targetKey.replace(/\\/g, '/').toLowerCase()
      ];
      for (const variant of variants) {
        if (!reverseAdj.has(variant)) {
          reverseAdj.set(variant, []);
        }
        if (!reverseAdj.get(variant)!.includes(sourceKey)) {
          reverseAdj.get(variant)!.push(sourceKey);
        }
      }
    };

    // 1. Register from graph.edges
    for (const edge of graph.edges) {
      addConsumer(edge.target, edge.source);
    }

    // 2. Register from node.importedBy (redundant fallback)
    for (const [nodeId, n] of Object.entries(graph.nodes)) {
      if (n && Array.isArray(n.importedBy)) {
        for (const consumerId of n.importedBy) {
          addConsumer(nodeId, consumerId);
          addConsumer(n.id, consumerId);
          addConsumer(n.relativePath, consumerId);
        }
      }
    }

    const visited = new Set<string>();
    const depthMap = new Map<string, number>();
    const parentMap = new Map<string, string>(); // for cycle detection / path reconstruction
    const queue: Array<{ id: string; depth: number }> = [];

    const affectedNodes: BlastRadiusNode[] = [];
    const impactEdges: DependencyEdge[] = [];
    const impactEdgeIdSet = new Set<string>();

    // Build O(1) edge lookup map
    const edgeLookup = new Map<string, DependencyEdge>();
    for (const edge of graph.edges) {
      edgeLookup.set(`${edge.source}->${edge.target}`, edge);
    }

    const MAX_AFFECTED = 500;
    let hasCircularDependency = false;
    const circularPaths: string[][] = [];

    // Initialize BFS with target
    queue.push({ id: actualTargetId, depth: 0 });
    depthMap.set(actualTargetId, 0);
    visited.add(actualTargetId);
    visited.add(actualTargetId.replace(/\\/g, '/'));
    visited.add(actualTargetId.toLowerCase());

    let maxDepthReached = 0;
    let uiCount = 0;
    let servicesCount = 0;
    let dataCount = 0;
    let utilsCount = 0;
    let otherCount = 0;
    let directCount = 0;
    let indirectCount = 0;

    while (queue.length > 0) {
      if (affectedNodes.length >= MAX_AFFECTED) break;
      const { id: currentId, depth: currentDepth } = queue.shift()!;

      const consumers =
        reverseAdj.get(currentId) ||
        reverseAdj.get(currentId.replace(/\\/g, '/')) ||
        reverseAdj.get(currentId.replace(/\//g, '\\')) ||
        reverseAdj.get(currentId.toLowerCase()) ||
        [];

      for (const consumerId of consumers) {
        if (affectedNodes.length >= MAX_AFFECTED) break;
        // Collect edge connecting consumer to current dependency
        const edgeKey = `${consumerId}->${currentId}`;
        const originalEdge =
          edgeLookup.get(edgeKey) ||
          { id: `impact-${edgeKey}`, source: consumerId, target: currentId, type: 'import' as const };

        if (!impactEdgeIdSet.has(edgeKey)) {
          impactEdgeIdSet.add(edgeKey);
          impactEdges.push(originalEdge);
        }

        // Check if cycle detected back to target
        if (
          consumerId === actualTargetId ||
          consumerId.replace(/\\/g, '/').toLowerCase() === actualTargetId.replace(/\\/g, '/').toLowerCase()
        ) {
          hasCircularDependency = true;
          circularPaths.push([actualTargetId, currentId, actualTargetId]);
          continue;
        }

        if (
          visited.has(consumerId) ||
          visited.has(consumerId.replace(/\\/g, '/')) ||
          visited.has(consumerId.toLowerCase())
        ) {
          continue;
        }

        const nextDepth = currentDepth + 1;
        if (nextDepth > maxTraversalDepth) {
          continue;
        }

        visited.add(consumerId);
        visited.add(consumerId.replace(/\\/g, '/'));
        visited.add(consumerId.toLowerCase());
        depthMap.set(consumerId, nextDepth);
        parentMap.set(consumerId, currentId);

        if (nextDepth > maxDepthReached) {
          maxDepthReached = nextDepth;
        }

        const isDirect = nextDepth === 1;
        if (isDirect) {
          directCount++;
        } else {
          indirectCount++;
        }

        const consumerNode =
          graph.nodes[consumerId] ||
          graph.nodes[consumerId.replace(/\\/g, '/')] ||
          Object.values(graph.nodes).find(
            (n) =>
              n.id === consumerId ||
              n.relativePath === consumerId ||
              n.id.replace(/\\/g, '/') === consumerId.replace(/\\/g, '/') ||
              n.name === consumerId
          );

        if (consumerNode) {
          // Category stats
          if (consumerNode.category === 'ui') uiCount++;
          else if (consumerNode.category === 'service') servicesCount++;
          else if (consumerNode.category === 'data') dataCount++;
          else if (consumerNode.category === 'util') utilsCount++;
          else otherCount++;

          affectedNodes.push({
            id: consumerNode.id,
            relativePath: consumerNode.relativePath,
            name: consumerNode.name,
            category: consumerNode.category,
            depth: nextDepth,
            isDirect
          });
        } else {
          // Fallback node info if not found in dictionary
          const name = consumerId.split(/[\\/]/).pop() || consumerId;
          affectedNodes.push({
            id: consumerId,
            relativePath: consumerId,
            name,
            category: 'other',
            depth: nextDepth,
            isDirect
          });
        }

        queue.push({ id: consumerId, depth: nextDepth });
      }
    }

    // Sort affected nodes by depth ascending, then by name
    affectedNodes.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.name.localeCompare(b.name);
    });

    const riskEval = calculateRisk(
      targetNode.category,
      directCount,
      indirectCount,
      maxDepthReached,
      uiCount,
      servicesCount,
      hasCircularDependency
    );

    return {
      targetFileId,
      targetFileName: targetNode.name,
      targetRelativePath: targetNode.relativePath,
      targetCategory: targetNode.category,

      totalAffected: affectedNodes.length,
      directDependentsCount: directCount,
      indirectDependentsCount: indirectCount,
      maxDepth: maxDepthReached,

      uiAffected: uiCount,
      servicesAffected: servicesCount,
      dataAffected: dataCount,
      utilsAffected: utilsCount,
      otherAffected: otherCount,

      riskScore: riskEval.score,
      riskLevel: riskEval.level,
      riskReasons: riskEval.reasons,

      affectedNodes,
      impactGraphEdges: impactEdges,
      hasCircularDependency,
      circularPaths
    };
  }
}
