---
"eslint-plugin-react-render-types": minor
---

feat: add diagnostics, completions, find references, and rename support to the language service plugin

- Diagnostics: warn when a component name in `@renders` doesn't resolve to any import or local declaration
- Completions: autocomplete component names when the cursor is inside `@renders { }` braces
- Find references: include `@renders` annotation references when finding all references to a component
- Rename: update `@renders` annotations when renaming a component across the project
