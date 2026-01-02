import * as vscode from 'vscode';
import type { LanguageIndex } from '../language/languageIndex';
import { getEzCordUtilsSettings } from '../utils/settings';

export const EZCORD_VIEW_ID = 'ezcordUtils.view';

type NodeKind =
    | 'section'
    | 'action-open-settings'
    | 'action-reload'
    | 'action-open-output'
    | 'action-reveal-folder'
    | 'info';

interface EzCordNode {
    kind: NodeKind;
    label: string;
    description?: string;
    tooltip?: string;
    collapsibleState: vscode.TreeItemCollapsibleState;
    children?: EzCordNode[];
    command?: vscode.Command;
    iconId?: string;
}

function makeAction(
    kind: Extract<NodeKind, `action-${string}`>,
    label: string,
    command: string,
    iconId: string
): EzCordNode {
    return {
        kind,
        label,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: { command, title: label },
        iconId,
    };
}

export class EzCordUtilsViewProvider implements vscode.TreeDataProvider<EzCordNode> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<EzCordNode | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    constructor(private readonly index: LanguageIndex, private readonly output: vscode.OutputChannel) {}

    refresh(): void {
        this.onDidChangeTreeDataEmitter.fire(undefined);
    }

    getTreeItem(element: EzCordNode): vscode.TreeItem {
        const item = new vscode.TreeItem(element.label, element.collapsibleState);
        item.description = element.description;
        item.tooltip = element.tooltip;
        item.command = element.command;
        if (element.iconId) {
            item.iconPath = new vscode.ThemeIcon(element.iconId);
        }
        return item;
    }

    getChildren(element?: EzCordNode): EzCordNode[] {
        if (element?.children) return element.children;
        if (element) return [];

        const settings = getEzCordUtilsSettings();
        const stats = this.index.getDetailedStats();
        const languages = this.index.getLanguages();

        const actions: EzCordNode = {
            kind: 'section',
            label: 'Quick Actions',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            children: [
                makeAction('action-open-settings', 'Open Settings', 'ezcordUtils.openSettings', 'gear'),
                makeAction('action-reload', 'Reload Language Files', 'ezcordUtils.reloadLanguages', 'refresh'),
                makeAction('action-open-output', 'Show Output', 'ezcordUtils.openOutput', 'output'),
                makeAction('action-reveal-folder', 'Reveal Language Folder', 'ezcordUtils.revealLanguageFolder', 'folder-opened'),
            ],
        };

        const info: EzCordNode = {
            kind: 'section',
            label: 'Index Status',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
            children: [
                {
                    kind: 'info',
                    label: 'Language folder',
                    description: settings.languageFolderPath,
                    tooltip: settings.languageFolderPath,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'file-directory',
                },
                {
                    kind: 'info',
                    label: 'Default language',
                    description: settings.defaultLanguage,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'globe',
                },
                {
                    kind: 'info',
                    label: 'Fallback language',
                    description: settings.fallbackLanguage,
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'globe',
                },
                {
                    kind: 'info',
                    label: 'YAML files scanned',
                    description: String(stats.files),
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'files',
                },
                {
                    kind: 'info',
                    label: 'Languages detected',
                    description: String(stats.languages),
                    tooltip: languages.length ? languages.join(', ') : 'No languages loaded yet.',
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'list-unordered',
                },
                {
                    kind: 'info',
                    label: 'Unique keys',
                    description: String(stats.uniqueKeys),
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'symbol-key',
                },
                {
                    kind: 'info',
                    label: 'Total entries',
                    description: String(stats.totalEntries),
                    tooltip: 'Sum of key/value entries across all languages.',
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'database',
                },
                {
                    kind: 'info',
                    label: 'Parsed (strict / fallback / failed)',
                    description: `${stats.parsedStrict} / ${stats.parsedFallback} / ${stats.parsedFailed}`,
                    tooltip: 'Strict YAML parser used where possible; fallback handles non-strict files.',
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'checklist',
                },
                {
                    kind: 'info',
                    label: 'Output channel',
                    description: 'EzCord Utils',
                    collapsibleState: vscode.TreeItemCollapsibleState.None,
                    iconId: 'output',
                    command: { command: 'ezcordUtils.openOutput', title: 'Show Output' },
                },
            ],
        };

        return [actions, info];
    }
}
