import * as vscode from 'vscode';
import { LanguageIndex } from './language/languageIndex';
import { EzCordHoverProvider } from './providers/ezcordHoverProvider';
import { EzCordCompletionProvider } from './providers/ezcordCompletionProvider';
import { getEzCordUtilsSettings } from './utils/settings';

const OPEN_TRANSLATION_COMMAND = 'ezcordUtils.openTranslation';

export function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('EzCord Utils');
    const index = new LanguageIndex(output);

    const reload = async () => {
        const settings = getEzCordUtilsSettings();
        output.appendLine(`[EzCord Utils] Settings: languageFolderPath=${settings.languageFolderPath}, default=${settings.defaultLanguage}, fallback=${settings.fallbackLanguage}`);
        await index.loadAndWatch(settings);
    };

    reload().catch(e => {
        output.appendLine(`[EzCord Utils] Initial load failed: ${String(e)}`);
    });

    context.subscriptions.push(
        output,
        index,
        vscode.commands.registerCommand(
            OPEN_TRANSLATION_COMMAND,
            async (args: { language: string; key: string } | undefined) => {
                if (!args?.key) return;

                const settings = getEzCordUtilsSettings();
                const preferredLang = args.language || settings.defaultLanguage;

                const loc =
                    index.getKeyLocation(preferredLang, args.key) ??
                    index.getKeyLocation(settings.defaultLanguage, args.key) ??
                    index.getKeyLocation(settings.fallbackLanguage, args.key) ??
                    index.getAnyKeyLocation(args.key);

                if (!loc) {
                    void vscode.window.showInformationMessage(`EzCord: Could not locate key in YAML: ${args.key}`);
                    return;
                }

                const doc = await vscode.workspace.openTextDocument(loc.uri);
                const editor = await vscode.window.showTextDocument(doc, { preview: true });

                const end = new vscode.Position(loc.position.line, loc.position.character + loc.keyText.length);
                const range = new vscode.Range(loc.position, end);
                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            }
        ),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ezcordUtils')) {
                void reload();
            }
        }),
        vscode.languages.registerHoverProvider({ scheme: 'file', language: 'python' }, new EzCordHoverProvider(index)),
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'python' },
            new EzCordCompletionProvider(index),
            '.',
            '"',
            "'"
        )
    );
}

export function deactivate() {}