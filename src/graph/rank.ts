import { DependencyGraph, FileNode } from './model';
import path from 'path';

export interface StartHereItem {
  id: string;
  name: string;
  relativePath: string;
  score: number;
  label: string;
  fanIn: number;
  isEntryPoint: boolean;
  loc: number;
}

export class StartHereRanker {
  /**
   * Computes the "Start Here" top recommended onboarding files according to the brief formula:
   * Score = 3.0 * isEntryPoint + 1.0 * normalizedFanIn + 0.3 * normalizedLoc - 2.0 * isConfigOrUtil
   */
  public static rank(graph: DependencyGraph, topCount = 5): StartHereItem[] {
    const nodes = Object.values(graph.nodes);
    if (nodes.length === 0) return [];

    let maxFanIn = 1;
    let maxLoc = 1;

    for (const node of nodes) {
      const fanIn = node.importedBy.length;
      if (fanIn > maxFanIn) maxFanIn = fanIn;
      if (node.lineCount > maxLoc) maxLoc = node.lineCount;
    }

    const scoredItems: StartHereItem[] = [];

    for (const node of nodes) {
      if (node.metadata.isTest) continue;

      const isEntryPoint = this.checkIsEntryPoint(node);
      const isConfigOrUtil = node.category === 'util' && (
        node.name.includes('config') ||
        node.name.includes('helper') ||
        node.name.includes('date') ||
        node.name.includes('format') ||
        node.name.includes('constant')
      );

      const fanIn = node.importedBy.length;
      const normalizedFanIn = fanIn / maxFanIn;
      const normalizedLoc = node.lineCount / maxLoc;

      let score = 0;
      if (isEntryPoint) score += 3.0;
      score += 1.0 * normalizedFanIn;
      score += 0.3 * normalizedLoc;
      if (isConfigOrUtil) score -= 2.0;

      let label = 'Core Hub';
      if (isEntryPoint) {
        label = 'Entry Point';
      } else if (fanIn > 0) {
        label = `Imported by ${fanIn} files`;
      } else {
        label = 'Root Module';
      }

      scoredItems.push({
        id: node.id,
        name: node.name,
        relativePath: node.relativePath,
        score,
        label,
        fanIn,
        isEntryPoint,
        loc: node.lineCount
      });
    }

    scoredItems.sort((a, b) => b.score - a.score);
    return scoredItems.slice(0, topCount);
  }

  private static checkIsEntryPoint(node: FileNode): boolean {
    const lowerName = node.name.toLowerCase();
    const cleanBase = lowerName.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
    
    // Common entrypoint naming
    if (cleanBase === 'index' || cleanBase === 'main' || cleanBase === 'app' || cleanBase === 'server' || cleanBase === 'root') {
      const parts = node.relativePath.split(/[\/\\]/);
      // If at root or directly inside src/
      if (parts.length <= 2) return true;
    }

    if (node.metadata.isRoute && (cleanBase === 'page' || cleanBase === 'route' || cleanBase === 'layout')) {
      return true;
    }

    return false;
  }
}
