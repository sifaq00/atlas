import { exec } from 'child_process';
import * as path from 'path';
import { DependencyGraph, GitDiffImpactResult, BlastRadiusNode, DependencyEdge, RiskLevel } from '../graph/model';
import { ImpactAnalyzer } from '../graph/blast';
import { PathResolver } from '../indexer/resolver';

export class GitDiffAnalyzer {
  /**
   * Retrieves modified/staged/uncommitted files from Git in the workspace
   */
  public static async getChangedFiles(workspaceRoot: string): Promise<{ branch: string; files: string[] }> {
    return new Promise((resolve) => {
      exec('git status --porcelain', { cwd: workspaceRoot }, (err, stdout) => {
        if (err || !stdout) {
          // If not a git repo or no changes
          resolve({ branch: 'HEAD', files: [] });
          return;
        }

        const lines = stdout.trim().split('\n');
        const changedFiles: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Git status output format: "XY path/to/file.ts" or "R  old -> new"
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            let filePath = parts[parts.length - 1];
            if (filePath) {
              const absPath = PathResolver.normalizePath(path.resolve(workspaceRoot, filePath));
              changedFiles.push(absPath);
            }
          }
        }

        // Get current branch name
        exec('git branch --show-current', { cwd: workspaceRoot }, (_, branchOut) => {
          const branchName = (branchOut && branchOut.trim()) || 'main';
          resolve({ branch: branchName, files: changedFiles });
        });
      });
    });
  }

  /**
   * Calculates the combined cumulative Blast Radius of all changed files in Git
   */
  public static async analyzeGitImpact(graph: DependencyGraph): Promise<GitDiffImpactResult> {
    const { branch, files } = await this.getChangedFiles(graph.rootPath);

    // Filter to changed files that exist in the dependency graph
    const validTargetFileIds = files.filter((fId) => Boolean(graph.nodes[fId]));

    if (validTargetFileIds.length === 0) {
      return {
        branchName: branch,
        modifiedFiles: [],
        totalAffected: 0,
        riskLevel: 'LOW',
        riskScore: 0,
        combinedAffectedNodes: [],
        impactEdges: [],
        uiAffected: 0,
        servicesAffected: 0,
        otherAffected: 0
      };
    }

    const allAffectedMap = new Map<string, BlastRadiusNode>();
    const allImpactEdges: DependencyEdge[] = [];
    const edgeKeySet = new Set<string>();

    let cumulativeScore = 0;
    let uiCount = 0;
    let servicesCount = 0;
    let otherCount = 0;

    for (const targetId of validTargetFileIds) {
      const impact = ImpactAnalyzer.analyze(graph, targetId);
      if (impact) {
        cumulativeScore += impact.riskScore;

        for (const node of impact.affectedNodes) {
          if (!allAffectedMap.has(node.id)) {
            allAffectedMap.set(node.id, node);

            if (node.category === 'ui') uiCount++;
            else if (node.category === 'service') servicesCount++;
            else otherCount++;
          }
        }

        for (const edge of impact.impactGraphEdges) {
          const key = `${edge.source}->${edge.target}`;
          if (!edgeKeySet.has(key)) {
            edgeKeySet.add(key);
            allImpactEdges.push(edge);
          }
        }
      }
    }

    const totalAffected = allAffectedMap.size;
    let riskLevel: RiskLevel = 'LOW';
    if (cumulativeScore >= 40 || uiCount >= 3) riskLevel = 'CRITICAL';
    else if (cumulativeScore >= 20 || uiCount >= 1 || totalAffected >= 5) riskLevel = 'HIGH';
    else if (cumulativeScore >= 10 || totalAffected >= 2) riskLevel = 'MEDIUM';

    return {
      branchName: branch,
      modifiedFiles: validTargetFileIds,
      totalAffected,
      riskLevel,
      riskScore: cumulativeScore,
      combinedAffectedNodes: Array.from(allAffectedMap.values()),
      impactEdges: allImpactEdges,
      uiAffected: uiCount,
      servicesAffected: servicesCount,
      otherAffected: otherCount
    };
  }
}
