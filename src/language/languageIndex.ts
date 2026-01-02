import * as vscode from 'vscode';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { parseYamlToFlatMap } from './simpleYaml';

export type LanguageCode = string;

export interface YamlKeyLocation {
    uri: vscode.Uri;
    position: vscode.Position;
    keyText: string;
}

export interface ResolvedTranslation {
    key: string;
    value: string;
    language: LanguageCode;
    fromDefaultLanguage: boolean;
}

export interface EzCordUtilsSettings {
    languageFolderPath: string;
    defaultLanguage: string;
    fallbackLanguage: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenYaml(value: unknown, prefix: string, out: Map<string, string>) {
    if (isRecord(value)) {
        for (const [k, v] of Object.entries(value)) {
            const nextPrefix = prefix ? `${prefix}.${k}` : k;
            flattenYaml(v, nextPrefix, out);
        }
        return;
    }

    if (Array.isArray(value)) {
        out.set(prefix, value.map(v => String(v)).join(', '));
        return;
    }

    if (prefix) {
        out.set(prefix, value == null ? '' : String(value));
    }
}

function getWorkspaceRoot(): vscode.Uri | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return undefined;
    }

    return folders[0].uri;
}

async function resolveLanguageFolderUri(languageFolderPath: string): Promise<vscode.Uri | undefined> {
    if (!languageFolderPath) {
        return undefined;
    }

    if (path.isAbsolute(languageFolderPath)) {
        return vscode.Uri.file(languageFolderPath);
    }

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return undefined;
    }

    for (const folder of folders) {
        const candidate = vscode.Uri.joinPath(folder.uri, languageFolderPath);
        try {
            const stat = await vscode.workspace.fs.stat(candidate);
            if (stat.type & vscode.FileType.Directory) {
                return candidate;
            }
        } catch {
        }
    }

    const root = getWorkspaceRoot();
    return root ? vscode.Uri.joinPath(root, languageFolderPath) : undefined;
}

function languageFromFilename(filename: string): LanguageCode {
    return filename.replace(/\.(ya?ml)$/i, '');
}

function findYamlKeyLocations(text: string): Map<string, { position: vscode.Position; keyText: string }> {
    const locations = new Map<string, { position: vscode.Position; keyText: string }>();
    const lines = text.split(/\r?\n/);

    const stack: Array<{ indent: number; prefix: string }> = [{ indent: -1, prefix: '' }];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const rawLine = lines[lineIndex];
        if (!rawLine) continue;

        const trimmedLeft = rawLine.trimStart();
        if (!trimmedLeft) continue;
        if (trimmedLeft.startsWith('#')) continue;

        const indent = rawLine.length - trimmedLeft.length;

        let keyStartCol = indent;
        let content = trimmedLeft;

        if (content.startsWith('-')) {
            const afterDash = content.slice(1);
            const afterDashTrim = afterDash.trimStart();
            if (afterDashTrim.length === afterDash.length) continue;
            const dashSpaces = afterDash.length - afterDashTrim.length;
            keyStartCol = indent + 1 + dashSpaces;
            content = afterDashTrim;
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
        locations.set(fullKey, { position: new vscode.Position(lineIndex, keyStartCol), keyText });

        const rest = match[2] ?? '';
        if (rest.trim().length === 0) {
            stack.push({ indent, prefix: fullKey });
        }
    }

    return locations;
}

export class LanguageIndex {
    private byLanguage = new Map<LanguageCode, Map<string, string>>();
    private locationsByLanguage = new Map<LanguageCode, Map<string, YamlKeyLocation>>();
    private watcher: vscode.FileSystemWatcher | undefined;
    private lastLoadedFileCount = 0;
    private lastLoadedKeyCount = 0;
    private lastLoadedEntryCount = 0;
    private lastLoadedLanguageCount = 0;
    private lastParsedStrictCount = 0;
    private lastParsedFallbackCount = 0;
    private lastParsedFailedCount = 0;
    private lastLanguageFolderUri: vscode.Uri | undefined;
    private lastSettings: EzCordUtilsSettings | undefined;

    private readonly onDidUpdateEmitter = new vscode.EventEmitter<void>();
    public readonly onDidUpdate = this.onDidUpdateEmitter.event;

    constructor(private readonly output: vscode.OutputChannel) {}

    public dispose() {
        this.watcher?.dispose();
        this.onDidUpdateEmitter.dispose();
    }

    public getAllKeys(): Set<string> {
        const keys = new Set<string>();
        for (const map of this.byLanguage.values()) {
            for (const k of map.keys()) {
                keys.add(k);
            }
        }
        return keys;
    }

