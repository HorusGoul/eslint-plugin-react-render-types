---
name: react-render-types-setup
description: "Install and configure eslint-plugin-react-render-types in a TypeScript React project. Use when: (1) adding eslint-plugin-react-render-types to a project, (2) configuring ESLint flat config with typed linting for @renders support, (3) troubleshooting typed linting errors or plugin configuration, (4) setting up projectService or tsconfig for the plugin, or (5) understanding which rules to enable and what they do."
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

## Troubleshooting

| Error | Fix |
|-------|-----|
| Plugin throws without type info | Add `projectService: true` to parserOptions |
| "Cannot read file tsconfig.json" | Check `project` path is correct relative to ESLint CWD |
| "File is not part of a TypeScript project" | Add file to tsconfig `include`, or use `projectService: { allowDefaultProject: ['*.tsx'] }` |
| `no-unused-vars` on `@renders` imports | Ensure `renders-uses-vars` rule is enabled (included in `recommended`) |
| Performance issues | Run `TIMING=1 eslint .` — see [typescript-eslint perf docs](https://typescript-eslint.io/troubleshooting/typed-linting/performance/) |
