---
"eslint-plugin-react-render-types": patch
---

Switch package to ESM (`"type": "module"`) for native ESM support. The language service plugin is now emitted as CJS (`.cjs`) since it uses `export =` syntax required by TypeScript's plugin loader.
