export type FileCategory =
  | 'ui'
  | 'service'
  | 'data'
  | 'util'
  | 'config'
  | 'other';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FileMetadata {
  isTest: boolean;
  isRoute: boolean;
  isComponent: boolean;
  isDatabase: boolean;
  isService: boolean;
  isConfig: boolean;
  isExternal?: boolean;
}

export interface FileNode {
  id: string; // normalized path (e.g. 'src/App.tsx')
  relativePath: string;
  name: string;
  extension: string;
  category: FileCategory;
  lineCount: number;
  sizeBytes: number;
  imports: string[]; // List of target file IDs
  importedBy: string[]; // List of source file IDs
  externalImports: string[]; // e.g. 'react', 'lodash'
  exports: string[];
  metadata: FileMetadata;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface DependencyEdge {
  id: string;
  source: string; // Importer file ID
  target: string; // Imported file ID
  type: 'import' | 'dynamic-import' | 're-export';
  isExternal?: boolean;
}

export type HealthGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ArchitectureIssue {
  id: string;
  type: 'circular' | 'orphan' | 'god-module' | 'deep-cascade' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  fileIds: string[];
}

export interface HealthReport {
  grade: HealthGrade;
  score: number; // 0 - 100
  totalLines: number;
  deadCodePercentage: number;
  orphanCount: number;
  circularCyclesCount: number;
  godModulesCount: number;
  issues: ArchitectureIssue[];
}

export interface DependencyGraph {
  nodes: Record<string, FileNode>;
  edges: DependencyEdge[];
  rootPath: string;
  repoName: string;
  scannedAt: number;
  totalFiles: number;
  totalDependencies: number;
  health: HealthReport;
  prChangedFiles?: string[];
  pullNumber?: number;
}

export interface BlastRadiusNode {
  id: string;
  relativePath: string;
  name: string;
  category: FileCategory;
  depth: number;
  isDirect: boolean;
}

export interface ImpactResult {
  targetFileId: string;
  targetFileName: string;
  targetRelativePath: string;
  targetCategory: FileCategory;
  totalAffected: number;
  directDependentsCount: number;
  indirectDependentsCount: number;
  maxDepth: number;
  uiAffected: number;
  servicesAffected: number;
  dataAffected: number;
  utilsAffected: number;
  otherAffected: number;
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: string[];
  affectedNodes: BlastRadiusNode[];
  impactGraphEdges: DependencyEdge[];
  hasCircularDependency: boolean;
  circularPaths?: string[][];
}

export type ViewMode = 'full' | 'focus' | 'impact';

export type MainViewMode = 'graph' | '3d' | 'radial' | 'treemap' | 'matrix' | 'flow';

export type GraphPhysicsLayout = 'hierarchical' | 'organic' | 'radial' | 'cluster';

export type IsolationMode = 'full' | '1-hop' | '2-hop';
