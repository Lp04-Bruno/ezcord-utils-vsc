export function parseYamlToFlatMap(text: string): Map<string, string> {
    const out = new Map<string, string>();

    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const stack: Array<{ indent: number; prefix: string }> = [{ indent: -1, prefix: '' }];

    const countIndent = (line: string) => {
        let i = 0;
        while (i < line.length && line[i] === ' ') i++;
        return i;
    };

    const stripInlineComment = (s: string) => {
        const idx = s.search(/\s#/);
        return idx >= 0 ? s.slice(0, idx).trimEnd() : s.trimEnd();
    };

    const stripKeyQuotes = (k: string) => {
        const key = k.trim();
        const m = key.match(/^(['"])(.*)\1$/);
        return (m ? m[2] : key).trim();
    };

    const unescapeDoubleQuoted = (v: string) => {
        return v
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\u\{?([0-9a-fA-F]{4,6})\}?/g, (_, hex) => {
                const codePoint = parseInt(hex, 16);
                if (!Number.isFinite(codePoint)) return _;
                try {
                    return String.fromCodePoint(codePoint);
                } catch {
                    return _;
                }
            });
    };

    const parseQuotedMultiline = (
        startLineIndex: number,
        startValue: string,
        quote: '"' | "'"
    ): { value: string; endLineIndex: number } => {
        let valuePart = startValue.slice(1);
        let i = startLineIndex;

        const isEscaped = (s: string, idx: number) => {
            let bs = 0;
            for (let j = idx - 1; j >= 0 && s[j] === '\\'; j--) bs++;
            return bs % 2 === 1;
        };

        while (true) {
            const endIdx = quote === '"'
                ? (() => {
                    for (let j = 0; j < valuePart.length; j++) {
                        if (valuePart[j] === '"' && !isEscaped(valuePart, j)) return j;
                    }
                    return -1;
                })()
                : valuePart.indexOf("'");

            if (endIdx >= 0) {
                const inner = valuePart.slice(0, endIdx);
                const raw = inner;
                const cooked = quote === '"' ? unescapeDoubleQuoted(raw) : raw.replace(/''/g, "'");

                return { value: cooked, endLineIndex: i };
            }

            i++;
            if (i >= lines.length) {
                return { value: quote === '"' ? unescapeDoubleQuoted(valuePart) : valuePart.replace(/''/g, "'"), endLineIndex: lines.length - 1 };
            }

            valuePart += '\n' + lines[i];
        }
    };

    const parseBlockScalar = (startLineIndex: number, baseIndent: number): { value: string; endLineIndex: number } => {
        let i = startLineIndex + 1;
        const collected: string[] = [];

        while (i < lines.length) {
            const line = lines[i];
            if (!line.trim()) {
                collected.push('');
                i++;
                continue;
            }

            const indent = countIndent(line);
            if (indent <= baseIndent) break;

            collected.push(line.slice(baseIndent + 1));
            i++;
        }

        return { value: collected.join('\n').replace(/\n+$/g, ''), endLineIndex: i - 1 };
    };

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine.trim()) continue;
        if (rawLine.trimStart().startsWith('#')) continue;

        const indent = countIndent(rawLine);

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        const line = rawLine.trimEnd();

        const m = line.match(/^\s*([^:]+):\s*(.*)$/);
        if (!m) continue;

        const key = stripKeyQuotes(m[1]);
        const restRaw = m[2] ?? '';

        const parentPrefix = stack[stack.length - 1].prefix;
        const fullKey = parentPrefix ? `${parentPrefix}.${key}` : key;

        if (!restRaw) {
            stack.push({ indent, prefix: fullKey });
            continue;
        }

        const rest = restRaw.trimEnd();

        if (rest === '|' || rest === '>') {
            const block = parseBlockScalar(i, indent);
            out.set(fullKey, block.value);
            i = block.endLineIndex;
            continue;
        }

        if (rest.startsWith('"')) {
            const q = parseQuotedMultiline(i, rest, '"');
            out.set(fullKey, q.value);
            i = q.endLineIndex;
            continue;
        }

        if (rest.startsWith("'")) {
            const q = parseQuotedMultiline(i, rest, "'");
            out.set(fullKey, q.value);
            i = q.endLineIndex;
            continue;
        }

        out.set(fullKey, stripInlineComment(rest).trim());
    }

    return out;
}
