export interface TextYamlKeyLocation {
    line: number;
    character: number;
    keyText: string;
}

export function findYamlKeyLocations(text: string): Map<string, TextYamlKeyLocation> {
    const locations = new Map<string, TextYamlKeyLocation>();
    const lines = text.split(/\r?\n/);

    const stack: Array<{ indent: number; prefix: string }> = [{ indent: -1, prefix: '' }];
    let blockScalarIndent: number | undefined;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const rawLine = lines[lineIndex];
        if (!rawLine) continue;

        const trimmedLeft = rawLine.trimStart();
        if (!trimmedLeft) continue;
        if (trimmedLeft.startsWith('#')) continue;

        const indent = rawLine.length - trimmedLeft.length;
        if (blockScalarIndent != null) {
            if (indent > blockScalarIndent) {
                continue;
            }

            blockScalarIndent = undefined;
        }

        let keyStartCol = indent;
        const content = trimmedLeft;

        if (content.startsWith('-')) {
            continue;
        }

        const match = content.match(/^([^:#]+?):\s*(.*)$/);
        if (!match) continue;

        const keyText = match[1].trim();
        if (!keyText) continue;

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        const parentPrefix = stack[stack.length - 1].prefix;
        const fullKey = parentPrefix ? `${parentPrefix}.${keyText}` : keyText;
        locations.set(fullKey, { line: lineIndex, character: keyStartCol, keyText });

        const rest = match[2] ?? '';
        const trimmedRest = rest.trim();
        if (/^[|>][+-]?\d*$/.test(trimmedRest)) {
            blockScalarIndent = indent;
        } else if (trimmedRest.length === 0) {
            stack.push({ indent, prefix: fullKey });
        }
    }

    return locations;
}
