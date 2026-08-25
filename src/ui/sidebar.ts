import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import { GraphStore } from '../graph/build';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from './protocol';
import { CycleDetector } from '../graph/cycle';
import { OrphanDetector } from '../graph/orphan';
import { StartHereRanker } from '../graph/rank';
import { GitDiffAnalyzer } from '../git/diff';
import { AuditReportGenerator } from '../audit/report';

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class AtlasSidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'atlas.mapView';
  private _view?: vscode.WebviewView;
  private readonly extensionUri: vscode.Uri;
  private readonly graphStore: GraphStore;
  private activeFileId: string | null = null;

  constructor(extensionUri: vscode.Uri, graphStore: GraphStore) {
    this.extensionUri = extensionUri;
    this.graphStore = graphStore;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist-webview'),
        vscode.Uri.joinPath(this.extensionUri, 'dist')
      ]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: WebviewToExtensionMessage) => {
      this.handleWebviewMessage(message);
    });
  }

  public postMessage(message: ExtensionToWebviewMessage) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  public setActiveFile(fileId: string) {
    this.activeFileId = fileId;
    this.postMessage({ type: 'activeFile', payload: { id: fileId } });
  }

  public refreshGraph() {
    const graph = this.graphStore.getGraph();
    if (graph) {
      this.postMessage({
        type: 'graph/full',
        payload: { graph }
      });
      // Heavy analysis async
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

        this.postMessage({
          type: 'initState',
          payload: {
            graph,
            activeFileId: this.activeFileId,
            viewMode: 'focus',
            workspaceRoot
          }
        });

        // Compute heavy analysis async to avoid blocking extension host
        if (graph) {
          setTimeout(() => {
            try {
              const cycles = CycleDetector.detectCycles(graph);
              if (cycles.length > 0) {
                this.postMessage({ type: 'circularCycles', payload: { cycles } });
              }
            } catch (e) { console.error('[Atlas] cycle detection error:', e); }
          }, 100);

          setTimeout(() => {
            try {
              const orphans = OrphanDetector.detectOrphans(graph);
              if (orphans.length > 0) {
                this.postMessage({ type: 'orphanNodes', payload: { orphans } });
              }
            } catch (e) { console.error('[Atlas] orphan detection error:', e); }
          }, 200);

          setTimeout(() => {
            try {
              const startHere = StartHereRanker.rank(graph, 5);
              if (startHere.length > 0) {
                this.postMessage({ type: 'startHere', payload: startHere });
              }
            } catch (e) { console.error('[Atlas] startHere ranking error:', e); }
          }, 300);

          if (this.activeFileId) {
            setTimeout(() => {
              try {
                const impact = this.graphStore.analyzeImpact(this.activeFileId!);
                const blast: [string, number][] = impact
                  ? impact.affectedNodes.map((n) => [n.id, n.depth])
                  : [];
                this.postMessage({
                  type: 'select',
                  payload: { id: this.activeFileId!, blast }
                });
              } catch (e) { console.error('[Atlas] blast analysis error:', e); }
            }, 400);
          }
        }
        break;
      }

      case 'requestBlast': {
        this.activeFileId = message.payload.id;
        // Send selection immediately, compute blast async
        this.postMessage({
          type: 'select',
          payload: { id: message.payload.id, blast: [] }
        });
        setTimeout(() => {
          try {
            const impact = this.graphStore.analyzeImpact(message.payload.id);
            const blast: [string, number][] = impact
              ? impact.affectedNodes.map((n) => [n.id, n.depth])
              : [];
            this.postMessage({
              type: 'select',
              payload: { id: message.payload.id, blast }
            });
          } catch (e) { console.error('[Atlas] blast analysis error:', e); }
        }, 0);
        break;
      }

      case 'openFile': {
        try {
          const document = await vscode.workspace.openTextDocument(message.payload.id);
          const editor = await vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus: false
          });
        } catch (err) {
          vscode.window.showErrorMessage(`Atlas: Could not open file ${message.payload.id}`);
        }
        break;
      }

      case 'analyzeGitDiff': {
        const graph = this.graphStore.getGraph();
        if (graph) {
          try {
            const result = await GitDiffAnalyzer.analyzeGitImpact(graph);
            this.postMessage({
              type: 'gitDiffResult',
              payload: { result }
            });
          } catch (err) {
            vscode.window.showErrorMessage(`Atlas Git Diff Analysis failed: ${err}`);
          }
        }
        break;
      }

      case 'showMessage': {
        vscode.window.showInformationMessage(message.payload.text);
        break;
      }

      case 'setViewMode': {
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

      case 'saveFile': {
        try {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const defaultFolder = workspaceFolders && workspaceFolders[0] ? workspaceFolders[0].uri.fsPath : '';
          const defaultUri = vscode.Uri.file(path.join(defaultFolder, message.payload.defaultName || 'atlas-export.png'));

          const targetUri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: message.payload.filters || { 'Images (*.png)': ['png'] }
          });

          if (targetUri) {
            let buffer: Buffer;
            if (message.payload.isBase64) {
              const base64Data = message.payload.content.replace(/^data:image\/\w+;base64,/, '');
              buffer = Buffer.from(base64Data, 'base64');
            } else {
              buffer = Buffer.from(message.payload.content, 'utf8');
            }

            await vscode.workspace.fs.writeFile(targetUri, buffer);
            vscode.window.showInformationMessage(`Atlas: Exported successfully to ${path.basename(targetUri.fsPath)}`);
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(`Atlas: Export failed - ${err.message}`);
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

      case 'reindex': {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Atlas: Scanning workspace dependencies...',
            cancellable: false
          },
          async () => {
            await this.graphStore.scanWorkspace();
          }
        );
        this.refreshGraph();
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

      html = html.replace(/\s*crossorigin/g, '');

      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' ${cspSource}; style-src 'unsafe-inline' ${cspSource}; img-src ${cspSource} data:; connect-src ${cspSource};">`;
      html = html.replace('<head>', `<head>\n    ${cspMeta}`);

      return html;
    }

    return `<!DOCTYPE html><html><body><h2>Atlas Loading...</h2></body></html>`;
  }
}
