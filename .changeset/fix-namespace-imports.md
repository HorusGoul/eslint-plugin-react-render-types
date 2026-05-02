---
"eslint-plugin-react-render-types": patch
---

Fix namespace import support in @renders validation. Components accessed via `import * as NS from '...'` (e.g., `<NS.Sidebar>`) are now correctly validated by `valid-render-prop` and `valid-renders-jsdoc` rules.
