import type { LanguageIndex, ResolvedTranslation } from '../language/languageIndex';
import type { EzCordUtilsSettings } from '../language/languageIndex';
import { computeCandidateKeys } from './keyCandidates';
import type { PythonKeyContext } from './pythonContext';

export function resolveTranslationInContext(
    index: LanguageIndex,
    rawKey: string,
    settings: EzCordUtilsSettings,
    ctx: PythonKeyContext
): ResolvedTranslation | undefined {
    const candidates = computeCandidateKeys(rawKey, {
        filePrefix: ctx.filePrefix,
        functionPrefix: ctx.functionPrefix,
        classPrefix: ctx.classPrefix,
    });

    for (const candidate of candidates) {
        const resolved = index.resolve(candidate, settings);
        if (resolved) return resolved;
    }

    return undefined;
}
