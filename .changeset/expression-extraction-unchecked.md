---
"eslint-plugin-react-render-types": minor
---

Add expression extraction and `@renders!` unchecked flag

- **Expression extraction**: The plugin now analyzes expressions inside transparent wrappers and return statements, including ternaries (`cond ? <A /> : <B />`), logical AND (`cond && <A />`), `.map()`/`.flatMap()` callbacks, and JSX fragment children.
- **`@renders!` unchecked flag**: Skip return validation when the plugin can't statically analyze a return value. Composable with existing modifiers: `@renders!`, `@renders?!`, `@renders*!`. The component still declares its render type for chain resolution.
