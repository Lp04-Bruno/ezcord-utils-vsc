import * as vscode from 'vscode';
import { LanguageIndex, ResolvedTranslation } from '../language/languageIndex';
import { getEzCordUtilsSettings } from '../utils/settings';
import { findLanguageKeysInString, getPythonStringAtPosition } from '../utils/pythonString';
import { computeCandidateKeys } from '../utils/keyCandidates';

const OPEN_TRANSLATION_COMMAND = 'ezcordUtils.openTranslation';

function getFilePrefix(filename: string): string | undefined {
    if (!filename.endsWith('.py')) return undefined;
    return filename.replace(/\.py$/i, '') || undefined;
}

function getEnclosingFunctionName(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    const maxLinesUp = 250;
    const startLine = position.line;
    const startIndent = document.lineAt(startLine).firstNonWhitespaceCharacterIndex;

    for (let line = startLine; line >= 0 && startLine - line <= maxLinesUp; line--) {
        const text = document.lineAt(line).text;
        if (!text.trim()) continue;

        const indent = document.lineAt(line).firstNonWhitespaceCharacterIndex;
        if (indent > startIndent) continue;

        const m = /^\s*(?:async\s+def|def)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(text);
        if (m) return m[1];
    }

    return undefined;
}

function getEnclosingClassName(document: vscode.TextDocument, position: vscode.Position): string | undefined {
    const maxLinesUp = 400;
    const startLine = position.line;
    const startIndent = document.lineAt(startLine).firstNonWhitespaceCharacterIndex;

    for (let line = startLine; line >= 0 && startLine - line <= maxLinesUp; line--) {
        const text = document.lineAt(line).text;
        if (!text.trim()) continue;

        const indent = document.lineAt(line).firstNonWhitespaceCharacterIndex;
        if (indent > startIndent) continue;

        const m = /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*[(:]/.exec(text);
        if (m) return m[1];
    }

    return undefined;
}

function escapeInlineCode(text: string): string {
    return text.replace(/`/g, '\\`').replace(/\r?\n/g, ' ');
}

function escapeMarkdownText(text: string): string {
    return text.replace(/[\\`*_{}\[\]()#+!|>]/g, '\\$&');
}

function truncate(text: string, max = 140): string {
    const t = text.replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function commandLink(command: string, args: unknown): string {
    const encoded = encodeURIComponent(JSON.stringify([args]));
    return `command:${command}?${encoded}`;
}

function appendTranslationSection(
    md: vscode.MarkdownString,
    displayKey: string,
    resolved: ResolvedTranslation,
    all: Map<string, string>
): void {
    const resolvedKey = resolved.key;
    const defaultOrFallback = resolved.fromDefaultLanguage ? 'default' : 'fallback';

    md.appendMarkdown(`$(symbol-key) **${escapeMarkdownText(displayKey)}**  \n`);
    if (displayKey !== resolvedKey) {
        md.appendMarkdown(`$(arrow-right) Resolved: \`${escapeInlineCode(resolvedKey)}\`  \n`);
    }
    md.appendMarkdown(`$(globe) **${escapeMarkdownText(resolved.language)}** _(${defaultOrFallback})_  \n`);

    const link = commandLink(OPEN_TRANSLATION_COMMAND, { language: resolved.language, key: resolvedKey });
    md.appendMarkdown(`$(go-to-file) [Open in YAML](${link})\n\n`);

    md.appendCodeblock(resolved.value ?? '', 'text');

    const entries = [...all.entries()]
        .filter(([lang]) => lang !== resolved.language)
        .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) return;

    md.appendMarkdown(`\n\n$(multi-select) **Also available**\n`);
    for (const [lang, value] of entries.slice(0, 6)) {
        md.appendMarkdown(`- \`${escapeInlineCode(lang)}\` ${escapeMarkdownText(truncate(value, 140))}\n`);
    }
    if (entries.length > 6) {
        md.appendMarkdown(`\n_${escapeMarkdownText(`…and ${entries.length - 6} more`)}_\n`);
    }
}

function buildHoverMarkdown(
    items: Array<{ key: string; resolved: ResolvedTranslation }>,
    index: LanguageIndex
): vscode.MarkdownString {
    const md = new vscode.MarkdownString('', true);

    const count = Math.min(items.length, 6);
    md.appendMarkdown(`$(comment-discussion) **EzCord Translations**`);
    if (items.length > 1) {
        md.appendMarkdown(` _(${count}${items.length > 6 ? '+' : ''})_`);
    }
    md.appendMarkdown('\n\n');

    const slice = items.slice(0, 6);
    slice.forEach((it, idx) => {
        const all = index.resolveAllLanguages(it.resolved.key);
        appendTranslationSection(md, it.key, it.resolved, all);
        if (idx !== slice.length - 1) {
            md.appendMarkdown('\n\n---\n\n');
        }
    });

    if (items.length > 6) {
        md.appendMarkdown('\n\n_…more keys in this string._');
    }

    md.isTrusted = { enabledCommands: [OPEN_TRANSLATION_COMMAND] };
    return md;
}

export class EzCordHoverProvider implements vscode.HoverProvider {
    constructor(private readonly index: LanguageIndex) {}

    private warnedNoKeys = false;

    provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
        if (document.languageId !== 'python') {
            return null;
        }

        const stats = this.index.getStats();
        if (stats.keys === 0 && !this.warnedNoKeys) {
            this.warnedNoKeys = true;
            console.warn('[EzCord Utils] No language keys loaded. Check ezcordUtils.languageFolderPath.');
        }

        const settings = getEzCordUtilsSettings();
        const pyStr = getPythonStringAtPosition(document, position);
        if (!pyStr) return null;

        const keysInString = findLanguageKeysInString(pyStr.value);
        if (keysInString.length === 0) return null;

        const filePrefix = getFilePrefix(document.fileName.split(/[/\\]/).pop() ?? '');
        const functionPrefix = getEnclosingFunctionName(document, position);
        const classPrefix = getEnclosingClassName(document, position);

        const resolvedItems: Array<{ key: string; resolved: ResolvedTranslation }> = [];
        for (const rawKey of keysInString) {
            const candidates = computeCandidateKeys(rawKey, { filePrefix, functionPrefix, classPrefix });
            for (const candidate of candidates) {
                const resolved = this.index.resolve(candidate, settings);
                if (!resolved) continue;
                resolvedItems.push({ key: rawKey, resolved });
                break;
            }
        }

        if (resolvedItems.length === 0) return null;

        const md = buildHoverMarkdown(resolvedItems, this.index);
        return new vscode.Hover(md, pyStr.range);
    }
}
