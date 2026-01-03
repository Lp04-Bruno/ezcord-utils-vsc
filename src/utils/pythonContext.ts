import * as vscode from 'vscode';
import * as path from 'path';
import { getPythonScopeContextAtPosition } from './pythonAst';

export type PythonKeyContext = {
    filePrefix?: string;
    functionPrefix?: string;
    classPrefix?: string;
};

export function getPythonFileStem(fileName: string): string {
    return path.parse(fileName).name;
}

export function getPythonFilePrefixFromDocument(document: vscode.TextDocument): string | undefined {
    if (document.languageId !== 'python') return undefined;
    const fileName = document.fileName.split(/[/\\]/).pop() ?? '';
    if (!fileName.toLowerCase().endsWith('.py')) return undefined;
    return fileName.replace(/\.py$/i, '') || undefined;
}

export function getPythonKeyContextAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): PythonKeyContext {
    const filePrefix = getPythonFilePrefixFromDocument(document);
    const scope = getPythonScopeContextAtPosition(document, position);

    return {
        filePrefix,
        functionPrefix: scope.functionName,
        classPrefix: scope.className,
    };
}
