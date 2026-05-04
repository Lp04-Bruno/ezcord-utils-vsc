export interface PythonKeyContext {
    filePrefix?: string;
    functionName?: string;
    className?: string;
}

export function getFilePrefix(filename: string): string | undefined {
    if (!filename.endsWith('.py')) return undefined;
    return filename.replace(/\.py$/i, '') || undefined;
}

export function pushUnique(items: string[], value: string | undefined) {
    if (!value || items.includes(value)) return;
    items.push(value);
}

export function computeCandidateKeys(rawKey: string, context: PythonKeyContext): string[] {
    const key = rawKey.trim();
    if (!key) return [];

    const candidates: string[] = [];
    if (context.filePrefix) {
        pushUnique(candidates, context.functionName ? `${context.filePrefix}.${context.functionName}.${key}` : undefined);
        pushUnique(candidates, context.className ? `${context.filePrefix}.${context.className}.${key}` : undefined);
        pushUnique(candidates, `${context.filePrefix}.general.${key}`);
        pushUnique(candidates, `${context.filePrefix}.${key}`);
    }
    pushUnique(candidates, `general.${key}`);
    pushUnique(candidates, key);
    return candidates;
}
