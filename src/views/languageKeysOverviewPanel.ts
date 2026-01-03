import * as vscode from 'vscode';
import * as path from 'path';
import type { LanguageIndex } from '../language/languageIndex';
import { getEzCordUtilsSettings } from '../utils/settings';

const OPEN_TRANSLATION_COMMAND = 'ezcordUtils.openTranslation';

type KeyRow = {
  key: string;
  translations: number;
  hasMissingTranslations: boolean;
};

type OverviewPayload = {
  fileLabel: string;
  fileStem: string;
  languagesTotal: number;
  baseKeys: KeyRow[];
  generalKeys: KeyRow[];
  lastReloadText: string;
};

function isJumpMessage(message: unknown): message is { type: 'jump'; key: string } {
  if (!message || typeof message !== 'object') return false;
  const m = message as { [k: string]: unknown };
  return m.type === 'jump' && typeof m.key === 'string';
}

export class LanguageKeysOverviewPanel {
  public static readonly viewType = 'ezcordUtils.languageKeysOverview';

  private static currentPanel: LanguageKeysOverviewPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly index: LanguageIndex,
    private readonly output: vscode.OutputChannel,
    private readonly extensionUri: vscode.Uri
  ) {
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    this.panel.webview.html = this.getFallbackHtml('Loading…');
    void this.loadHtmlFromDisk();

    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose()),
      this.panel.webview.onDidReceiveMessage(async message => {
        if (isJumpMessage(message)) {
          const settings = getEzCordUtilsSettings();
          await vscode.commands.executeCommand(OPEN_TRANSLATION_COMMAND, {
            language: settings.defaultLanguage,
            key: message.key,
          });
        }
      }),
      vscode.window.onDidChangeActiveTextEditor(() => this.update()),
      this.index.onDidUpdate(() => this.update())
    );

    this.update();
  }

  public static createOrShow(extensionUri: vscode.Uri, index: LanguageIndex, output: vscode.OutputChannel): void {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (LanguageKeysOverviewPanel.currentPanel) {
      LanguageKeysOverviewPanel.currentPanel.panel.reveal(column);
      LanguageKeysOverviewPanel.currentPanel.update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      LanguageKeysOverviewPanel.viewType,
      'Language Keys Overview',
      column ?? vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    LanguageKeysOverviewPanel.currentPanel = new LanguageKeysOverviewPanel(panel, index, output, extensionUri);
  }

  private async loadHtmlFromDisk(): Promise<void> {
    try {
      const htmlUri = vscode.Uri.joinPath(this.extensionUri, 'media', 'languageKeysOverview.html');
      const raw = await vscode.workspace.fs.readFile(htmlUri);
      let html = Buffer.from(raw).toString('utf8');

      const styleUri = this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'media', 'languageKeysOverview.css')
      );
      const scriptUri = this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'media', 'languageKeysOverview.js')
      );

      html = html.split('{{cspSource}}').join(this.panel.webview.cspSource);
      html = html.split('{{styleUri}}').join(String(styleUri));
      html = html.split('{{scriptUri}}').join(String(scriptUri));

      this.panel.webview.html = html;
    } catch (e) {
      const msg = `Failed to load webview HTML: ${String(e)}`;
      this.output.appendLine(`[EzCord Utils] ${msg}`);
      this.panel.webview.html = this.getFallbackHtml(msg);
    }
  }

  private dispose(): void {
    LanguageKeysOverviewPanel.currentPanel = undefined;
    while (this.disposables.length) {
      const d = this.disposables.pop();
      try {
        d?.dispose();
      } catch {
      }
    }
  }

  private update(): void {
    const editor = vscode.window.activeTextEditor;
    const doc = editor?.document;

    if (!doc || doc.languageId !== 'python' || doc.uri.scheme !== 'file') {
      void this.panel.webview.postMessage({
        type: 'update',
        data: {
          fileLabel: 'No active Python file',
          fileStem: '',
          languagesTotal: this.index.getLanguages().length,
          baseKeys: [],
          generalKeys: [],
          lastReloadText: this.index.getLastLoadedAt()?.toLocaleString() ?? '—',
        } satisfies OverviewPayload,
      });
      return;
    }

    const fileStem = path.parse(doc.fileName).name;
    const fileLabel = path.basename(doc.fileName);
    const prefix = `${fileStem}.`;

    const allKeys = [...this.index.getAllKeys()];
    const languagesTotal = this.index.getLanguages().length;

    const makeRow = (key: string): KeyRow => {
      const translations = this.index.resolveAllLanguages(key).size;
      return {
        key,
        translations,
        hasMissingTranslations: languagesTotal > 0 ? translations < languagesTotal : false,
      };
    };

    const baseKeys = allKeys
      .filter(k => k.startsWith(prefix))
      .sort((a, b) => a.localeCompare(b))
      .map(makeRow);

    const generalKeys = allKeys
      .filter(k => k.startsWith('general.'))
      .sort((a, b) => a.localeCompare(b))
      .map(makeRow);

    void this.panel.webview.postMessage({
      type: 'update',
      data: {
        fileLabel,
        fileStem,
        languagesTotal,
        baseKeys,
        generalKeys,
        lastReloadText: this.index.getLastLoadedAt()?.toLocaleString() ?? '—',
      } satisfies OverviewPayload,
    });
  }

  private getFallbackHtml(message: string): string {
    const safe = String(message).replace(/[<>]/g, '');
    return `<!doctype html>
<html lang="en">
  <head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Language Keys Overview</title>
  </head>
  <body style="font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 12px;">
  <h3 style="margin: 0 0 6px;">Language Keys Overview</h3>
  <div style="color: var(--vscode-descriptionForeground);">${safe}</div>
  </body>
</html>`;
  }
}
