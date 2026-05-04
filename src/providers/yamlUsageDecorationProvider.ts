import * as vscode from 'vscode';
import { LanguageIndex } from '../language/languageIndex';
import { PythonUsageIndex } from '../language/pythonUsageIndex';
import { isYamlDocument } from './yamlUsageCodeLensProvider';

export class YamlUsageDecorationProvider implements vscode.Disposable {
    private readonly decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

    constructor(
        private readonly languageIndex: LanguageIndex,
        private readonly usageIndex: PythonUsageIndex
    ) {}

    public dispose() {
        for (const type of this.decorationTypes.values()) {
            type.dispose();
        }
        this.decorationTypes.clear();
    }

    public refreshAll() {
        for (const editor of vscode.window.visibleTextEditors) {
            this.refresh(editor);
        }
    }

    public refresh(editor: vscode.TextEditor | undefined) {
        if (!editor) return;

        if (!isYamlDocument(editor.document)) {
            this.clear(editor);
            return;
        }

        const rangesByBadge = new Map<string, vscode.Range[]>();
        for (const loc of this.languageIndex.getLeafKeyLocationsForUri(editor.document.uri)) {
            const usages = this.usageIndex.getUsages(loc.key);

            const badge = usages.length === 0
                ? 'unused:0'
                : `used:${usages.length > 99 ? '99+' : String(usages.length)}`;
            const ranges = rangesByBadge.get(badge) ?? [];
            rangesByBadge.set(badge, ranges);

            const end = new vscode.Position(loc.position.line, loc.position.character + loc.keyText.length);
            ranges.push(new vscode.Range(loc.position, end));
        }

        for (const [label, type] of this.decorationTypes.entries()) {
            editor.setDecorations(type, rangesByBadge.get(label) ?? []);
        }

        for (const [badge, ranges] of rangesByBadge.entries()) {
            editor.setDecorations(this.getDecorationType(badge), ranges);
        }
    }

    private clear(editor: vscode.TextEditor) {
        for (const type of this.decorationTypes.values()) {
            editor.setDecorations(type, []);
        }
    }

    private getDecorationType(badge: string): vscode.TextEditorDecorationType {
        const existing = this.decorationTypes.get(badge);
        if (existing) return existing;

        const [state, label] = badge.split(':');
        const type = vscode.window.createTextEditorDecorationType({
            gutterIconPath: createBadgeIcon(label, state === 'unused' ? 'unused' : 'used'),
            gutterIconSize: 'contain',
        });
        this.decorationTypes.set(badge, type);
        return type;
    }
}

function createBadgeIcon(label: string, state: 'used' | 'unused'): vscode.Uri {
    const fontSize = label.length > 2 ? 5 : label.length > 1 ? 6 : 7;
    const fill = state === 'used' ? '#3fb950' : '#d29922';
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">',
        `<circle cx="8" cy="8" r="7" fill="${fill}"/>`,
        '<circle cx="8" cy="8" r="6" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="1"/>',
        `<text x="8" y="10.4" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>`,
        '</svg>',
    ].join('');

    return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
