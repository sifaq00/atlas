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
  id: string; // Absolute path or normalized relative path
  relativePath: string;
  name: string;
  extension: string;
  category: FileCategory;
  lineCount: number;
  sizeBytes: number;
  imports: string[]; // List of target file IDs
  importedBy: string[]; // List of source file IDs
  externalImports: string[]; // e.g. 'react', 'lodash'
  exports: string[]; // e.g. ['useAuth', 'AuthProvider', 'default']
  metadata: FileMetadata;
}

export interface DependencyEdge {
  id: string;
  source: string; // Importer file ID
  target: string; // Imported file ID
  type: 'import' | 'dynamic-import' | 're-export';
  isExternal?: boolean;
  importedSymbols?: string[];
}

export interface DependencyGraph {
  nodes: Record<string, FileNode>;
  edges: DependencyEdge[];
  rootPath: string;
  scannedAt: number;
  totalFiles: number;
}

export interface BlastRadiusNode {
  id: string;
  relativePath: string;
  name: string;
  category: FileCategory;
  depth: number;
  isDirect: boolean;
  importedSymbols?: string[];
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

export type ViewMode = 'focus' | 'impact' | 'full';

export interface GraphFilterOptions {
  searchTerm?: string;
  hideTests?: boolean;
  hideExternal?: boolean;
  categoryFilter?: FileCategory[];
  maxDepth?: number;
}

export interface CircularCycle {
  id: string;
  files: string[]; // List of file IDs in the cycle: [A, B, C, A]
  length: number;
}

export interface GitDiffImpactResult {
  branchName: string;
  modifiedFiles: string[];
  totalAffected: number;
  riskLevel: RiskLevel;
  riskScore: number;
  combinedAffectedNodes: BlastRadiusNode[];
  impactEdges: DependencyEdge[];
  uiAffected: number;
  servicesAffected: number;
  otherAffected: number;
}

export interface OrphanNode {
  id: string;
  name: string;
  relativePath: string;
  category: FileCategory;
  lineCount: number;
  sizeBytes: number;
  reason: string;
}

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
