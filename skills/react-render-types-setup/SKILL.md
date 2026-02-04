---
name: react-render-types-setup
description: "Install and configure eslint-plugin-react-render-types in a TypeScript React project. Use when: (1) adding eslint-plugin-react-render-types to a project, (2) configuring ESLint flat config with typed linting for @renders support, (3) troubleshooting typed linting errors or plugin configuration, (4) setting up projectService or tsconfig for the plugin, (5) understanding which rules to enable and what they do, or (6) suppressing unused import warnings in the IDE for @renders-referenced components."
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

## IDE Integration: Unused Import Suppression

When a component is imported only for use in a `@renders` annotation, the IDE will grey it out as unused and may auto-remove it on save. The plugin includes a TypeScript Language Service Plugin that suppresses those false positives.

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "eslint-plugin-react-render-types/language-service-plugin" }
    ]
  }
}
```

Then restart the TypeScript server (VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server").

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
