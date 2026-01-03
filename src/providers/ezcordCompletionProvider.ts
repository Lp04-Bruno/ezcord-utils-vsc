import * as vscode from 'vscode';
import { LanguageIndex } from '../language/languageIndex';
import { getEzCordUtilsSettings } from '../utils/settings';
import { getPythonStringAtPosition } from '../utils/pythonString';
import { getPythonKeyContextAtPosition } from '../utils/pythonContext';

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
        const ctx = getPythonKeyContextAtPosition(document, position);
        const filePrefix = ctx.filePrefix;

        const rankKey = (fullKey: string): number => {
            if (filePrefix && ctx.classPrefix && ctx.functionPrefix && fullKey.startsWith(`${filePrefix}.${ctx.classPrefix}.${ctx.functionPrefix}.`)) {
                return 0;
            }
            if (filePrefix && ctx.classPrefix && fullKey.startsWith(`${filePrefix}.${ctx.classPrefix}.`)) {
                return 1;
            }
            if (filePrefix && ctx.functionPrefix && fullKey.startsWith(`${filePrefix}.${ctx.functionPrefix}.`)) {
                return 2;
            }
            if (filePrefix && fullKey.startsWith(`${filePrefix}.general.`)) {
                return 3;
            }
            if (filePrefix && fullKey.startsWith(`${filePrefix}.`)) {
                return 4;
            }
            if (fullKey.startsWith('general.')) {
                return 5;
            }
            return 9;
        };

        const allKeys = [...this.index.getAllKeys()];

        let relevantKeys = wantsQualified
            ? allKeys
            : (() => {
                const prefixes: string[] = [];
                if (filePrefix && ctx.classPrefix && ctx.functionPrefix) {
                    prefixes.push(`${filePrefix}.${ctx.classPrefix}.${ctx.functionPrefix}.`);
                }
                if (filePrefix && ctx.classPrefix) {
                    prefixes.push(`${filePrefix}.${ctx.classPrefix}.`);
                }
                if (filePrefix && ctx.functionPrefix) {
                    prefixes.push(`${filePrefix}.${ctx.functionPrefix}.`);
                }
                if (filePrefix) {
                    prefixes.push(`${filePrefix}.`);
                    prefixes.push(`${filePrefix}.general.`);
                }
                prefixes.push('general.');

                const uniquePrefixes = [...new Set(prefixes)];
                return allKeys.filter(k => uniquePrefixes.some(p => k.startsWith(p)));
            })();

        if (!wantsQualified && relevantKeys.length === 0) {
            relevantKeys = allKeys;
        }

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
                const stripPrefixes: string[] = [];
                if (filePrefix && ctx.classPrefix && ctx.functionPrefix) {
                    stripPrefixes.push(`${filePrefix}.${ctx.classPrefix}.${ctx.functionPrefix}.`);
                }
                if (filePrefix && ctx.classPrefix) {
                    stripPrefixes.push(`${filePrefix}.${ctx.classPrefix}.`);
                }
                if (filePrefix && ctx.functionPrefix) {
                    stripPrefixes.push(`${filePrefix}.${ctx.functionPrefix}.`);
                }
                if (filePrefix) {
                    stripPrefixes.push(`${filePrefix}.`);
                }
                stripPrefixes.push('general.');

                for (const p of stripPrefixes) {
                    if (insertText.startsWith(p)) {
                        insertText = insertText.slice(p.length);
                        break;
                    }
                }

                if (typedPrefix && !insertText.startsWith(typedPrefix)) {
                    continue;
                }

                labelText = insertText;
            }

            const item = new vscode.CompletionItem(labelText, vscode.CompletionItemKind.Value);
            item.insertText = insertText;
            item.detail = translation ? `${translation}` : '⚠️ Not translated';
            const rank = rankKey(fullKey);
            item.sortText = `${String(rank).padStart(2, '0')}:${labelText}`;

            items.push(item);
        }

        return items;
    }
}
