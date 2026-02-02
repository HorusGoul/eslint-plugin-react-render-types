---
"eslint-plugin-react-render-types": minor
---

Add `additionalTransparentComponents` shared setting

- **Configurable transparent components**: New ESLint shared setting `settings["react-render-types"].additionalTransparentComponents` lets users specify component names (e.g., `"Suspense"`, `"ErrorBoundary"`) to treat as transparent without requiring `@transparent` JSDoc annotations.
- **Both rules supported**: Works with `valid-render-return` and `valid-render-prop` — the plugin looks through configured components to validate their children.
- **Member expression support**: Use dotted names like `"React.Suspense"` for member expression JSX.
- **Merges with JSDoc**: Configured names are merged with `@transparent` annotations found during AST traversal.
