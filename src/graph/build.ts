import * as vscode from 'vscode';
import { DependencyGraph, DependencyEdge, FileNode, ImpactResult } from './model';
import { WorkspaceScanner } from '../indexer/scanner';
import { ImpactAnalyzer } from './blast';
import { SerializedAtlasCache, CachedFileRecord } from '../cache/store';
import path from 'path';

export class GraphStore {
  private scanner: WorkspaceScanner;
  private graph: DependencyGraph | null = null;
  private isScanning = false;

  constructor(rootUri: vscode.Uri, customExcludes: string[] = []) {
    this.scanner = new WorkspaceScanner(rootUri, customExcludes);
  }

  public updateConfig(rootUri: vscode.Uri, customExcludes: string[] = []) {
    this.scanner.updateConfig(rootUri, customExcludes);
  }

  public setCache(cache: SerializedAtlasCache | null) {
    this.scanner.setCache(cache);
  }

  public getCacheRecords(): Record<string, CachedFileRecord> {
    return this.scanner.getCacheRecords();
  }

  public getGraph(): DependencyGraph | null {
    return this.graph;
  }

  public getNode(fileId: string): FileNode | null {
    if (!this.graph) return null;
    const normalized = path.normalize(fileId);
    return this.graph.nodes[normalized] || null;
  }

  public async scanWorkspace(onProgress?: (current: number, total: number, stage: string) => void): Promise<DependencyGraph> {
    if (this.isScanning) {
      if (this.graph) return this.graph;
    }
    this.isScanning = true;
    try {
      this.graph = await this.scanner.scan(onProgress);
      return this.graph;
    } finally {
      this.isScanning = false;
    }
  }

  public handleFileChanged(filePath: string): { updated: boolean; affectedFileId: string } {
    if (!this.graph) return { updated: false, affectedFileId: filePath };

    const normalized = path.normalize(filePath);
    const parseResult = this.scanner.reparseFile(normalized);

    if (!parseResult) {
      return { updated: false, affectedFileId: normalized };
    }

    // Update node
    this.graph.nodes[normalized] = parseResult.node;

    // Remove old outgoing edges from this node
    this.graph.edges = this.graph.edges.filter((edge) => edge.source !== normalized);

    // Add new outgoing edges
    for (const edge of parseResult.internalEdges) {
      this.graph.edges.push(edge);
    }

    // Rebuild importedBy lists across all nodes
    for (const node of Object.values(this.graph.nodes)) {
      node.importedBy = [];
    }
    for (const edge of this.graph.edges) {
      const targetNode = this.graph.nodes[edge.target];
      if (targetNode && !targetNode.importedBy.includes(edge.source)) {
        targetNode.importedBy.push(edge.source);
      }
    }

    return { updated: true, affectedFileId: normalized };
  }

  public handleFileDeleted(filePath: string): boolean {
    if (!this.graph) return false;
    const normalized = path.normalize(filePath);
    if (!this.graph.nodes[normalized]) return false;

    delete this.graph.nodes[normalized];
    this.graph.edges = this.graph.edges.filter((e) => e.source !== normalized && e.target !== normalized);

    // Clean up references
    for (const node of Object.values(this.graph.nodes)) {
      node.imports = node.imports.filter((id) => id !== normalized);
      node.importedBy = node.importedBy.filter((id) => id !== normalized);
    }

    return true;
  }

  /**
   * Get filtered subgraph for Focus Mode (target file + its direct dependencies + direct dependents)
   */
  public getFocusSubgraph(targetFileId: string, depth = 1): { nodes: FileNode[]; edges: DependencyEdge[] } {
    if (!this.graph) return { nodes: [], edges: [] };

    const normalizedTarget = path.normalize(targetFileId);
    const targetNode = this.graph.nodes[normalizedTarget];
    if (!targetNode) return { nodes: [], edges: [] };

    const nodeSet = new Set<string>([normalizedTarget]);

    // 1. Direct dependencies (outbound: target -> dep)
    for (const depId of targetNode.imports) {
      if (this.graph.nodes[depId]) {
        nodeSet.add(depId);
      }
    }

    // 2. Direct dependents (inbound: consumer -> target)
    for (const consumerId of targetNode.importedBy) {
      if (this.graph.nodes[consumerId]) {
        nodeSet.add(consumerId);
      }
    }

    // Filter edges connecting any of the included nodes
    const relevantEdges = this.graph.edges.filter(
      (edge) => nodeSet.has(edge.source) && nodeSet.has(edge.target)
    );

    const relevantNodes = Array.from(nodeSet)
      .map((id) => this.graph!.nodes[id])
      .filter(Boolean);

    return {
      nodes: relevantNodes,
      edges: relevantEdges
    };
  }

  /**
   * Get Impact analysis for target file
   */
  public analyzeImpact(targetFileId: string, maxDepth?: number): ImpactResult | null {
    if (!this.graph) return null;
    const normalized = path.normalize(targetFileId);
    return ImpactAnalyzer.analyze(this.graph, normalized, maxDepth);
  }
}
