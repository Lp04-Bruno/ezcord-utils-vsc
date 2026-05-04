import * as vscode from 'vscode';

export interface PythonStringAtPosition {
    quote: '"' | "'";
    value: string;
    range: vscode.Range;
}

export interface PythonContextAtPosition {
    functionName?: string;
    className?: string;
}

export interface LanguageKeyMatch {
    key: string;
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

export function getPythonStringAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): PythonStringAtPosition | undefined {
    const line = document.lineAt(position.line);
    const text = line.text;

    const char = position.character;
    if (char < 0 || char > text.length) return undefined;

    let start = -1;
    let quote: '"' | "'" | undefined;

    for (let i = Math.min(char - 1, text.length - 1); i >= 0; i--) {
        const c = text[i];
        if ((c === '"' || c === "'") && !isEscaped(text, i)) {
            start = i;
            quote = c as '"' | "'";
            break;
        }
    }

    if (start < 0 || !quote) {
        return getTripleQuotedPythonStringAtPosition(document, position);
    }

    let end = -1;
    for (let i = start + 1; i < text.length; i++) {
        if (text[i] === quote && !isEscaped(text, i)) {
            end = i;
            break;
        }
    }

    if (end < 0) {
        return getTripleQuotedPythonStringAtPosition(document, position);
    }

    if (char < start + 1 || char > end) return undefined;

    const value = text.slice(start + 1, end);
    const range = new vscode.Range(
        new vscode.Position(position.line, start + 1),
        new vscode.Position(position.line, end)
    );

    return { quote, value, range };
}

function getTripleQuotedPythonStringAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): PythonStringAtPosition | undefined {
    const text = document.getText();
    const offset = document.offsetAt(position);

    for (const quote of ['"', "'"] as const) {
        const delimiter = quote.repeat(3);
        let searchFrom = 0;

        while (true) {
            const start = text.indexOf(delimiter, searchFrom);
            if (start < 0 || start > offset) break;

            searchFrom = start + delimiter.length;
            if (isEscaped(text, start)) {
                continue;
            }

            const contentStart = start + delimiter.length;
            let endSearchFrom = contentStart;
            let end = -1;

            while (true) {
                const candidate = text.indexOf(delimiter, endSearchFrom);
                if (candidate < 0) break;
                endSearchFrom = candidate + delimiter.length;
                if (!isEscaped(text, candidate)) {
                    end = candidate;
                    break;
                }
            }

            if (end < 0) break;
            if (offset >= contentStart && offset <= end) {
                const value = text.slice(contentStart, end);
                return {
                    quote,
                    value,
                    range: new vscode.Range(document.positionAt(contentStart), document.positionAt(end)),
                };
            }

            searchFrom = end + delimiter.length;
        }
    }

    return undefined;
}

export function getPythonContextAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): PythonContextAtPosition {
    const stack: Array<{ indent: number; kind: 'class' | 'def'; name: string }> = [];

    const popClosedBlocks = (indent: number) => {
        while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }
    };

    for (let lineIndex = 0; lineIndex <= position.line; lineIndex++) {
        const text = document.lineAt(lineIndex).text;
        const trimmed = text.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const indent = text.length - text.trimStart().length;
        popClosedBlocks(indent);

        if (trimmed.startsWith('@')) continue;

        const classMatch = trimmed.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
        if (classMatch) {
            stack.push({ indent, kind: 'class', name: classMatch[1] });
            continue;
        }

        const defMatch = trimmed.match(/^(?:async\s+def|def)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
        if (defMatch) {
            stack.push({ indent, kind: 'def', name: defMatch[1] });
        }
    }

    const className = [...stack].reverse().find(item => item.kind === 'class')?.name;
    const functionName = [...stack].reverse().find(item => item.kind === 'def')?.name;

    return { className, functionName };
}

export function findLanguageKeysInString(value: string): string[] {
    return [...new Set(findLanguageKeyMatchesInString(value).map(match => match.key))];
}

export function findLanguageKeyMatchesInString(value: string): LanguageKeyMatch[] {
    const keys = new Set<string>();
    const matches: LanguageKeyMatch[] = [];

    const isKeyLike = (s: string) => /^[A-Za-z0-9_.-]+$/.test(s.replace(/_/g, '-'));

    const trimmed = value.trim();
    if (trimmed && isKeyLike(trimmed)) {
        const start = value.length - value.trimStart().length;
        if (!keys.has(trimmed)) {
            keys.add(trimmed);
            matches.push({ key: trimmed, start, end: start + trimmed.length });
        }
    }

    const braceRe = /\{([^{}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = braceRe.exec(value)) !== null) {
        const rawInside = m[1];
        const inside = rawInside.trim();
        if (!inside) continue;
        if (isKeyLike(inside)) {
            const leadingWhitespace = rawInside.length - rawInside.trimStart().length;
            const start = m.index + 1 + leadingWhitespace;
            matches.push({ key: inside, start, end: start + inside.length });
        }
    }

    return matches;
}
