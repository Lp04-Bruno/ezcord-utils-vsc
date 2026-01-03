import * as vscode from 'vscode';
import { LanguageIndex } from '../language/languageIndex';
import { getEzCordUtilsSettings } from '../utils/settings';
import { getPythonStringAtPosition } from '../utils/pythonString';

function getFilePrefix(filename: string): string | undefined {
    if (!filename.endsWith('.py')) return undefined;
    return filename.replace(/\.py$/i, '') || undefined;
}

export class EzCordCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private readonly index: LanguageIndex) { }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (document.languageId !== 'python') {
            return [];
        }

        const pyStr = getPythonStringAtPosition(document, position);
        if (!pyStr) return [];

        const offset = position.character - pyStr.range.start.character;
        const typedPrefix = pyStr.value.slice(0, Math.max(0, offset));
        if (!/^[A-Za-z0-9_.-]*$/.test(typedPrefix.replace(/_/g, '-'))) {
            return [];
        }
        const wantsQualified = typedPrefix.includes('.');

        const settings = getEzCordUtilsSettings();
        const filePrefix = getFilePrefix(document.fileName.split(/[/\\]/).pop() ?? '');

        const allKeys = [...this.index.getAllKeys()];

        const relevantKeys = wantsQualified
            ? allKeys
            : filePrefix
                ? allKeys.filter(k => k.startsWith(`${filePrefix}.`) || k.startsWith('general.'))
                : allKeys;

        const items: vscode.CompletionItem[] = [];

        for (const fullKey of relevantKeys) {
            const resolved = this.index.resolve(fullKey, settings);
            const translation = resolved?.value;

            let insertText: string;
            let labelText: string;

            if (wantsQualified) {
                if (!typedPrefix || !fullKey.startsWith(typedPrefix)) {
                    continue;
                }

                insertText = fullKey.slice(typedPrefix.length);
                if (!insertText) {
                    continue;
                }
                labelText = fullKey;
            } else {
                insertText = fullKey;
                if (filePrefix && fullKey.startsWith(`${filePrefix}.`)) {
                    insertText = fullKey.slice(filePrefix.length + 1);
                }

                if (typedPrefix && !insertText.startsWith(typedPrefix)) {
                    continue;
                }

                labelText = insertText;
            }

            const item = new vscode.CompletionItem(labelText, vscode.CompletionItemKind.Value);
            item.insertText = insertText;
            item.detail = translation ? `${translation}` : '⚠️ Not translated';
            item.sortText = labelText;

            items.push(item);
        }

        return items;
    }
}
