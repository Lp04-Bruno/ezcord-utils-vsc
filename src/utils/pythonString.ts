import * as vscode from 'vscode';
import { getPythonStringAtPositionAst } from './pythonAst';

export interface PythonStringAtPosition {
    quote: '"' | "'";
    value: string;
    range: vscode.Range;
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
    const ast = getPythonStringAtPositionAst(document, position);
    if (ast) {
        return { quote: '"', value: ast.value, range: ast.range };
    }

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

    if (start < 0 || !quote) return undefined;

    let end = -1;
    for (let i = start + 1; i < text.length; i++) {
        if (text[i] === quote && !isEscaped(text, i)) {
            end = i;
            break;
        }
    }

    if (end < 0) return undefined;

    if (char < start + 1 || char > end) return undefined;

    const value = text.slice(start + 1, end);
    const range = new vscode.Range(
        new vscode.Position(position.line, start + 1),
        new vscode.Position(position.line, end)
    );

    return { quote, value, range };
}

export function findLanguageKeysInString(value: string): string[] {
    const keys = new Set<string>();

    const isKeyLike = (s: string) => /^[A-Za-z0-9_.-]+$/.test(s.replace(/_/g, '-'));

    const trimmed = value.trim();
    if (trimmed && isKeyLike(trimmed)) {
        keys.add(trimmed);
    }

    const braceRe = /\{([^{}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = braceRe.exec(value)) !== null) {
        const inside = m[1].trim();
        if (!inside) continue;
        if (isKeyLike(inside)) {
            keys.add(inside);
        }
    }

    return [...keys];
}
