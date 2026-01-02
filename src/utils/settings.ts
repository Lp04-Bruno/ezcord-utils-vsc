import * as vscode from 'vscode';
import { EzCordUtilsSettings } from '../language/languageIndex';

function normalizeSettingString(value: string): string {
    let v = value.trim();
    const m = v.match(/^(['"])(.*)\1$/);
    if (m) {
        v = m[2];
    }

    return v.trim();
}

function normalizePathSetting(value: string): string {
    const v = normalizeSettingString(value);
    return v.replace(/\\/g, '/');
}

export function getEzCordUtilsSettings(): EzCordUtilsSettings {
    const cfg = vscode.workspace.getConfiguration('ezcordUtils');

    return {
        languageFolderPath: normalizePathSetting(cfg.get<string>('languageFolderPath', 'bot/lang')),
        defaultLanguage: normalizeSettingString(cfg.get<string>('defaultLanguage', 'en')),
        fallbackLanguage: normalizeSettingString(cfg.get<string>('fallbackLanguage', 'en')),
    };
}
