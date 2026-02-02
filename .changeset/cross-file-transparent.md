---
"eslint-plugin-react-render-types": minor
---

@transparent annotations now work cross-file. Imported transparent components are automatically discovered via TypeScript's type checker, so settings configuration is only needed for components without JSDoc (e.g., React built-ins like Suspense).
