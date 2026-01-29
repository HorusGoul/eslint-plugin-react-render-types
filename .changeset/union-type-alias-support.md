---
"eslint-plugin-react-render-types": minor
---

Add union type support and type alias resolution for `@renders` annotations.

**Union Types:** Use `@renders {Header | Footer}` to declare that a component may render any of the specified types. Union syntax works with all modifiers (`@renders?`, `@renders*`) and across all rules (`valid-render-return`, `valid-render-prop`, `renders-uses-vars`).

**Type Alias Unions:** Reference a TypeScript type alias in `@renders` and the plugin resolves it at lint time. For example, `type LayoutSlot = Header | Footer` can be used as `@renders {LayoutSlot}`, and the plugin expands it to validate against `Header | Footer`.
