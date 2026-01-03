import * as vscode from 'vscode';
import { parser as pythonParser } from '@lezer/python';
import type { SyntaxNode, Tree } from '@lezer/common';

export type PythonScopeContext = {
    className?: string;
    functionName?: string;
};

export type PythonStringAtPosition = {
    value: string;
    range: vscode.Range;
};

type CachedParse = {
    version: number;
    tree: Tree;
    textLength: number;
};

const parseCache = new WeakMap<vscode.TextDocument, CachedParse>();

function getTree(document: vscode.TextDocument): Tree {
    const cached = parseCache.get(document);
    if (cached && cached.version === document.version && cached.textLength === document.getText().length) {
        return cached.tree;
    }

    const text = document.getText();
    const tree = pythonParser.parse(text);
    parseCache.set(document, { version: document.version, tree, textLength: text.length });
    return tree;
}

function isPythonStringLiteralText(text: string): { prefixLen: number; quote: string } | undefined {
    const m = /^([furbFURB]*)("""|'''|"|')/.exec(text);
    if (!m) return undefined;
    const quote = m[2];
    return { prefixLen: m[1].length, quote };
}

function unquotePythonStringLiteral(raw: string): { value: string; contentStart: number; contentEnd: number } | undefined {
    const startInfo = isPythonStringLiteralText(raw);
    if (!startInfo) return undefined;

    const opener = raw.slice(startInfo.prefixLen, startInfo.prefixLen + startInfo.quote.length);
    const closer = opener;

    if (!raw.endsWith(closer)) return undefined;

    const contentStart = startInfo.prefixLen + opener.length;
    const contentEnd = raw.length - closer.length;

    if (contentEnd < contentStart) return undefined;
    const value = raw.slice(contentStart, contentEnd);

    return { value, contentStart, contentEnd };
}

function resolveNodeAtOffset(tree: Tree, offset: number): SyntaxNode {
    return tree.resolve(offset, -1);
}

function looksLikeStringNodeText(text: string): boolean {
    const info = isPythonStringLiteralText(text);
    if (!info) return false;
    const opener = text.slice(info.prefixLen, info.prefixLen + info.quote.length);
    return text.endsWith(opener);
}

function findEnclosingStringNode(tree: Tree, text: string, offset: number): SyntaxNode | undefined {
    let node: SyntaxNode | null = resolveNodeAtOffset(tree, offset);
    while (node) {
        const raw = text.slice(node.from, node.to);
        if (looksLikeStringNodeText(raw)) return node;
        node = node.parent;
    }
    return undefined;
}

function extractFirstIdentifier(node: SyntaxNode, text: string): string | undefined {
    const cursor = node.cursor();
    if (!cursor.firstChild()) return undefined;

    do {
        const name = cursor.type.name;
        if (name === 'VariableName' || name === 'Identifier') {
            return text.slice(cursor.from, cursor.to);
        }
    } while (cursor.nextSibling());

    return undefined;
}

export function getPythonScopeContextAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): PythonScopeContext {
    try {
        const tree = getTree(document);
        const text = document.getText();
        const offset = document.offsetAt(position);

        let node: SyntaxNode | null = resolveNodeAtOffset(tree, offset);
        let functionName: string | undefined;
        let className: string | undefined;

        while (node) {
            const typeName = node.type.name;
            if (!functionName && typeName === 'FunctionDefinition') {
                functionName = extractFirstIdentifier(node, text);
            }
            if (!className && typeName === 'ClassDefinition') {
                className = extractFirstIdentifier(node, text);
            }
            if (functionName && className) break;
            node = node.parent;
        }

        return { functionName, className };
    } catch {
        return {};
    }
}

export function getPythonStringAtPositionAst(
    document: vscode.TextDocument,
    position: vscode.Position
): PythonStringAtPosition | undefined {
    try {
        const tree = getTree(document);
        const text = document.getText();
        const offset = document.offsetAt(position);

        const stringNode = findEnclosingStringNode(tree, text, offset);
        if (!stringNode) return undefined;

        const raw = text.slice(stringNode.from, stringNode.to);
        const unquoted = unquotePythonStringLiteral(raw);
        if (!unquoted) return undefined;

        const contentStartAbs = stringNode.from + unquoted.contentStart;
        const contentEndAbs = stringNode.from + unquoted.contentEnd;

        if (offset < contentStartAbs || offset > contentEndAbs) return undefined;

        const range = new vscode.Range(document.positionAt(contentStartAbs), document.positionAt(contentEndAbs));
        return { value: unquoted.value, range };
    } catch {
        return undefined;
    }
}
