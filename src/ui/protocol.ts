import {
  DependencyGraph,
  ViewMode,
  CircularCycle,
  GitDiffImpactResult,
  OrphanNode,
  StartHereItem,
  BlastRadiusNode,
  DependencyEdge
} from '../graph/model';

// --- SerializedGraph = DependencyGraph (already serializable) ---
export type SerializedGraph = DependencyGraph;

// --- GraphDiff: incremental graph update ---
export interface GraphDiff {
  addedNodes: string[];
  removedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
  graph: DependencyGraph;
}

// --- Blast result: [fileId, depth][] from extension host ---
export type BlastResult = [string, number][];

// --- RankedFile: entry point ranking from extension host ---
export type RankedFile = StartHereItem;

// ============================================================
// Extension → Webview (BASE protocol from brief Section 9)
// ============================================================
export type ExtensionToWebviewMessage =
  | {
      type: 'graph/full';
      payload: { graph: SerializedGraph };
    }
  | {
      type: 'graph/patch';
      payload: GraphDiff;
    }
  | {
      type: 'select';
      payload: { id: string; blast: BlastResult };
    }
  | {
      type: 'activeFile';
      payload: { id: string | null };
    }
  | {
      type: 'startHere';
      payload: RankedFile[];
    }
  | {
      type: 'status';
      payload: { state: 'indexing' | 'ready' | 'error'; detail?: string };
    }
  // --- EXTENSIONS: extra types for existing features ---
  | {
      type: 'circularCycles';
      payload: { cycles: CircularCycle[] };
    }
  | {
      type: 'orphanNodes';
      payload: { orphans: OrphanNode[] };
    }
  | {
      type: 'gitDiffResult';
      payload: { result: GitDiffImpactResult };
    }
  | {
      type: 'scanProgress';
      payload: { current: number; total: number; stage: string };
    }
  | {
      type: 'error';
      payload: { message: string };
    }
  | {
      type: 'initState';
      payload: {
        graph: SerializedGraph | null;
        activeFileId: string | null;
        viewMode: ViewMode;
        workspaceRoot: string;
        circularCycles?: CircularCycle[];
        orphanNodes?: OrphanNode[];
        startHere?: RankedFile[];
      };
    };

// ============================================================
// Webview → Extension (BASE protocol from brief Section 9)
// ============================================================
export type WebviewToExtensionMessage =
  | {
      type: 'openFile';
      payload: { id: string };
    }
  | {
      type: 'requestBlast';
      payload: { id: string };
    }
  | {
      type: 'reindex';
    }
  | {
      type: 'ready';
    }
  // --- EXTENSIONS: extra types for existing features ---
  | {
      type: 'analyzeGitDiff';
    }
  | {
      type: 'setViewMode';
      payload: { mode: ViewMode };
    }
  | {
      type: 'showMessage';
      payload: { text: string; level?: 'info' | 'warn' | 'error' };
    }
  | {
      type: 'copyClipboard';
      payload: { text: string };
    }
  | {
      type: 'saveFile';
      payload: {
        defaultName: string;
        content: string;
        isBase64?: boolean;
        filters?: Record<string, string[]>;
      };
    }
  | {
      type: 'openUntitledDocument';
      payload: { content: string; language: string };
    }
  | {
      type: 'exportAuditReport';
    };
