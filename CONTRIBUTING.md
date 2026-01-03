# Contributing

Thanks for taking the time to contribute!

## Quick start

- Make sure you’re on the latest `master`.
- Create a branch for your change.
- Run `npm install` and `npm run build`.

## What to include in a PR

- A short description of what and why.
- If you changed behavior or UX: a screenshot or a short GIF is helpful.
- If you touched parsing/indexing: mention what language file patterns you tested.

## Reporting bugs / requesting features

Please open an issue and include:

- VS Code version
- OS
- Extension version
- Steps to reproduce
- (Optional) a small example YAML/Python snippet

## Development notes

- The extension is bundled via esbuild; use `npm run watch` during development.
- Webview assets live in `media/`.
