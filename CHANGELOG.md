# Changelog

All notable changes to this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning.

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
- Autocomplete no longer duplicates the prefix when completing already-qualified keys (e.g. `reminder.`).

[0.0.1]: https://github.com/Lp04-Bruno/ezcord-utils-vsc/releases/tag/v0.0.1
