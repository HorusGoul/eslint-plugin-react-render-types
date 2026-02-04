---
name: react-render-types-setup
description: "Install and configure eslint-plugin-react-render-types in a TypeScript React project. Use when: (1) adding eslint-plugin-react-render-types to a project, (2) configuring ESLint flat config with typed linting for @renders support, (3) troubleshooting typed linting errors or plugin configuration, (4) setting up projectService or tsconfig for the plugin, (5) understanding which rules to enable and what they do, or (6) setting up the IDE language service plugin for @renders features (unused import suppression, go-to-definition, hover, completions, find references, rename, diagnostics)."
---

# React Render Types — Setup

Install and configure `eslint-plugin-react-render-types` to enforce component composition constraints at lint time.

## Prerequisites

- ESLint >= 9 (flat config)
- TypeScript >= 5
- `@typescript-eslint/parser` >= 8
- A working `tsconfig.json`

## Install

```bash
npm install eslint-plugin-react-render-types --save-dev
```

## ESLint Configuration

Typed linting is **required** — the plugin uses TypeScript's type checker for cross-file component identity.

### Recommended (extends preset)

```javascript
// eslint.config.js
import tseslint from "typescript-eslint";
import reactRenderTypes from "eslint-plugin-react-render-types";

export default [
  ...tseslint.configs.recommended,
  reactRenderTypes.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
```

### Manual (pick rules individually)

```javascript
// eslint.config.js
import reactRenderTypes from "eslint-plugin-react-render-types";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-render-types": reactRenderTypes,
    },
    rules: {
      "react-render-types/valid-render-return": "error",
      "react-render-types/valid-render-prop": "error",
      "react-render-types/valid-renders-jsdoc": "warn",
      "react-render-types/renders-uses-vars": "error",
    },
  },
];
```

## Typed Linting

Two options — pick one:

**Option 1: `projectService` (recommended)**

```javascript
parserOptions: {
  projectService: true,
}
```

Automatically infers tsconfig for each file.

**Option 2: Explicit `project` path**

```javascript
parserOptions: {
  project: './tsconfig.json',
  // Monorepos: project: ['./tsconfig.json', './packages/*/tsconfig.json'],
}
```

## Rules

| Rule | Default | Purpose |
|------|---------|---------|
| `valid-render-return` | error | Component return matches its `@renders` declaration |
| `valid-render-prop` | error | Props/children receive compatible components |
| `valid-renders-jsdoc` | warn | `@renders` syntax is well-formed (braces, PascalCase) |
| `renders-uses-vars` | error | Prevents `no-unused-vars` on `@renders` references |
| `require-renders-annotation` | off | Requires `@renders` on all components |

### Enabling `require-renders-annotation` for specific paths

```javascript
export default [
  reactRenderTypes.configs.recommended,
  {
    files: ["src/design-system/**/*.tsx"],
    rules: {
      "react-render-types/require-renders-annotation": "error",
    },
  },
];
```

## Settings

### `additionalTransparentComponents`

Specify component names to treat as transparent wrappers without `@transparent` JSDoc. Useful for built-in components like `Suspense` or third-party components you can't annotate. Note that `@transparent` annotations are resolved cross-file automatically, so settings are only needed for components without JSDoc.

String entries default to looking through `children`. Object entries specify which props to look through:

```javascript
// eslint.config.js
export default [
  reactRenderTypes.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true },
    },
    settings: {
      "react-render-types": {
        additionalTransparentComponents: [
          "Suspense",
          "ErrorBoundary",
          { name: "Flag", props: ["off", "children"] },
        ],
      },
    },
  },
];
```

For member expressions like `<React.Suspense>`, use the dotted form: `"React.Suspense"`.

These merge with `@transparent` JSDoc annotations — both sources are combined. `@transparent` annotations work cross-file automatically via TypeScript's type checker.

### `additionalComponentWrappers`

The plugin recognizes `forwardRef` and `memo` as component wrappers by default. If you use other wrapper functions (e.g., MobX's `observer`, styled-components' `styled`), add them so the plugin can detect `@renders` annotations on wrapped components:

```javascript
settings: {
  "react-render-types": {
    additionalComponentWrappers: ["observer", "styled"],
  },
},
```

This matches both direct calls (`observer(...)`) and member expressions (`mobx.observer(...)`).

## IDE Integration: Language Service Plugin

The plugin includes a TypeScript Language Service Plugin that enhances the IDE experience for `@renders` annotations.

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "eslint-plugin-react-render-types/lsp" }
    ]
  }
}
```

Then restart the TypeScript server (VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server").

**Features:**

- **Unused import suppression** — Imports referenced only in `@renders` annotations are kept visible and won't be auto-removed by "organize imports"
- **Go-to-definition** — `Cmd+Click` on component names inside `@renders` annotations navigates to the component definition
- **Hover info** — Hovering component names inside `@renders` shows the same type information as hovering the import
- **Diagnostics** — Warns when a component name in `@renders` doesn't resolve to any import or declaration in the file
- **Completions** — Autocompletes component names when typing inside `@renders { }` braces
- **Find references** — "Find All References" on a component includes `@renders` annotation usages across the project
- **Rename** — Renaming a component updates `@renders` annotations that reference it

**Important**: This is IDE-only — it runs in the editor's TypeScript language service, not during `tsc` CLI builds. For CI, use `@typescript-eslint/no-unused-vars` with the `renders-uses-vars` rule.

## Troubleshooting

| Error | Fix |
|-------|-----|
| Plugin throws without type info | Add `projectService: true` to parserOptions |
| "Cannot read file tsconfig.json" | Check `project` path is correct relative to ESLint CWD |
| "File is not part of a TypeScript project" | Add file to tsconfig `include`, or use `projectService: { allowDefaultProject: ['*.tsx'] }` |
| `no-unused-vars` on `@renders` imports | Ensure `renders-uses-vars` rule is enabled (included in `recommended`) |
| IDE shows unused import for `@renders` reference | Add the language service plugin to `tsconfig.json` `compilerOptions.plugins` (see IDE Integration above) |
| Performance issues | Run `TIMING=1 eslint .` — see [typescript-eslint perf docs](https://typescript-eslint.io/troubleshooting/typed-linting/performance/) |
