import * as vscode from 'vscode';
import { GraphStore } from '../graph/build';
import { isSupportedFile } from '../scanner/ignoreRules';

export class AtlasCodeLensProvider implements vscode.CodeLensProvider {
  private graphStore: GraphStore;
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  constructor(graphStore: GraphStore) {
    this.graphStore = graphStore;
  }

  public refresh() {
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const config = vscode.workspace.getConfiguration('atlas');
    const enabled = config.get<boolean>('codelens.enabled', true);
    if (!enabled) {
      return [];
    }

    const filePath = document.uri.fsPath;
    if (!isSupportedFile(filePath)) {
      return [];
    }

    const node = this.graphStore.getNode(filePath);
    if (!node) {
      return [];
    }

    const dependentCount = node.importedBy.length;
    if (dependentCount === 0) {
      return [];
    }

    const range = new vscode.Range(0, 0, 0, 0);
    const titleText = `Atlas: ${dependentCount} ${dependentCount === 1 ? 'file depends' : 'files depend'} on this · show map`;

    const codeLens = new vscode.CodeLens(range, {
      title: titleText,
      tooltip: `Click to inspect the full architecture map and blast radius for ${node.name}`,
      command: 'atlas.showBlast',
      arguments: [document.uri]
    });

    return [codeLens];
  }
}
