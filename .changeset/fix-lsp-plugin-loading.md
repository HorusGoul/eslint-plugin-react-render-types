---
"eslint-plugin-react-render-types": patch
---

Fix TypeScript Language Service Plugin not loading in IDEs

TypeScript's tsserver uses Node10-style module resolution (ignoring package.json `exports` maps) when loading plugins. The plugin entry point has been renamed from `/language-service-plugin` to `/lsp` with a CJS proxy file at the package root so tsserver can resolve it.

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "eslint-plugin-react-render-types/lsp" }
    ]
  }
}
```
