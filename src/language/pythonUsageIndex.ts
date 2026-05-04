import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageIndex } from './languageIndex';
import { computeCandidateKeys, getFilePrefix } from '../utils/keyResolution';
import { findLanguageKeyMatchesInString } from '../utils/pythonString';

export interface LanguageKeyUsage {
    key: string;
    rawKey: string;
    uri: vscode.Uri;
    range: vscode.Range;
    lineText: string;
    functionName?: string;
    className?: string;
}

interface PythonScope {
    indent: number;
    kind: 'class' | 'def';
    name: string;
}

interface PythonStringLiteral {
    value: string;
    start: number;
    end: number;
}

function isEscaped(text: string, index: number): boolean {
    let backslashes = 0;
    for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
        backslashes++;
    }
    return backslashes % 2 === 1;
}

function findStringLiteralsInLine(line: string): PythonStringLiteral[] {
    const literals: PythonStringLiteral[] = [];

    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if ((c !== '"' && c !== "'") || isEscaped(line, i)) continue;

        const prefixStart = Math.max(0, i - 2);
        const maybePrefix = line.slice(prefixStart, i).toLowerCase();
        if (maybePrefix.includes('f') && i > 0 && /[a-z]/i.test(line[i - 1])) {
            // f-strings can contain Python expressions in braces; only plain strings are scanned.
        }

        const triple = line.slice(i, i + 3) === c.repeat(3);
        const delimiterLength = triple ? 3 : 1;
        const delimiter = c.repeat(delimiterLength);
        const contentStart = i + delimiterLength;
        let searchFrom = contentStart;
        let end = -1;

        while (searchFrom < line.length) {
            const next = line.indexOf(delimiter, searchFrom);
            if (next < 0) break;
            if (!isEscaped(line, next)) {
                end = next;
                break;
            }
            searchFrom = next + delimiterLength;
        }

        if (end < 0) break;

        literals.push({
            value: line.slice(contentStart, end),
            start: contentStart,
            end,
        });
        i = end + delimiterLength - 1;
    }

    return literals;
}

function updateScopes(line: string, scopes: PythonScope[]) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const indent = line.length - line.trimStart().length;
    while (scopes.length > 0 && indent <= scopes[scopes.length - 1].indent) {
        scopes.pop();
    }

    if (trimmed.startsWith('@')) return;

    const classMatch = trimmed.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (classMatch) {
        scopes.push({ indent, kind: 'class', name: classMatch[1] });
        return;
    }

    const defMatch = trimmed.match(/^(?:async\s+def|def)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
    if (defMatch) {
        scopes.push({ indent, kind: 'def', name: defMatch[1] });
    }
}

function currentScope(scopes: PythonScope[]): { functionName?: string; className?: string } {
    const reversed = [...scopes].reverse();
    return {
        functionName: reversed.find(scope => scope.kind === 'def')?.name,
        className: reversed.find(scope => scope.kind === 'class')?.name,
    };
}

export class PythonUsageIndex implements vscode.Disposable {
    private usagesByKey = new Map<string, LanguageKeyUsage[]>();
    private watcher: vscode.FileSystemWatcher | undefined;
    private rebuildTimer: NodeJS.Timeout | undefined;
    private readonly onDidUpdateEmitter = new vscode.EventEmitter<void>();
    public readonly onDidUpdate = this.onDidUpdateEmitter.event;

    constructor(
        private readonly languageIndex: LanguageIndex,
        private readonly output: vscode.OutputChannel
    ) {
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.py');
        this.watcher.onDidCreate(() => this.scheduleRebuild());
        this.watcher.onDidChange(() => this.scheduleRebuild());
        this.watcher.onDidDelete(() => this.scheduleRebuild());
    }

    public dispose() {
        this.watcher?.dispose();
        if (this.rebuildTimer) {
            clearTimeout(this.rebuildTimer);
        }
        this.onDidUpdateEmitter.dispose();
    }

    public getUsages(key: string): LanguageKeyUsage[] {
        return this.usagesByKey.get(key) ?? [];
    }

    public hasUsages(key: string): boolean {
        return this.getUsages(key).length > 0;
    }

    public scheduleRebuild() {
        if (this.rebuildTimer) {
            clearTimeout(this.rebuildTimer);
        }

        this.rebuildTimer = setTimeout(() => {
            void this.rebuild();
        }, 250);
    }

    public async rebuild(): Promise<void> {
        const allKeys = this.languageIndex.getAllKeys();
        const next = new Map<string, LanguageKeyUsage[]>();

        if (allKeys.size === 0) {
            this.usagesByKey = next;
            this.onDidUpdateEmitter.fire();
            return;
        }

        const files = await vscode.workspace.findFiles('**/*.py', '**/{node_modules,.venv,venv,__pycache__,out,dist}/**');

        for (const file of files) {
            try {
                const raw = await vscode.workspace.fs.readFile(file);
                this.scanPythonText(file, Buffer.from(raw).toString('utf8'), allKeys, next);
            } catch (e) {
                this.output.appendLine(`[EzCord Utils] Failed to scan Python usages in ${file.fsPath}: ${String(e)}`);
            }
        }

        this.usagesByKey = next;
        this.onDidUpdateEmitter.fire();
    }

    private scanPythonText(
        uri: vscode.Uri,
        text: string,
        allKeys: Set<string>,
        out: Map<string, LanguageKeyUsage[]>
    ) {
        const filePrefix = getFilePrefix(path.basename(uri.fsPath));
        const scopes: PythonScope[] = [];
        const lines = text.replace(/\r\n?/g, '\n').split('\n');

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            updateScopes(line, scopes);
            const scope = currentScope(scopes);

            for (const literal of findStringLiteralsInLine(line)) {
                for (const match of findLanguageKeyMatchesInString(literal.value)) {
                    const resolvedKey = computeCandidateKeys(match.key, {
                        filePrefix,
                        functionName: scope.functionName,
                        className: scope.className,
                    }).find(candidate => allKeys.has(candidate));

                    if (!resolvedKey) continue;

                    const start = new vscode.Position(lineIndex, literal.start + match.start);
                    const end = new vscode.Position(lineIndex, literal.start + match.end);
                    const usages = out.get(resolvedKey) ?? [];
                    usages.push({
                        key: resolvedKey,
                        rawKey: match.key,
                        uri,
                        range: new vscode.Range(start, end),
                        lineText: line.trim(),
                        functionName: scope.functionName,
                        className: scope.className,
                    });
                    out.set(resolvedKey, usages);
                }
            }
        }
    }
}
