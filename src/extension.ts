import * as vscode from 'vscode';
import { LanguageIndex } from './language/languageIndex';
import { EzCordHoverProvider } from './providers/ezcordHoverProvider';
import { EzCordCompletionProvider } from './providers/ezcordCompletionProvider';
import { YamlUsageCodeLensProvider } from './providers/yamlUsageCodeLensProvider';
import { YamlUsageDecorationProvider } from './providers/yamlUsageDecorationProvider';
import { YamlUsageHoverProvider } from './providers/yamlUsageHoverProvider';
import { LanguageKeyUsage, PythonUsageIndex } from './language/pythonUsageIndex';
import { getEzCordUtilsSettings } from './utils/settings';
import { EZCORD_VIEW_ID, EzCordUtilsViewProvider } from './views/ezcordUtilsView';
import { LanguageKeysOverviewPanel } from './views/languageKeysOverviewPanel';

const OPEN_TRANSLATION_COMMAND = 'ezcordUtils.openTranslation';
const OPEN_SETTINGS_COMMAND = 'ezcordUtils.openSettings';
const RELOAD_LANGUAGES_COMMAND = 'ezcordUtils.reloadLanguages';
const OPEN_OUTPUT_COMMAND = 'ezcordUtils.openOutput';
const REVEAL_LANGUAGE_FOLDER_COMMAND = 'ezcordUtils.revealLanguageFolder';
const OPEN_LANGUAGE_KEYS_OVERVIEW_COMMAND = 'ezcordUtils.openLanguageKeysOverview';
const OPEN_KEY_USAGE_COMMAND = 'ezcordUtils.openKeyUsage';

async function openUsage(usage: LanguageKeyUsage) {
    const doc = await vscode.workspace.openTextDocument(usage.uri);
    const editor = await vscode.window.showTextDocument(doc, { preview: true });
    editor.selection = new vscode.Selection(usage.range.start, usage.range.end);
    editor.revealRange(usage.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

function usageLabel(usage: LanguageKeyUsage): string {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(usage.uri);
    const relativePath = workspaceFolder
        ? vscode.workspace.asRelativePath(usage.uri, false)
        : usage.uri.fsPath;
    const line = usage.range.start.line + 1;
    const scope = [usage.className, usage.functionName].filter(Boolean).join('.');
    return `${relativePath}:${line}${scope ? ` (${scope})` : ''}`;
}

export function activate(context: vscode.ExtensionContext) {
    const output = vscode.window.createOutputChannel('EzCord Utils');
    const index = new LanguageIndex(output);
    const usageIndex = new PythonUsageIndex(index, output);
    const usageDecorationProvider = new YamlUsageDecorationProvider(index, usageIndex);

    const viewProvider = new EzCordUtilsViewProvider(index, output);
    const view = vscode.window.createTreeView(EZCORD_VIEW_ID, { treeDataProvider: viewProvider, showCollapseAll: false });

    context.subscriptions.push(
        index.onDidUpdate(() => {
            viewProvider.refresh();
            usageIndex.scheduleRebuild();
            usageDecorationProvider.refreshAll();
        }),
        usageIndex.onDidUpdate(() => usageDecorationProvider.refreshAll())
    );

    const reload = async () => {
        const settings = getEzCordUtilsSettings();
        output.appendLine(`[EzCord Utils] Settings: languageFolderPath=${settings.languageFolderPath}, default=${settings.defaultLanguage}, fallback=${settings.fallbackLanguage}`);
        await index.loadAndWatch(settings);
        await usageIndex.rebuild();
        viewProvider.refresh();
        usageDecorationProvider.refreshAll();
    };

    context.subscriptions.push(
        output,
        index,
        usageIndex,
        usageDecorationProvider,
        view,
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
        vscode.commands.registerCommand(OPEN_KEY_USAGE_COMMAND, async (args: { key: string; index?: number } | undefined) => {
            if (!args?.key) return;

            const usages = usageIndex.getUsages(args.key);
            if (usages.length === 0) {
                void vscode.window.showInformationMessage(`EzCord: No Python usage found for ${args.key}`);
                return;
            }

            if (args.index != null && usages[args.index]) {
                await openUsage(usages[args.index]);
                return;
            }

            if (usages.length === 1) {
                await openUsage(usages[0]);
                return;
            }

            const picked = await vscode.window.showQuickPick(
                usages.map(usage => ({
                    label: usageLabel(usage),
                    description: usage.rawKey === args.key ? undefined : usage.rawKey,
                    detail: usage.lineText,
                    usage,
                })),
                {
                    title: `Select usage for ${args.key}`,
                    placeHolder: `${usages.length} usages found`,
                    matchOnDescription: true,
                    matchOnDetail: true,
                }
            );

            if (picked) {
                await openUsage(picked.usage);
            }
        }),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ezcordUtils')) {
                usageDecorationProvider.refreshAll();
                void reload();
            }
        }),
        vscode.window.onDidChangeVisibleTextEditors(() => usageDecorationProvider.refreshAll()),
        vscode.window.onDidChangeActiveTextEditor(editor => usageDecorationProvider.refresh(editor)),
        vscode.workspace.onDidChangeTextDocument(e => {
            const editor = vscode.window.visibleTextEditors.find(visible => visible.document === e.document);
            usageDecorationProvider.refresh(editor);
        }),
        vscode.languages.registerHoverProvider({ scheme: 'file', language: 'python' }, new EzCordHoverProvider(index)),
        vscode.languages.registerHoverProvider(
            [
                { scheme: 'file', language: 'yaml' },
                { scheme: 'file', pattern: '**/*.{yml,yaml}' },
            ],
            new YamlUsageHoverProvider(index, usageIndex)
        ),
        vscode.languages.registerCodeLensProvider(
            [
                { scheme: 'file', language: 'yaml' },
                { scheme: 'file', pattern: '**/*.{yml,yaml}' },
            ],
            new YamlUsageCodeLensProvider(index, usageIndex)
        ),
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
