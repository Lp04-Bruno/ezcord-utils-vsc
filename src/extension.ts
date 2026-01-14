import * as vscode from 'vscode';
import { LanguageIndex } from './language/languageIndex';
import { EzCordHoverProvider } from './providers/ezcordHoverProvider';
import { EzCordCompletionProvider } from './providers/ezcordCompletionProvider';
import { getEzCordUtilsSettings } from './utils/settings';
import { EZCORD_VIEW_ID, EzCordUtilsViewProvider } from './views/ezcordUtilsView';
import { LanguageKeysOverviewPanel } from './views/languageKeysOverviewPanel';
import { TodoTreeViewProvider } from './views/todoTreeViewProvider';
import { TodoItem } from './providers/todoProvider';

const OPEN_TRANSLATION_COMMAND = 'ezcordUtils.openTranslation';
const OPEN_SETTINGS_COMMAND = 'ezcordUtils.openSettings';
const RELOAD_LANGUAGES_COMMAND = 'ezcordUtils.reloadLanguages';
const OPEN_OUTPUT_COMMAND = 'ezcordUtils.openOutput';
const REVEAL_LANGUAGE_FOLDER_COMMAND = 'ezcordUtils.revealLanguageFolder';
const OPEN_LANGUAGE_KEYS_OVERVIEW_COMMAND = 'ezcordUtils.openLanguageKeysOverview';
const OPEN_TODO_COMMAND = 'ezcordUtils.openTodo';
const REFRESH_TODOS_COMMAND = 'ezcordUtils.refreshTodos';

export function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('EzCord Utils');
    const index = new LanguageIndex(output);
    const todoProvider = new TodoTreeViewProvider();

    const viewProvider = new EzCordUtilsViewProvider(index, output);
    const view = vscode.window.createTreeView(EZCORD_VIEW_ID, { treeDataProvider: viewProvider, showCollapseAll: false });
    const todoView = vscode.window.createTreeView('ezcordUtils.todoView', { treeDataProvider: todoProvider });

    context.subscriptions.push(index.onDidUpdate(() => viewProvider.refresh()));

    const reload = async () => {
        const settings = getEzCordUtilsSettings();
        output.appendLine(`[EzCord Utils] Settings: languageFolderPath=${settings.languageFolderPath}, default=${settings.defaultLanguage}, fallback=${settings.fallbackLanguage}`);
        await index.loadAndWatch(settings);
        viewProvider.refresh();
        await todoProvider.scan();
    };

    context.subscriptions.push(
        output,
        index,
        view,
        todoView,
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
        vscode.commands.registerCommand(OPEN_SETTINGS_COMMAND, async () => {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'ezcordUtils');
        }),
        vscode.commands.registerCommand(RELOAD_LANGUAGES_COMMAND, async () => {
            try {
                await reload();
            } catch (e) {
                output.appendLine(`[EzCord Utils] Reload failed: ${String(e)}`);
            }
        }),
        vscode.commands.registerCommand(OPEN_OUTPUT_COMMAND, () => {
            output.show(true);
        }),
        vscode.commands.registerCommand(REVEAL_LANGUAGE_FOLDER_COMMAND, async () => {
            const folderUri = index.getLastLanguageFolderUri();
            if (!folderUri) {
                void vscode.window.showInformationMessage('EzCord Utils: Language folder is not resolved yet. Run reload once.');
                return;
            }
            await vscode.commands.executeCommand('revealFileInOS', folderUri);
        }),
        vscode.commands.registerCommand(OPEN_LANGUAGE_KEYS_OVERVIEW_COMMAND, () => {
            LanguageKeysOverviewPanel.openNew(context.extensionUri, index, output);
        }),
        vscode.commands.registerCommand(OPEN_TODO_COMMAND, async (todoItem: TodoItem) => {
            const doc = await vscode.workspace.openTextDocument(todoItem.fullPath);
            const editor = await vscode.window.showTextDocument(doc);

            const position = new vscode.Position(todoItem.line - 1, todoItem.column);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }),
        vscode.commands.registerCommand(REFRESH_TODOS_COMMAND, async () => {
            await todoProvider.scan();
        }),
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

    reload().catch(e => {
        output.appendLine(`[EzCord Utils] Initial load failed: ${String(e)}`);
        viewProvider.refresh();
    });
}

export function deactivate() {}