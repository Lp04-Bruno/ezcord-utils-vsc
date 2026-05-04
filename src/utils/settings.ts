import * as vscode from 'vscode';
import { EzCordUtilsSettings } from '../language/languageIndex';

export type YamlUsageNavigationMode = 'off' | 'inline' | 'hover';

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

export function getYamlUsageNavigationMode(): YamlUsageNavigationMode {
    const value = vscode.workspace
        .getConfiguration('ezcordUtils')
        .get<string>('yamlUsageNavigation', 'off');

    if (value === 'inline' || value === 'hover') {
        return value;
    }

    return 'off';
}

export function getEzCordUtilsSettings(): EzCordUtilsSettings {
    const cfg = vscode.workspace.getConfiguration('ezcordUtils');

    return {
        languageFolderPath: normalizePathSetting(cfg.get<string>('languageFolderPath', 'bot/lang')),
        defaultLanguage: normalizeSettingString(cfg.get<string>('defaultLanguage', 'en')),
        fallbackLanguage: normalizeSettingString(cfg.get<string>('fallbackLanguage', 'en')),
    };
}
