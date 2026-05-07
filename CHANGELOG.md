# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning.

## [0.1.3] - 2026-05-06

### Added
- Add YAML gutter usage badges for leaf translation keys including orange `0` badges for unused keys and green counts for used keys.
- Add reverse navigation from YAML keys back to Python usages via configurable inline CodeLens or hover popup.
- Show a usage picker when a language key has multiple Python references.

### Changed
- Raise the minimum supported VS Code version to `1.100.0`.
- Only show YAML usage markers on leaf translation keys, not on parent groups such as `guild` or `channel`.
- Replace the boolean usage CodeLens setting with `ezcordUtils.yamlUsageNavigation` (`off`, `inline`, `hover`) defaulting to `off`.

### Fixed
- Keep YAML usage badges on the actual key line for block-scalar and list values, and ignore key-like text inside multiline translation content.

## [0.1.2] - 2026-05-04

### Changed
- Improve EzCord i18n key resolution to consider the current Python file, function/method, class, file-local `general`, global `general` and absolute keys.
- Improve autocomplete suggestions for unqualified keys by preferring the current EzCord lookup context.
- Support Discord locale-style language files such as `en-US.yaml` and `de-DE.yaml` more consistently.

### Fixed
- Update `yaml` to `^2.8.4` and `esbuild` to `^0.28.0` to resolve npm audit security advisories.
- Resolve hover translations for pluralization maps such as `one`/`many` and embed-like YAML sections.
- Detect language keys inside Python triple-quoted strings.
- Avoid assigning decorator strings to the previous Python method context.

## [0.1.1] - 2026-01-03

### Added
- Add contributing guidelines (CONTRIBUTING.md).
- Add security policy (.github/SECURITY.md).

### Changed
- Rename extension display name to "EzCord Utils".

## [0.1.0] - 2026-01-03

### Changed
- Bundle extension code for smaller/faster packaging.

## [0.0.2] - 2026-01-03

### Added
- Language Keys Overview: click a key to open a details view with all translations per language.

### Changed
- Language Keys Overview header separator styling.
- Language Keys Overview section header now shows `<file> keys` instead of "BASE Keys".

### Fixed
- Autocomplete no longer duplicates the prefix when completing already-qualified keys (e.g. `reminder.`).

## [0.0.1] - 2026-01-03

### Added
- YAML language file indexing for EzCord-style i18n keys.
- Hover tooltips for i18n keys in Python string literals.
- Autocomplete for keys while typing in Python.
- Jump-to-definition: open the corresponding YAML file and reveal the key.
- Activity Bar sidebar ("EzCord Utils") with stats and quick actions.
- "Language Keys Overview" webview tab (per active Python file: `<file>.*` + `general.*`) with one-click jump.

### Changed
- None.

### Fixed
- Tolerant parsing for common non-strict YAML quirks.

[0.1.3]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.1.3
[0.1.2]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.1.2
[0.1.1]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.1.1
[0.1.0]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.1.0
[0.0.2]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.0.2
[0.0.1]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.0.1
