# TODO Comments Feature

## Overview

The TODO Comments feature detects and tracks TODO, FIXME, BUG, and HACK comments throughout your codebase. All TODOs are automatically organized in a tree view for easy navigation.

## Features

✅ **Detects TODO comments** in multiple languages:
- Java, Kotlin, Python, JavaScript, TypeScript, C++, HTML, CSS, C#, Go, Rust, Lua, SQL, Ruby, Shell, YAML, XML, and more

🎯 **Tree view** with all TODOs in your project
- Organized by filename
- Shows line numbers
- Quick overview of all tasks

🔍 **Double-click navigation**
- Click any TODO to jump directly to its location in the editor
- Automatically centers the TODO in the viewport

➕ **Automatic comment syntax detection**
- Supports multiple comment styles automatically

🔄 **Refresh functionality**
- Refresh button in the TODO view toolbar
- Automatically re-scans for new TODOs

## Supported Comment Styles

| Comment Style | Languages |
|---|---|
| `//` | Java, Kotlin, JavaScript, TypeScript, C++, C#, CSS, Go, Rust |
| `#` | Python, Shell, YAML, Ruby, Dockerfile, Makefile, Perl |
| `<!--` | HTML, XML |
| `--` | Lua, SQL |

## Supported TODO Tags

- `TODO`
- `FIXME`
- `BUG`
- `HACK`

## Usage

1. **View TODOs**: Open the "TODO Comments" view in the EzCord sidebar (or use the activity bar)

2. **Navigate**: Double-click any TODO item to jump to its location in the editor

3. **Refresh**: Click the refresh button (🔄) in the TODO view toolbar to rescan for new TODOs

4. **Examples**:
   ```python
   # TODO: Implement user authentication
   # FIXME: This function is too slow
   # BUG: Memory leak in event handler
   ```

   ```javascript
   // TODO: Add error handling
   // FIXME: Deprecated API usage
   // HACK: Temporary workaround for browser compatibility
   ```

   ```html
   <!-- TODO: Update styling -->
   <!-- FIXME: Accessibility improvements needed -->
   ```

## How to Create TODOs

Simply add a comment with `TODO`, `FIXME`, `BUG`, or `HACK` followed by your note:

**Python/Shell/YAML:**
```python
# TODO: Implement feature
```

**JavaScript/TypeScript/Java/Kotlin/C++/CSS:**
```javascript
// TODO: Implement feature
```

**HTML/XML:**
```html
<!-- TODO: Implement feature -->
```

**Lua/SQL:**
```lua
-- TODO: Implement feature
```

## Performance

The TODO scanner:
- Automatically excludes common directories (node_modules, .git, dist, build, etc.)
- Scans workspace on activation and when using the refresh button
- Ignores hidden directories and files

## Tips

- Use `TODO:` with a colon for better readability
- Include context in your notes: `// TODO: Add validation when user count exceeds limit`
- Use `FIXME` for bugs that need urgent attention
- Use `HACK` for temporary solutions that need refactoring
