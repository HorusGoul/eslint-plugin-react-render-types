---
"eslint-plugin-react-render-types": minor
---

Improve hover formatting for `@renders` and `@transparent` JSDoc tags

`@renders` tags in hover popups now display component names as clickable links that navigate to the component's definition. Component names are styled as inline code, union types are separated with `|`, and modifiers show descriptive labels in italics (e.g., `@renders?` → *optional*, `@renders*` → *zero or more*). `@transparent` tag props are also formatted as inline code. Falls back to plain markdown when definitions can't be resolved.
