# EzCord Utils (VS Code)

VS Code extension for EzCord projects: hover + autocomplete for i18n keys loaded from your YAML language files.

It reads your `bot/lang/*.yaml` (or whatever folder you configure), flattens nested YAML into dot-notation keys, and provides:

## Features

- Hover translations inside Python string literals.
- Autocomplete for keys (filtered by file prefix + `general.*`).
- Jump to definition: “Open in YAML” from the hover opens the correct `*.yaml` and reveals the key.
- Watches language files and reloads automatically.
- Works with EzCord language YAMLs even if they contain non-strict YAML quirks.

## How it works

- Hover/Completion triggers in **Python** files.
- Any **Python string literal** that looks like a key (e.g. `level.settings.xp_modal.title`) or contains `{key}` placeholders is detected.
- If you type unqualified keys (no `.`), the extension tries candidates in this order:
   1) `<currentFileNameWithoutPy>.<key>`
   2) `general.<key>`
   3) `<key>`

## Settings

Open Settings → search for “EzCord Utils” (or edit `settings.json`).

- `ezcordUtils.languageFolderPath` (default: `bot/lang`)
   - Relative to workspace root(s) or absolute path.
- `ezcordUtils.defaultLanguage` (default: `en`)
   - The language file prefix, e.g. `en` for `en.yaml`.
- `ezcordUtils.fallbackLanguage` (default: `en`)
   - Used if a key doesn’t exist in the default language.

## Development

Prereqs: Node.js + npm.

Install deps:
```bash
npm install
```

Build:
```bash
npm run build
```

Watch (recommended while developing):
```bash
npm run watch
```

Run / Debug:
- Press `F5` → opens an “Extension Development Host” window.
- In that window, open your EzCord project and hover Python keys.

## Troubleshooting

- Check the Output panel: “EzCord Utils”.
- If no keys load, verify `ezcordUtils.languageFolderPath` points to the folder that contains `*.yaml` files.
- Multi-root workspace: the extension searches all workspace folders for the configured language folder.