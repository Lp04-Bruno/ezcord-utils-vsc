import * as vscode from 'vscode';
import { LanguageIndex } from '../language/languageIndex';
import { PythonUsageIndex } from '../language/pythonUsageIndex';
import { getYamlUsageNavigationMode } from '../utils/settings';

const OPEN_KEY_USAGE_COMMAND = 'ezcordUtils.openKeyUsage';

function isCodeLensEnabled(): boolean {
    return getYamlUsageNavigationMode() === 'inline';
}

export class YamlUsageCodeLensProvider implements vscode.CodeLensProvider {
    private readonly onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

    constructor(
        private readonly languageIndex: LanguageIndex,
        private readonly usageIndex: PythonUsageIndex
    ) {
        this.languageIndex.onDidUpdate(() => this.onDidChangeCodeLensesEmitter.fire());
        this.usageIndex.onDidUpdate(() => this.onDidChangeCodeLensesEmitter.fire());
    }

    public provideCodeLenses(document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
        if (!isYamlDocument(document) || !isCodeLensEnabled()) {
            return [];
        }

        return this.languageIndex.getLeafKeyLocationsForUri(document.uri)
            .map(loc => {
                const usages = this.usageIndex.getUsages(loc.key);
                if (usages.length === 0) return undefined;

                const range = new vscode.Range(loc.position, loc.position);
                const title = usages.length === 1 ? 'Go to 1 usage' : `Go to ${usages.length} usages`;
                return new vscode.CodeLens(range, {
                    title,
                    command: OPEN_KEY_USAGE_COMMAND,
                    arguments: [{ key: loc.key }],
                });
            })
            .filter((lens): lens is vscode.CodeLens => !!lens);
    }
}

export function isYamlDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'yaml' || /\.(ya?ml)$/i.test(document.fileName);
}
