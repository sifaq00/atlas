import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../ui/protocol';
import { GraphStore } from '../graph/build';
import { ViewMode } from '../graph/model';
import { CycleDetector } from '../graph/cycle';
import { GitDiffAnalyzer } from '../git/diff';
import { OrphanDetector } from '../graph/orphan';
import { StartHereRanker } from '../graph/rank';
import { AuditReportGenerator } from '../audit/report';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class AtlasWebviewPanel {
  public static currentPanel: AtlasWebviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly graphStore: GraphStore;
  private disposables: vscode.Disposable[] = [];
  private activeFileId: string | null = null;
  private currentMode: ViewMode = 'focus';

  public static render(extensionUri: vscode.Uri, graphStore: GraphStore, initialFileId?: string, initialMode: ViewMode = 'focus') {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (AtlasWebviewPanel.currentPanel) {
      AtlasWebviewPanel.currentPanel.panel.reveal(column);
      if (initialFileId) {
        AtlasWebviewPanel.currentPanel.setActiveFile(initialFileId, initialMode);
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'atlasWebview',
      'Atlas — Codebase Map',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist-webview'),
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );

    AtlasWebviewPanel.currentPanel = new AtlasWebviewPanel(panel, extensionUri, graphStore, initialFileId, initialMode);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    graphStore: GraphStore,
    initialFileId?: string,
    initialMode: ViewMode = 'focus'
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.graphStore = graphStore;
    this.activeFileId = initialFileId || null;
    this.currentMode = initialMode;

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => this.handleWebviewMessage(message),
      null,
      this.disposables
    );
  }

  public postMessage(message: ExtensionToWebviewMessage) {
    this.panel.webview.postMessage(message);
  }

  public setActiveFile(fileId: string, mode?: ViewMode) {
    this.activeFileId = fileId;
    if (mode) {
      this.currentMode = mode;
    }
    this.postMessage({ type: 'activeFile', payload: { id: fileId } });
  }

  public refreshGraph() {
    const graph = this.graphStore.getGraph();
    if (graph) {
      this.postMessage({
        type: 'graph/full',
        payload: { graph }
      });
      setTimeout(() => {
        try {
          const cycles = CycleDetector.detectCycles(graph);
          if (cycles.length > 0) this.postMessage({ type: 'circularCycles', payload: { cycles } });
        } catch (e) { console.error('[Atlas] cycle detection error:', e); }
      }, 100);
      setTimeout(() => {
        try {
          const orphans = OrphanDetector.detectOrphans(graph);
          if (orphans.length > 0) this.postMessage({ type: 'orphanNodes', payload: { orphans } });
        } catch (e) { console.error('[Atlas] orphan detection error:', e); }
      }, 200);
      setTimeout(() => {
        try {
          const startHere = StartHereRanker.rank(graph, 5);
          if (startHere.length > 0) this.postMessage({ type: 'startHere', payload: startHere });
        } catch (e) { console.error('[Atlas] startHere ranking error:', e); }
      }, 300);
    }
  }

  private async handleWebviewMessage(message: WebviewToExtensionMessage) {
    switch (message.type) {
      case 'ready': {
        const graph = this.graphStore.getGraph();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders && workspaceFolders[0] ? workspaceFolders[0].uri.fsPath : '';

        const cycles = graph ? CycleDetector.detectCycles(graph) : [];
        const orphans = graph ? OrphanDetector.detectOrphans(graph) : [];
        const startHere = graph ? StartHereRanker.rank(graph, 5) : [];

        this.postMessage({
          type: 'initState',
          payload: {
            graph,
            activeFileId: this.activeFileId,
            viewMode: this.currentMode,
            workspaceRoot,
            circularCycles: cycles,
            orphanNodes: orphans,
            startHere
          }
        });

        if (this.activeFileId) {
          const impact = this.graphStore.analyzeImpact(this.activeFileId);
          const blast: [string, number][] = impact
            ? impact.affectedNodes.map((n) => [n.id, n.depth])
            : [];
          this.postMessage({
            type: 'select',
            payload: { id: this.activeFileId, blast }
          });
        }
        break;
      }

      case 'requestBlast': {
        this.activeFileId = message.payload.id;
        const impact = this.graphStore.analyzeImpact(message.payload.id);
        const blast: [string, number][] = impact
          ? impact.affectedNodes.map((n) => [n.id, n.depth])
          : [];
        this.postMessage({
          type: 'select',
          payload: { id: message.payload.id, blast }
        });
        break;
      }

      case 'openFile': {
        try {
          const docUri = vscode.Uri.file(message.payload.id);
          const doc = await vscode.workspace.openTextDocument(docUri);
          await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false
          });
        } catch (err) {
          vscode.window.showErrorMessage(`Atlas: Could not open file ${message.payload.id}`);
        }
        break;
      }

      case 'setViewMode': {
        this.currentMode = message.payload.mode;
        break;
      }

      case 'analyzeGitDiff': {
        const graph = this.graphStore.getGraph();
        if (graph) {
          const result = await GitDiffAnalyzer.analyzeGitImpact(graph);
          this.postMessage({
            type: 'gitDiffResult',
            payload: { result }
          });
        }
        break;
      }

      case 'showMessage': {
        const text = message.payload.text;
        const level = message.payload.level || 'info';
        if (level === 'warn') {
          vscode.window.showWarningMessage(text);
        } else if (level === 'error') {
          vscode.window.showErrorMessage(text);
        } else {
          vscode.window.showInformationMessage(text);
        }
        break;
      }

      case 'copyClipboard': {
        try {
          await vscode.env.clipboard.writeText(message.payload.text);
          vscode.window.showInformationMessage('Atlas: Mermaid diagram copied to clipboard (ready for GitHub PR / Markdown)!');
        } catch (err: any) {
          vscode.window.showErrorMessage(`Atlas: Failed to copy to clipboard - ${err.message}`);
        }
        break;
      }

      case 'reindex': {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Atlas: Scanning workspace dependencies...',
            cancellable: false
          },
          async (progress) => {
            await this.graphStore.scanWorkspace((current, total, stage) => {
              const increment = total > 0 ? (current / total) * 100 : 0;
              progress.report({ message: `${stage} (${current}/${total})`, increment });
            });
          }
        );
        this.refreshGraph();
        break;
      }

      case 'saveFile': {
        try {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const defaultFolder = workspaceFolders && workspaceFolders[0] ? workspaceFolders[0].uri.fsPath : '';
          const defaultUri = vscode.Uri.file(path.join(defaultFolder, message.payload.defaultName));

          const targetUri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: message.payload.filters || { 'All Files': ['*'] },
            saveLabel: 'Save Export'
          });

          if (targetUri) {
            if (message.payload.isBase64) {
              const base64Data = message.payload.content.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64Data, 'base64');
              await vscode.workspace.fs.writeFile(targetUri, buffer);
            } else {
              const buffer = Buffer.from(message.payload.content, 'utf8');
              await vscode.workspace.fs.writeFile(targetUri, buffer);
            }

            vscode.window.showInformationMessage(
              `Atlas: File exported successfully to ${path.basename(targetUri.fsPath)}`,
              'Open File'
            ).then((action) => {
              if (action === 'Open File') {
                vscode.commands.executeCommand('vscode.open', targetUri);
              }
            });
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`Atlas: Failed to save file - ${err.message}`);
        }
        break;
      }

      case 'openUntitledDocument': {
        try {
          const doc = await vscode.workspace.openTextDocument({
            content: message.payload.content,
            language: message.payload.language
          });
          await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false
          });
        } catch (err: any) {
          vscode.window.showErrorMessage(`Atlas: Failed to open document - ${err.message}`);
        }
        break;
      }

      case 'exportAuditReport': {
        const graph = this.graphStore.getGraph();
        if (graph) {
          const cycles = CycleDetector.detectCycles(graph);
          const orphans = OrphanDetector.detectOrphans(graph);
          const reportMd = AuditReportGenerator.generateMarkdownReport(graph, cycles, orphans);
          const doc = await vscode.workspace.openTextDocument({
            content: reportMd,
            language: 'markdown'
          });
          await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preview: false
          });
        }
        break;
      }
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const distWebviewPath = vscode.Uri.joinPath(this.extensionUri, 'dist-webview');
    const indexPath = path.join(distWebviewPath.fsPath, 'index.html');

    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf8');

      const buildTime = Date.now();
      const cspSource = webview.cspSource;
      const nonce = getNonce();

      html = html.replace(/(src|href)="(\.\/assets\/[^"]+)"/g, (_, attr, relPath) => {
        const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(distWebviewPath, relPath.replace('./', '')));
        return `${attr}="${assetUri}?v=${buildTime}"`;
      });

      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${cspSource} blob:; style-src 'unsafe-inline' ${cspSource}; img-src ${cspSource} data:; connect-src ${cspSource};">`;
      html = html.replace('<head>', `<head>\n    ${cspMeta}`);

      return html;
    }

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Atlas</title>
      <style>
        body { font-family: sans-serif; padding: 2rem; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
      </style>
    </head>
    <body>
      <h2>Atlas Webview Loading...</h2>
      <p>Please build the webview using <code>pnpm run build:webview</code>.</p>
    </body>
    </html>`;
  }

  public dispose() {
    AtlasWebviewPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) x.dispose();
    }
  }
}
