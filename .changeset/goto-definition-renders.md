---
"eslint-plugin-react-render-types": minor
---

Add go-to-definition and hover for component names in `@renders` annotations

Cmd+click (or F12) on a component name inside `@renders {Header}` now navigates to the component's definition. Hovering shows the same type information as hovering the import. Supports union types, namespaced components (`Menu.Item`), aliased imports, and locally declared components.
