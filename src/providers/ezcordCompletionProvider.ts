import * as vscode from 'vscode';
import { LanguageIndex } from '../language/languageIndex';
import { getEzCordUtilsSettings } from '../utils/settings';
import { getPythonContextAtPosition, getPythonStringAtPosition } from '../utils/pythonString';
import { getFilePrefix, pushUnique } from '../utils/keyResolution';

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
        const context = getPythonContextAtPosition(document, position);

        const allKeys = [...this.index.getAllKeys()];

        const unqualifiedPrefixes: string[] = [];
        if (filePrefix) {
            pushUnique(unqualifiedPrefixes, context.functionName ? `${filePrefix}.${context.functionName}.` : undefined);
            pushUnique(unqualifiedPrefixes, context.className ? `${filePrefix}.${context.className}.` : undefined);
            pushUnique(unqualifiedPrefixes, `${filePrefix}.general.`);
            pushUnique(unqualifiedPrefixes, `${filePrefix}.`);
        }
        pushUnique(unqualifiedPrefixes, 'general.');

        const relevantKeys = wantsQualified
            ? allKeys
            : filePrefix
                ? allKeys.filter(k => unqualifiedPrefixes.some(prefix => k.startsWith(prefix)))
                : allKeys;

        const items: vscode.CompletionItem[] = [];
        const seenLabels = new Set<string>();

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
                for (const prefix of unqualifiedPrefixes) {
                    if (fullKey.startsWith(prefix)) {
                        insertText = fullKey.slice(prefix.length);
                        break;
                    }
                }

                if (typedPrefix && !insertText.startsWith(typedPrefix)) {
                    continue;
                }

                labelText = insertText;
            }

            if (seenLabels.has(labelText)) {
                continue;
            }
            seenLabels.add(labelText);

            const item = new vscode.CompletionItem(labelText, vscode.CompletionItemKind.Value);
            item.insertText = insertText;
            item.detail = translation ? `${translation}` : '⚠️ Not translated';
            item.sortText = labelText;

            items.push(item);
        }

        return items;
    }
}
