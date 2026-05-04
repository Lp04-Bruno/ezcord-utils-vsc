import * as vscode from 'vscode';
import { LanguageIndex } from '../language/languageIndex';
import { LanguageKeyUsage, PythonUsageIndex } from '../language/pythonUsageIndex';
import { getYamlUsageNavigationMode } from '../utils/settings';
import { isYamlDocument } from './yamlUsageCodeLensProvider';

const OPEN_KEY_USAGE_COMMAND = 'ezcordUtils.openKeyUsage';

function escapeMarkdownText(text: string): string {
    return text.replace(/[\\`*_{}\[\]()#+!|>]/g, '\\$&');
}

function escapeInlineCode(text: string): string {
    return text.replace(/`/g, '\\`').replace(/\r?\n/g, ' ');
}

function commandLink(command: string, args: unknown): string {
    const encoded = encodeURIComponent(JSON.stringify([args]));
    return `command:${command}?${encoded}`;
}

function usageLabel(usage: LanguageKeyUsage): string {
    const relativePath = vscode.workspace.asRelativePath(usage.uri, false);
    return `${relativePath}:${usage.range.start.line + 1}`;
}

function findKeyAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position,
    languageIndex: LanguageIndex
): string | undefined {
    for (const loc of languageIndex.getLeafKeyLocationsForUri(document.uri)) {
        if (loc.position.line !== position.line) continue;

        const end = loc.position.character + loc.keyText.length;
        if (position.character >= loc.position.character && position.character <= end) {
            return loc.key;
        }
    }

    return undefined;
}

export class YamlUsageHoverProvider implements vscode.HoverProvider {
    constructor(
        private readonly languageIndex: LanguageIndex,
        private readonly usageIndex: PythonUsageIndex
    ) {}

    public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Hover> {
        if (!isYamlDocument(document) || getYamlUsageNavigationMode() !== 'hover') {
            return null;
        }

        const key = findKeyAtPosition(document, position, this.languageIndex);
        if (!key) return null;

        const usages = this.usageIndex.getUsages(key);
        if (usages.length === 0) return null;

        const md = new vscode.MarkdownString('', true);
        md.appendMarkdown(`$(references) **EzCord Code Usages** _(${usages.length})_\n\n`);
        md.appendMarkdown(`$(symbol-key) \`${escapeInlineCode(key)}\`\n\n`);

        if (usages.length === 1) {
            const link = commandLink(OPEN_KEY_USAGE_COMMAND, { key, index: 0 });
            md.appendMarkdown(`$(go-to-file) [Open usage](${link})\n\n`);
            md.appendMarkdown(`- [${escapeMarkdownText(usageLabel(usages[0]))}](${link})  \n  ${escapeMarkdownText(usages[0].lineText)}\n`);
        } else {
            const pickerLink = commandLink(OPEN_KEY_USAGE_COMMAND, { key });
            md.appendMarkdown(`$(list-selection) [Select usage](${pickerLink})\n\n`);

            for (const [idx, usage] of usages.slice(0, 8).entries()) {
                const link = commandLink(OPEN_KEY_USAGE_COMMAND, { key, index: idx });
                md.appendMarkdown(`- [${escapeMarkdownText(usageLabel(usage))}](${link})`);
                if (usage.rawKey !== key) {
                    md.appendMarkdown(` \`${escapeInlineCode(usage.rawKey)}\``);
                }
                md.appendMarkdown(`  \n  ${escapeMarkdownText(usage.lineText)}\n`);
            }

            if (usages.length > 8) {
                md.appendMarkdown(`\n_${escapeMarkdownText(`...and ${usages.length - 8} more`)}_\n`);
            }
        }

        md.isTrusted = { enabledCommands: [OPEN_KEY_USAGE_COMMAND] };

        const range = document.getWordRangeAtPosition(position, /[A-Za-z0-9_.-]+/);
        return new vscode.Hover(md, range);
    }
}
