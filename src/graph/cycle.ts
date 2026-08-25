import { DependencyGraph, CircularCycle } from './model';

export class CycleDetector {
  /**
   * Detects all directed circular dependency cycles in the graph.
   * Uses Tarjan/DFS cycle enumeration with canonical normalization to avoid duplicate cycles.
   */
  public static detectCycles(graph: DependencyGraph): CircularCycle[] {
    const cycles: CircularCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];
    const seenCycleSignatures = new Set<string>();

    const nodes = Object.keys(graph.nodes);

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const node = graph.nodes[nodeId];
      if (node && node.imports) {
        for (const targetId of node.imports) {
          if (!graph.nodes[targetId]) continue;

          if (recursionStack.has(targetId)) {
            // Found a cycle! Extract slice from targetId to current
            const startIndex = currentPath.indexOf(targetId);
            if (startIndex !== -1) {
              const cycleSlice = currentPath.slice(startIndex);
              cycleSlice.push(targetId); // Complete the loop

              // Normalize cycle to avoid duplicates of [A, B, C, A] vs [B, C, A, B]
              const signature = this.getCanonicalCycleSignature(cycleSlice);
              if (!seenCycleSignatures.has(signature)) {
                seenCycleSignatures.add(signature);
                cycles.push({
                  id: `cycle-${cycles.length + 1}`,
                  files: cycleSlice,
                  length: cycleSlice.length - 1
                });
              }
            }
          } else if (!visited.has(targetId)) {
            dfs(targetId);
          }
        }
      }

      currentPath.pop();
      recursionStack.delete(nodeId);
    };

    for (const nodeId of nodes) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  private static getCanonicalCycleSignature(cycle: string[]): string {
    const loopNodes = cycle.slice(0, -1);
    if (loopNodes.length === 0) return cycle.join('->');

    // Find the min element index
    let minIndex = 0;
    for (let i = 1; i < loopNodes.length; i++) {
      if (loopNodes[i] < loopNodes[minIndex]) {
        minIndex = i;
      }
    }

    // Rotate so min element is first
    const rotated = [...loopNodes.slice(minIndex), ...loopNodes.slice(0, minIndex)];
    return rotated.join('->');
  }
}
