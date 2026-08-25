import * as vscode from 'vscode';
import path from 'path';
import { GraphStore } from './graph/build';
import { AtlasWebviewPanel } from './extension/atlasWebviewPanel';
import { isSupportedFile } from './scanner/ignoreRules';
import { AtlasStatusBar } from './ui/statusbar';
import { AtlasCodeLensProvider } from './ui/codelens';
import { AtlasSidebarViewProvider } from './ui/sidebar';
import { AtlasCacheStore } from './cache/store';
import { isUsingParserFallback } from './indexer/parser';
import { ExtensionToWebviewMessage } from './ui/protocol';

let graphStore: GraphStore | null = null;
let fileWatcher: vscode.FileSystemWatcher | null = null;
let changeDebounceTimer: NodeJS.Timeout | null = null;
let statusBar: AtlasStatusBar | null = null;
let codeLensProvider: AtlasCodeLensProvider | null = null;
let sidebarProvider: AtlasSidebarViewProvider | null = null;

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const workspaceUri = workspaceFolders[0].uri;
  const storageUri = context.storageUri || vscode.Uri.file(path.join(workspaceRoot, '.vscode'));
  const config = vscode.workspace.getConfiguration('atlas');
  const customExcludes = config.get<string[]>('exclude', []);

  graphStore = new GraphStore(workspaceUri, customExcludes);

  // Load persistent cache from context.storageUri if available
  try {
    const cachedData = await AtlasCacheStore.loadCache(storageUri, workspaceRoot);
    if (cachedData) {
      graphStore.setCache(cachedData);
    }
  } catch (err) {
    console.warn('[Atlas] Cache load error:', err);
  }

  // 1. Initialize Status Bar
  statusBar = new AtlasStatusBar(graphStore);
  statusBar.update(vscode.window.activeTextEditor);

  // 2. Register CodeLens Provider
  codeLensProvider = new AtlasCodeLensProvider(graphStore);
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    [
      { language: 'typescript' },
      { language: 'typescriptreact' },
      { language: 'javascript' },
      { language: 'javascriptreact' }
    ],
    codeLensProvider
  );

  // 3. Register Sidebar View Provider (Activity Bar)
  sidebarProvider = new AtlasSidebarViewProvider(context.extensionUri, graphStore);
  const sidebarDisposable = vscode.window.registerWebviewViewProvider(
    AtlasSidebarViewProvider.viewType,
    sidebarProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }
  );

  // Helper to scan workspace and persist cache
  const runScanAndCache = async (progressTitle?: string) => {
    if (!graphStore) return;
    try {
      await graphStore.scanWorkspace();
      const records = graphStore.getCacheRecords();
      await AtlasCacheStore.saveCache(storageUri, workspaceRoot, records);
      statusBar?.update(vscode.window.activeTextEditor);
      codeLensProvider?.refresh();
      sidebarProvider?.refreshGraph();
      AtlasWebviewPanel.currentPanel?.refreshGraph();
      if (isUsingParserFallback()) {
        const msg: ExtensionToWebviewMessage = { type: 'status', payload: { state: 'ready', detail: 'running in compatibility mode' } };
        AtlasWebviewPanel.currentPanel?.postMessage(msg);
        sidebarProvider?.postMessage(msg);
      }
    } catch (err) {
      console.error('[Atlas] Scan failed:', err);
    }
  };

  // Background workspace scan on startup
  const autoIndex = config.get<boolean>('autoIndex', true);
  if (autoIndex) {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: 'Atlas: Mapping codebase architecture...'
      },
      async () => {
        await runScanAndCache();
      }
    );
  }

  // Helper to open Atlas webview tab
  const openAtlas = async (uri?: vscode.Uri, mode: 'focus' | 'impact' = 'focus') => {
    let targetFile = uri?.fsPath;
    if (!targetFile && vscode.window.activeTextEditor) {
      targetFile = vscode.window.activeTextEditor.document.uri.fsPath;
    }
    if (graphStore) {
      AtlasWebviewPanel.render(context.extensionUri, graphStore, targetFile, mode);
      if (targetFile) {
        AtlasWebviewPanel.currentPanel?.setActiveFile(targetFile, mode);
        sidebarProvider?.setActiveFile(targetFile);
      }
    }
  };

  // Helper to reindex and nuke cache
  const reindexAtlas = async () => {
    if (graphStore) {
      await AtlasCacheStore.clearCache(storageUri);
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Atlas: Re-indexing workspace architecture...',
          cancellable: false
        },
        async () => {
          await runScanAndCache();
        }
      );
      vscode.window.showInformationMessage('Atlas: Codebase map re-indexed and cache refreshed.');
    }
  };

  // 4. Commands: Atlas Open / Reindex / ShowBlast / FocusFile
  const atlasOpenCmd = vscode.commands.registerCommand('atlas.open', (uri?: vscode.Uri) => openAtlas(uri, 'focus'));
  const atlasReindexCmd = vscode.commands.registerCommand('atlas.reindex', reindexAtlas);
  const atlasShowBlastCmd = vscode.commands.registerCommand('atlas.showBlast', (uri?: vscode.Uri) => openAtlas(uri, 'impact'));
  const atlasFocusFileCmd = vscode.commands.registerCommand('atlas.focusFile', (uri?: vscode.Uri) => openAtlas(uri, 'focus'));
  const atlasRefreshCmd = vscode.commands.registerCommand('atlas.refresh', reindexAtlas);

  // 5. Active Text Editor Sync
  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    statusBar?.update(editor);
    if (!editor || !graphStore) return;
    const filePath = editor.document.uri.fsPath;
    if (isSupportedFile(filePath)) {
      AtlasWebviewPanel.currentPanel?.setActiveFile(filePath);
      sidebarProvider?.setActiveFile(filePath);
    }
  });

  // 6. Incremental File Watcher
  fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,mjs,cjs}');

  const handleFileChange = (uri: vscode.Uri) => {
    if (changeDebounceTimer) clearTimeout(changeDebounceTimer);
    changeDebounceTimer = setTimeout(async () => {
      if (!graphStore) return;
      const { updated, affectedFileId } = graphStore.handleFileChanged(uri.fsPath);
      if (updated) {
        const records = graphStore.getCacheRecords();
        await AtlasCacheStore.saveCache(storageUri, workspaceRoot, records);
        AtlasWebviewPanel.currentPanel?.refreshGraph();
        sidebarProvider?.refreshGraph();
        statusBar?.update(vscode.window.activeTextEditor);
        codeLensProvider?.refresh();
      }
    }, 300);
  };

  const handleFileDelete = (uri: vscode.Uri) => {
    if (!graphStore) return;
    const deleted = graphStore.handleFileDeleted(uri.fsPath);
    if (deleted) {
      const records = graphStore.getCacheRecords();
      AtlasCacheStore.saveCache(storageUri, workspaceRoot, records);
      AtlasWebviewPanel.currentPanel?.refreshGraph();
      sidebarProvider?.refreshGraph();
      statusBar?.update(vscode.window.activeTextEditor);
      codeLensProvider?.refresh();
    }
  };

  fileWatcher.onDidChange(handleFileChange);
  fileWatcher.onDidCreate(handleFileChange);
  fileWatcher.onDidDelete(handleFileDelete);

  context.subscriptions.push(
    atlasOpenCmd,
    atlasReindexCmd,
    atlasShowBlastCmd,
    atlasFocusFileCmd,
    atlasRefreshCmd,
    activeEditorListener,
    fileWatcher,
    codeLensDisposable,
    sidebarDisposable,
    { dispose: () => statusBar?.dispose() }
  );
}

export function deactivate() {
  if (fileWatcher) fileWatcher.dispose();
  if (changeDebounceTimer) clearTimeout(changeDebounceTimer);
  if (statusBar) statusBar.dispose();
}