    public getLanguages(): LanguageCode[] {
        return [...this.byLanguage.keys()].sort((a, b) => a.localeCompare(b));
    }

    public getLastLanguageFolderUri(): vscode.Uri | undefined {
        return this.lastLanguageFolderUri;
    }

    public getStats(): { files: number; keys: number } {
        return { files: this.lastLoadedFileCount, keys: this.lastLoadedKeyCount };
    }

    public getDetailedStats(): {
        files: number;
        languages: number;
        uniqueKeys: number;
        totalEntries: number;
        parsedStrict: number;
        parsedFallback: number;
        parsedFailed: number;
    } {
        return {
            files: this.lastLoadedFileCount,
            languages: this.lastLoadedLanguageCount,
            uniqueKeys: this.lastLoadedKeyCount,
            totalEntries: this.lastLoadedEntryCount,
            parsedStrict: this.lastParsedStrictCount,
            parsedFallback: this.lastParsedFallbackCount,
            parsedFailed: this.lastParsedFailedCount,
        };
    }

    public getKeyLocation(language: LanguageCode, key: string): YamlKeyLocation | undefined {
        return this.locationsByLanguage.get(language)?.get(key);
    }

    public getAnyKeyLocation(key: string): YamlKeyLocation | undefined {
        for (const map of this.locationsByLanguage.values()) {
            const loc = map.get(key);
            if (loc) return loc;
        }
        return undefined;
    }

    public resolve(key: string, settings: EzCordUtilsSettings): ResolvedTranslation | undefined {
        const defaultMap = this.byLanguage.get(settings.defaultLanguage);
        const fallbackMap = this.byLanguage.get(settings.fallbackLanguage);

        const fromDefault = defaultMap?.get(key);
        if (fromDefault != null) {
            return {
                key,
                value: fromDefault,
                language: settings.defaultLanguage,
                fromDefaultLanguage: true,
            };
        }

        const fromFallback = fallbackMap?.get(key);
        if (fromFallback != null) {
            return {
                key,
                value: fromFallback,
                language: settings.fallbackLanguage,
                fromDefaultLanguage: false,
            };
        }

        for (const [lang, map] of this.byLanguage.entries()) {
            const anyValue = map.get(key);
            if (anyValue != null) {
                return {
                    key,
                    value: anyValue,
                    language: lang,
                    fromDefaultLanguage: false,
                };
            }
        }

        return undefined;
    }

    public resolveAllLanguages(key: string): Map<LanguageCode, string> {
        const results = new Map<LanguageCode, string>();
        for (const [lang, map] of this.byLanguage.entries()) {
            const value = map.get(key);
            if (value != null) {
                results.set(lang, value);
            }
        }
        return results;
    }

    public async loadAndWatch(settings: EzCordUtilsSettings): Promise<void> {
        this.lastSettings = settings;
        const folderUri = await resolveLanguageFolderUri(settings.languageFolderPath);
        if (!folderUri) {
            this.output.appendLine('[EzCord Utils] No workspace folder or language folder path configured.');
            return;
        }

        this.lastLanguageFolderUri = folderUri;

        await this.loadOnce(folderUri, settings);
        this.setupWatcher(folderUri);
    }

    private setupWatcher(folderUri: vscode.Uri) {
        this.watcher?.dispose();

        const pattern = new vscode.RelativePattern(folderUri, '**/*.{yml,yaml}');
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        const reload = async () => {
            try {
                await this.loadOnce(folderUri, this.lastSettings);
            } catch (e) {
                this.output.appendLine(`[EzCord Utils] Reload failed: ${String(e)}`);
            }
        };

        this.watcher.onDidCreate(reload);
        this.watcher.onDidChange(reload);
        this.watcher.onDidDelete(reload);
    }

