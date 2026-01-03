export function computeCandidateKeys(
    rawKey: string,
    opts: { filePrefix?: string; functionPrefix?: string; classPrefix?: string }
): string[] {
    const key = rawKey.trim();
    if (!key) return [];

    const filePrefix = opts.filePrefix;
    const functionPrefix = opts.functionPrefix;
    const classPrefix = opts.classPrefix;

    const normalized = key.includes('_') ? key.replace(/_/g, '-') : key;
    const variants = normalized !== key ? [key, normalized] : [key];

    const candidates: string[] = [];
    const seen = new Set<string>();

    const add = (k: string) => {
        if (!k) return;
        if (seen.has(k)) return;
        seen.add(k);
        candidates.push(k);
    };

    for (const v of variants) {
        if (v.includes('.')) {
            add(v);
            continue;
        }

        if (filePrefix && classPrefix && functionPrefix) {
            add(`${filePrefix}.${classPrefix}.${functionPrefix}.${v}`);
        }
        if (filePrefix && classPrefix) {
            add(`${filePrefix}.${classPrefix}.${v}`);
        }
        if (filePrefix && functionPrefix) {
            add(`${filePrefix}.${functionPrefix}.${v}`);
        }
        if (filePrefix) {
            add(`${filePrefix}.${v}`);
            add(`${filePrefix}.general.${v}`);
        }
        add(`general.${v}`);
        add(v);
    }

    return candidates;
}
