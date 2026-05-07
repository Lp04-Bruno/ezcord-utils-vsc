# EzCord Utils for VS Code

[![Marketplace](https://img.shields.io/badge/Marketplace-EzCord%20Utils-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=Lp04-Bruno.ezcord-utils-vsc)
[![Version](https://img.shields.io/badge/version-0.1.3-5865F2.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.100%2B-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-F7DF1E?logo=typescript&logoColor=1f2937)](https://www.typescriptlang.org/)

EzCord Utils makes EzCord localization work feel native in VS Code. It indexes your YAML language files, understands common EzCord key lookup patterns and connects Python usage sites with their translations in both directions.

Instead of manually searching through language files, you can hover a key, jump to the translation, see missing/unused keys and navigate back from YAML to the Python code that uses it.

## Highlights

| Feature | What it does |
| --- | --- |
| Translation hover | Hover EzCord keys in Python strings and see resolved translations from your configured languages. |
| Autocomplete | Complete language keys directly inside Python string literals. |
| Jump to YAML | Open the matching YAML file and reveal the translation key. |
| Reverse usage badges | YAML leaf keys show gutter badges: orange `0` for unused keys, green counts for used keys. |
| Reverse navigation | From YAML keys, jump back to Python usages via hover popup or inline CodeLens. |
| EzCord-aware resolving | Resolves full keys and context keys using file, method/function, class, file-local `general` and global `general`. |
| Overview panel | Browse language keys for the active Python file plus shared `general` keys. |

## Requirements

- VS Code `1.100.0` or newer
- An EzCord project using YAML language files
- Language files reachable from the configured language folder by default `bot/lang`

## Quick Start

1. Install **EzCord Utils**.
2. Open your EzCord bot project in VS Code.
3. Check the language folder setting:

```json
{
  "ezcordUtils.languageFolderPath": "bot/lang",
  "ezcordUtils.defaultLanguage": "en",
  "ezcordUtils.fallbackLanguage": "de",
  "ezcordUtils.yamlUsageNavigation": "hover"
}
```

4. Run **EzCord Utils: Reload Language Files** once.
5. Open a Python file and hover an EzCord language key.
6. Open a YAML language file and look at the gutter badges next to leaf keys.

## Python Workflow

Hover works on complete keys:

```python
await ctx.respond("base.notification.reminder.daily_footer")
```

It also resolves shorter context keys when EzCord would search relative to the current file, method, class or `general` section:

```python
await ctx.respond("daily_footer")
```

Placeholders inside longer strings are detected too:

```python
await ctx.respond("Status: {general.enabled}")
```

Hover cards show the resolved key, the selected language, available translations and a link to open the YAML location.

## YAML Workflow

In YAML files, EzCord Utils marks leaf translation keys:

```yaml
base:
  notification:
    reminder:
      daily_footer:
        - Manage your notifications with {notification_cmd}
        - Cookies are delicious
```

The badge is placed on `daily_footer`, not inside the list content.

- Orange `0`: no Python usage found
- Green `1`, `2`, `3`, ...: number of Python usages
- Green `99+`: many usages

Reverse navigation is controlled by `ezcordUtils.yamlUsageNavigation`:

| Value | Behavior |
| --- | --- |
| `off` | Show only gutter badges. |
| `hover` | Show a hover popup on used YAML keys with links back to Python usages. This is the default. |
| `inline` | Show clickable CodeLens actions above used YAML keys. |

When multiple usages exist, EzCord Utils opens a searchable picker so you can choose the exact location.

## Key Resolution

For a raw key like `"daily_footer"`, EzCord Utils tries candidates in a practical EzCord-like order:

1. `<currentFileNameWithoutPy>.<currentFunctionOrMethod>.<key>`
2. `<currentFileNameWithoutPy>.<currentClass>.<key>`
3. `<currentFileNameWithoutPy>.general.<key>`
4. `<currentFileNameWithoutPy>.<key>`
5. `general.<key>`
6. `<key>`

Full keys like `"base.notification.reminder.daily_footer"` are resolved directly.

## Configuration

Open Settings and search for **EzCord Utils** or edit `settings.json`.

| Setting | Default | Description |
| --- | --- | --- |
| `ezcordUtils.languageFolderPath` | `bot/lang` | Folder containing YAML language files. Relative to the workspace root or absolute. |
| `ezcordUtils.defaultLanguage` | `en` | Preferred language filename prefix, for example `en` for `en.yaml`. |
| `ezcordUtils.fallbackLanguage` | `en` | Fallback language prefix if a key is missing in the default language. |
| `ezcordUtils.yamlUsageNavigation` | `hover` | Reverse navigation style for YAML keys: `off`, `hover`, or `inline`. |

## Commands

| Command | ID |
| --- | --- |
| Open Language Keys Overview | `ezcordUtils.openLanguageKeysOverview` |
| Open Translation in YAML | `ezcordUtils.openTranslation` |
| Reload Language Files | `ezcordUtils.reloadLanguages` |
| Reveal Language Folder | `ezcordUtils.revealLanguageFolder` |
| Open Settings | `ezcordUtils.openSettings` |
| Show Output | `ezcordUtils.openOutput` |

## Troubleshooting

### No hover or autocomplete appears

- Run **EzCord Utils: Reload Language Files**.
- Check **Output** -> **EzCord Utils**.
- Verify `ezcordUtils.languageFolderPath` points to the folder containing your YAML files.
- Make sure the current file is recognized as Python.

### YAML badges look outdated

- Save changed Python/YAML files.
- Run **EzCord Utils: Reload Language Files**.
- Reload the Extension Development Host when testing local builds.

### A language appears that you did not configure

EzCord Utils only displays configured default/fallback language translations in hover output. If a file is detected as an unconfigured language, it is skipped and noted in the **EzCord Utils** output channel.

## Development

Prerequisites:

- Node.js `18` or newer
- npm
- VS Code `1.100.0` or newer

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run typecheck
npm test
npm audit
npm run build
```

Start local development:

```bash
npm run watch
```

Then press `F5` in VS Code to launch an **Extension Development Host**.

## Packaging

Build and create a local VSIX:

```bash
npm run build
npx @vscode/vsce package
```

Install the generated VSIX locally:

```bash
code --install-extension ezcord-utils-vsc-0.1.3.vsix
```

## License

MIT. See [LICENSE](LICENSE).