    private guessLanguageForFile(
        folderUri: vscode.Uri,
        file: vscode.Uri,
        infoByBase: Map<string, Set<string>>,
        settings: EzCordUtilsSettings | undefined
    ): { language: string; isTagged: boolean } {
        const fallback = settings?.fallbackLanguage;
        const def = settings?.defaultLanguage;

        const stem = path.basename(file.fsPath).replace(/\.(ya?ml)$/i, '');
        const direct = stem.match(/^[a-z]{2,5}$/i);
        if (direct) {
            return { language: stem.toLowerCase(), isTagged: true };
        }

        const suffixMatch = stem.match(/^(.*?)[_-]([a-z]{2,5})$/i);
        if (suffixMatch) {
            const base = suffixMatch[1].toLowerCase();
            const lang = suffixMatch[2].toLowerCase();
            const langsForBase = infoByBase.get(base);
            const hasMultiple = !!langsForBase && langsForBase.size >= 2;
            const isPreferred = (def && lang === def.toLowerCase()) || (fallback && lang === fallback.toLowerCase());
            if (hasMultiple || isPreferred) {
                return { language: lang, isTagged: true };
            }
        }

        const rel = path
            .relative(folderUri.fsPath, file.fsPath)
            .replace(/\\/g, '/');
        const parts = rel.split('/').filter(Boolean);
        if (parts.length >= 2) {
            const maybeLang = parts[parts.length - 2];
            if (/^[a-z]{2,5}$/i.test(maybeLang)) {
                return { language: maybeLang.toLowerCase(), isTagged: true };
            }
        }

        return { language: (def ?? 'en').toLowerCase(), isTagged: false };
    }

    private async loadOnce(folderUri: vscode.Uri, settings: EzCordUtilsSettings | undefined): Promise<void> {
        const pattern = new vscode.RelativePattern(folderUri, '**/*.{yml,yaml}');
        const files = await vscode.workspace.findFiles(pattern);

        const nextByLanguage = new Map<LanguageCode, Map<string, string>>();
        const nextLocationsByLanguage = new Map<LanguageCode, Map<string, YamlKeyLocation>>();

        const infoByBase = new Map<string, Set<string>>();
        for (const file of files) {
            const stem = path.basename(file.fsPath).replace(/\.(ya?ml)$/i, '');
            const m = stem.match(/^(.*?)[_-]([a-z]{2,5})$/i);
            if (!m) continue;
            const base = m[1].toLowerCase();
            const lang = m[2].toLowerCase();
            const set = infoByBase.get(base) ?? new Set<string>();
            set.add(lang);
            infoByBase.set(base, set);
        }

        let parsedStrict = 0;
        let parsedFallback = 0;
        let parsedFailed = 0;

        for (const file of files) {
            try {
                const raw = await vscode.workspace.fs.readFile(file);
                const text = Buffer.from(raw).toString('utf8');
                const { language: lang } = this.guessLanguageForFile(folderUri, file, infoByBase, settings);

                const keyLocations = findYamlKeyLocations(text);
                const existingLocations = nextLocationsByLanguage.get(lang) ?? new Map<string, YamlKeyLocation>();
                for (const [fullKey, loc] of keyLocations.entries()) {
                    existingLocations.set(fullKey, { uri: file, position: loc.position, keyText: loc.keyText });
                }
                nextLocationsByLanguage.set(lang, existingLocations);

                let flat = new Map<string, string>();
                try {
                    const parsed = parseYaml(text) as unknown;
                    flattenYaml(parsed, '', flat);
                    parsedStrict++;
                } catch (e) {
                    flat = parseYamlToFlatMap(text);
                    parsedFallback++;
                    this.output.appendLine(`[EzCord Utils] Parsed with fallback YAML parser: ${file.fsPath}`);
                }

                if (flat.size === 0) {
                    parsedFailed++;
                }

                const existing = nextByLanguage.get(lang) ?? new Map<string, string>();
                for (const [k, v] of flat.entries()) {
                    existing.set(k, v);
                }
                nextByLanguage.set(lang, existing);
            } catch (e) {
                this.output.appendLine(`[EzCord Utils] Failed to parse ${file.fsPath}: ${String(e)}`);
                parsedFailed++;
            }
        }

        this.byLanguage = nextByLanguage;
        this.locationsByLanguage = nextLocationsByLanguage;
        this.lastLoadedFileCount = files.length;
        this.lastLoadedLanguageCount = this.byLanguage.size;
        this.lastLoadedKeyCount = this.getAllKeys().size;
        this.lastLoadedEntryCount = [...this.byLanguage.values()].reduce((acc, m) => acc + m.size, 0);

        this.lastParsedStrictCount = parsedStrict;
        this.lastParsedFallbackCount = parsedFallback;
        this.lastParsedFailedCount = parsedFailed;

        if (files.length === 0) {
            this.output.appendLine(
                `[EzCord Utils] No YAML files found under: ${folderUri.fsPath} (pattern: **/*.{yml,yaml}). Check ezcordUtils.languageFolderPath.`
            );
            return;
        }

        this.output.appendLine(`[EzCord Utils] Loaded ${this.lastLoadedFileCount} YAML files; ${this.lastLoadedKeyCount} keys.`);
        this.onDidUpdateEmitter.fire();
    }
}
