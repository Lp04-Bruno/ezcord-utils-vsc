# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning.

## [0.1.2] - 2026-01-03

### Changed
- Python key parsing is now AST-based (Lezer) for more robust string detection (e.g. f-strings, triple quotes, multiline).
- Unified translation candidate resolution across Hover, Completion, and Jump-to-YAML to avoid prefix-heuristic mismatches (file/class/function/general) and treats `_`/`-` as equivalent.
- Improved Python completions ranking: keys are now ordered by the most specific matching scope prefix (file → class → function), so the most relevant suggestions appear first.
- VS Code debug task: update `watch` task problem matcher for esbuild so launching no longer hangs on "Waiting for preLaunchTask 'watch'…".

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

[0.1.2]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.1.2
[0.1.1]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.1.1
[0.1.0]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.1.0
[0.0.2]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.0.2
[0.0.1]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.0.1
