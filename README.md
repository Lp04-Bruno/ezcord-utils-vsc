# EzCord Utils (VS Code)

Productivity helpers for EzCord-style i18n in VS Code.

This extension indexes your YAML language files and provides hover tooltips, autocomplete, and fast navigation to translation keys while you work in Python.

## What you get

- **Hover translations** for i18n keys inside Python string literals.
- **Autocomplete** for keys while typing.
- **Jump to YAML**: open the correct language YAML and reveal the key.
- **Language Keys Overview** tab: for the active Python file, shows keys for `<file>.*` plus `general.*` with one-click jump.
- **Sidebar (Activity Bar)** with stats and quick actions.
- **Auto-reload** when language files change.
- **Tolerant parsing**: handles common “non-strict” YAML quirks.

## Quick start

1. Install the extension.
2. Open your EzCord project in VS Code.
3. Make sure your language files are in the configured folder (default: `bot/lang`).
4. Open any Python file and:
    - hover a key like `level.settings.xp_modal.title`, or
    - run **EzCord Utils: Open Language Keys Overview**.

## How key detection works

The extension looks at **Python string literals**.

- Full keys like `level.settings.xp_modal.title` work directly.
- Placeholders like `{general.ok}` inside longer strings are also detected.
- If you type an unqualified key without dots (e.g. `"ok"`), the extension tries these candidates in order:
   1. `<currentFileNameWithoutPy>.<key>`
   2. `general.<key>`
   3. `<key>`

## Configuration

Open Settings and search for **EzCord Utils** (or edit `settings.json`).

- `ezcordUtils.languageFolderPath` (default: `bot/lang`)
   - Relative to the workspace root (or absolute path).
   - All `*.yaml` / `*.yml` files under this folder are indexed.
- `ezcordUtils.defaultLanguage` (default: `en`)
   - Preferred language prefix (for example `en` for `en.yaml`).
- `ezcordUtils.fallbackLanguage` (default: `en`)
   - Used if the key is missing in the default language.

## Commands

You can run these via the Command Palette:

- **EzCord Utils: Open Language Keys Overview** (`ezcordUtils.openLanguageKeysOverview`)
- **EzCord Utils: Open Translation in YAML** (`ezcordUtils.openTranslation`)
- **EzCord Utils: Reload Language Files** (`ezcordUtils.reloadLanguages`)
- **EzCord Utils: Reveal Language Folder** (`ezcordUtils.revealLanguageFolder`)
- **EzCord Utils: Open Settings** (`ezcordUtils.openSettings`)
- **EzCord Utils: Show Output** (`ezcordUtils.openOutput`)

## Troubleshooting

- Open **Output** → select **EzCord Utils**.
- If nothing is indexed:
   - verify `ezcordUtils.languageFolderPath` points to the folder containing your YAML files
   - run **EzCord Utils: Reload Language Files** once
- Multi-root workspaces are supported: the extension searches all workspace folders.

## Development

Prereqs: Node.js + npm.

```bash
npm install
npm run build
```

For local development:

```bash
npm run watch
```

Then press `F5` to launch an **Extension Development Host**.