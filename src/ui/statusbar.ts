import * as vscode from 'vscode';
import path from 'path';
import { GraphStore } from '../graph/build';
import { isSupportedFile } from '../scanner/ignoreRules';

export class AtlasStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private graphStore: GraphStore;

  constructor(graphStore: GraphStore) {
    this.graphStore = graphStore;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'atlas.showBlast';
    this.statusBarItem.name = 'Atlas Blast Radius';
  }

  public update(editor: vscode.TextEditor | undefined) {
    if (!editor) {
      this.statusBarItem.hide();
      return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!isSupportedFile(filePath)) {
      this.statusBarItem.hide();
      return;
    }

    const impact = this.graphStore.analyzeImpact(filePath);
    const totalAffected = impact ? impact.totalAffected : 0;
    const fileName = path.basename(filePath);

    const config = vscode.workspace.getConfiguration('atlas');
    const threshold = config.get<number>('blastThreshold', 30);

    this.statusBarItem.text = `$(circuit-board) ${totalAffected} affected`;
    
    if (totalAffected >= threshold) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = `Atlas: ⚠️ HIGH BLAST RADIUS (${totalAffected} affected files) if ${fileName} is modified. Click to inspect map.`;
    } else {
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.tooltip = `Atlas: ${totalAffected} files depend on ${fileName}. Click to view blast radius map.`;
    }

    this.statusBarItem.show();
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
