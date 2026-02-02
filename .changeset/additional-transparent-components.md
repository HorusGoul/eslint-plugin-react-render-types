---
"eslint-plugin-react-render-types": minor
---

Add `additionalTransparentComponents` shared setting with named prop support

- **Configurable transparent components**: New ESLint shared setting `settings["react-render-types"].additionalTransparentComponents` lets users specify component names (e.g., `"Suspense"`, `"ErrorBoundary"`) to treat as transparent without requiring `@transparent` JSDoc annotations.
- **Named prop transparency**: Use `@transparent {off, children}` JSDoc syntax or object format in settings (`{ name: "Flag", props: ["off", "children"] }`) to specify which props the plugin should look through — not just `children`.
- **Both rules supported**: Works with `valid-render-return` and `valid-render-prop` — the plugin looks through configured components to validate their children and named props.
- **Member expression support**: Use dotted names like `"React.Suspense"` for member expression JSX.
- **Merges with JSDoc**: Configured names are merged with `@transparent` annotations found during AST traversal.
