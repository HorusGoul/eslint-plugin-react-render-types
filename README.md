# eslint-plugin-react-render-types

[![npm version](https://img.shields.io/npm/v/eslint-plugin-react-render-types.svg)](https://www.npmjs.com/package/eslint-plugin-react-render-types)
[![CI](https://github.com/HorusGoul/eslint-plugin-react-render-types/actions/workflows/ci.yml/badge.svg)](https://github.com/HorusGoul/eslint-plugin-react-render-types/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An ESLint plugin that brings [Flow's Render Types](https://flow.org/en/docs/react/render-types/) to TypeScript via JSDoc comments. Enforce component composition constraints at lint time.

> [!WARNING]
> This project was recently released and is in active development. APIs may change between minor releases. Feedback, bug reports, and contributions are welcome.

Design systems often need to constrain which components can be rendered in specific contexts — a `Menu` should only accept `MenuItem` children, a `Tabs` component should only render `Tab` components, and so on. This plugin lets you express those constraints with `@renders` JSDoc annotations and validates them at lint time.

```tsx
/** @renders {MenuItem} */
function MyMenuItem({ label }: { label: string }) {
  return <MenuItem>{label}</MenuItem>;  // ✓ Valid
}

interface MenuProps {
  /** @renders {MenuItem} */
  children: React.ReactNode;
}

<Menu>
  <MyMenuItem label="Save" />   {/* ✓ Valid - MyMenuItem renders MenuItem */}
  <Button>Oops</Button>         {/* ✗ Error: Expected MenuItem, got Button */}
</Menu>
```

See the [example project](./example/) for a full dashboard app demonstrating cross-file render type validation with a design system built on React, Vite, and shadcn/ui.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Rules](#rules)
- [JSDoc Syntax](#jsdoc-syntax)
- [IDE Integration](#ide-integration-unused-import-suppression)
- [Limitations](#limitations)
- [Agent Skills](#agent-skills)
- [License](#license)

## Installation

```bash
npm install eslint-plugin-react-render-types --save-dev
# or
pnpm add -D eslint-plugin-react-render-types
# or
yarn add -D eslint-plugin-react-render-types
```

### Peer Dependencies

This plugin requires:
- `eslint` >= 9.0.0
- `@typescript-eslint/parser` >= 8.0.0
- `typescript` >= 5.0.0

## Configuration

### ⚠️ Typed Linting Required

**This plugin requires typed linting.** Without it, the plugin will throw an error.

Typed linting connects ESLint to your TypeScript compiler, giving the plugin access to type information needed for cross-file component identity, render chain resolution, and prop validation.

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import reactRenderTypes from "eslint-plugin-react-render-types";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  reactRenderTypes.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,  // REQUIRED — or use: project: './tsconfig.json'
      },
    },
  },
];
```

For more details on typed linting setup, see the [typescript-eslint documentation](https://typescript-eslint.io/getting-started/typed-linting/).

<details>
<summary>Manual configuration (without recommended preset)</summary>

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
    },
  },
];
```

</details>

### Troubleshooting

1. **"Parsing error: Cannot read file tsconfig.json"** — Ensure the `project` path is correct relative to where ESLint runs

2. **"File is not part of a TypeScript project"** — Add the file to your `tsconfig.json`'s `include` array, or use `projectService: { allowDefaultProject: ['*.tsx'] }`

3. **Performance issues** — Typed linting is slower than regular linting. Run `TIMING=1 eslint .` to identify bottlenecks. For large projects, see [typescript-eslint performance docs](https://typescript-eslint.io/troubleshooting/typed-linting/performance/)

### Settings

#### `additionalTransparentComponents`

Specify component names that should be treated as transparent wrappers. This is useful for built-in components like `Suspense` or third-party components you can't annotate with `@transparent`. String entries look through `children`; object entries specify which props to look through:

```javascript
settings: {
  "react-render-types": {
    additionalTransparentComponents: [
      "Suspense",
      "ErrorBoundary",
      { name: "Flag", props: ["off", "children"] },
    ],
  },
},
```

For member expressions like `<React.Suspense>`, use the dotted form: `"React.Suspense"`.

These work alongside `@transparent` JSDoc annotations — both sources are merged. `@transparent` annotations are resolved cross-file automatically via TypeScript's type checker, so settings are only needed for components you can't annotate with JSDoc.

#### `additionalComponentWrappers`

The plugin recognizes `forwardRef` and `memo` as component wrappers by default. If you use other wrapper functions (e.g., MobX's `observer`, styled-components' `styled`), add them here so the plugin can detect `@renders` annotations on wrapped components:

```javascript
settings: {
  "react-render-types": {
    additionalComponentWrappers: ["observer", "styled"],
  },
},
```

This matches both direct calls (`observer(...)`) and member expressions (`mobx.observer(...)`).

## Rules

| Rule | Default | Description |
|------|---------|-------------|
| [`valid-render-return`](./docs/rules/valid-render-return.md) | `error` | Component return matches its `@renders` declaration |
| [`valid-render-prop`](./docs/rules/valid-render-prop.md) | `error` | Props/children receive compatible components |
| [`valid-renders-jsdoc`](./docs/rules/valid-renders-jsdoc.md) | `warn` | `@renders` syntax is well-formed (braces, PascalCase) |
| [`require-renders-annotation`](./docs/rules/require-renders-annotation.md) | `off` | Requires `@renders` on all components |
| [`renders-uses-vars`](./docs/rules/renders-uses-vars.md) | `error` | Marks `@renders` references as used (prevents `no-unused-vars`) |

## JSDoc Syntax

Annotations work on function declarations, arrow functions, function expressions, and namespaced components (`Menu.Item`).

### `@renders {Component}` - Required

The component **must** render the specified component type.

```tsx
/** @renders {Header} */
function MyHeader() {
  return <Header />;  // ✓ Valid
}

/** @renders {Header} */
function BadHeader() {
  return <Footer />;  // ✗ Error: Expected Header, got Footer
}
```

### `@renders? {Component}` - Optional

The component **may** render the specified component type, or return nothing (`null`, `undefined`, `false`).

```tsx
/** @renders? {Header} */
function MaybeHeader({ show }: { show: boolean }) {
  if (!show) return null;  // ✓ Valid - null allowed
  return <Header />;       // ✓ Valid
}
```

### `@renders* {Component}` - Many

The component **may** render zero or more of the specified component type. Supports arrays, fragments, and null.

```tsx
/** @renders* {MenuItem} */
function MenuItems({ items }: { items: string[] }) {
  return (
    <>
      {items.map(item => <MenuItem key={item}>{item}</MenuItem>)}
    </>
  );  // ✓ Valid - fragment with multiple MenuItems
}
```

### `@renders {A | B}` - Union Types

The component **must** render one of the specified component types. Union types work with all modifiers (`@renders?`, `@renders*`).

```tsx
/** @renders {Header | Footer} */
function LayoutSection({ type }: { type: string }) {
  if (type === "header") return <Header />;  // ✓ Valid
  return <Footer />;                          // ✓ Valid
}
```

You can also use TypeScript type aliases — the plugin resolves them at lint time:

```tsx
type LayoutSlot = Header | Footer | Sidebar;

/** @renders {LayoutSlot} */
function Section({ type }: { type: string }) {
  if (type === "header") return <Header />;
  if (type === "sidebar") return <Sidebar />;
  return <Footer />;
}
```

### `@transparent` - Transparent Components

Transparent components are wrappers that don't affect render type validation. The plugin "looks through" them to validate the actual children being rendered. Without `@transparent`, the plugin would see the wrapper and report an error.

```tsx
/** @transparent */
function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="wrapper">{children}</div>;
}

/** @renders {Header} */
function MyHeader() {
  return (
    <Wrapper>
      <Header />  {/* ✓ Valid - plugin looks through Wrapper */}
    </Wrapper>
  );
}
```

Transparent components can be nested and also work with props validation. `@transparent` annotations work **cross-file** — when you import a transparent component from another file, the plugin automatically discovers its annotation via TypeScript's type checker.

#### Named Prop Transparency

By default, `@transparent` looks through `children`. You can specify which props to look through:

```tsx
/** @transparent {off, children} */
function Flag({ name, off, children }: { name: string; off: React.ReactNode; children: React.ReactNode }) {
  const isEnabled = useFeatureFlag(name);
  return <>{isEnabled ? children : off}</>;
}

<DashboardGrid>
  <Flag name="new-feature" off={<StatCard ... />}>
    <ChartCard ... />  {/* ✓ Both off and children are validated */}
  </Flag>
</DashboardGrid>
```

`@transparent` (bare) and `@transparent {children}` are equivalent.

### `@renders!` - Unchecked

When the plugin can't statically analyze a component's return value (e.g., component registries, dynamic rendering), use `!` to skip return validation while still declaring the render type:

```tsx
/** @renders! {Header} */
function DynamicHeader({ type }: { type: string }) {
  return componentRegistry[type];  // Plugin can't analyze this — no error
}

/** @renders {Header} */
function MyHeader() {
  return <DynamicHeader type="main" />;  // ✓ Valid — DynamicHeader declares it renders Header
}
```

`!` combines with existing modifiers: `@renders! {X}`, `@renders?! {X}`, `@renders*! {X}`.

### Chained Rendering

Components can satisfy render types through other components that themselves have `@renders` annotations:

```tsx
/** @renders {Header} */
function BaseHeader() {
  return <Header size="large" />;
}

/** @renders {Header} */
function StyledHeader() {
  return <BaseHeader />;  // ✓ Valid - chains through BaseHeader → Header
}
```

### Props Validation

Annotate interface properties to enforce render types on props:

```tsx
interface LayoutProps {
  /** @renders {Header} */
  header: React.ReactNode;

  /** @renders? {Footer} */
  footer?: React.ReactNode;
}

<Layout
  header={<Header />}      // ✓ Valid
  footer={null}            // ✓ Valid - optional
/>

<Layout
  header={<div>Oops</div>} // ✗ Error: Expected Header, got div
/>
```

### Expression Patterns

The plugin analyzes expressions in return statements and JSX children:

- Logical AND: `{condition && <Component />}`
- Ternary: `{condition ? <A /> : <B />}`
- `.map()` / `.flatMap()` callbacks: `{items.map(item => <Component />)}`

```tsx
/** @renders? {Header} */
function ConditionalHeader({ show }: { show: boolean }) {
  return show && <Header />;  // ✓ Valid
}

/** @renders* {MenuItem} */
function MenuItems({ items }: { items: string[] }) {
  return <>{items.map(item => <MenuItem key={item} />)}</>;  // ✓ Valid
}
```

## IDE Integration: Language Service Plugin

This plugin includes a TypeScript Language Service Plugin that enhances the IDE experience for `@renders` annotations. Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "eslint-plugin-react-render-types/lsp" }
    ]
  }
}
```

Then restart your TypeScript server (in VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server").

**Features:**

- **Unused import suppression** — Imports referenced only in `@renders` annotations are kept visible and won't be auto-removed by "organize imports"
- **Go-to-definition** — `Cmd+Click` on component names inside `@renders` annotations navigates to the component definition
- **Hover info** — Hovering component names inside `@renders` shows the same type information as hovering the import
- **Diagnostics** — Warns when a component name in `@renders` doesn't resolve to any import or declaration in the file
- **Completions** — Autocompletes component names when typing inside `@renders { }` braces
- **Find references** — "Find All References" on a component includes `@renders` annotation usages across the project
- **Rename** — Renaming a component updates `@renders` annotations that reference it

> **Note:** This is IDE-only — it runs in your editor's TypeScript language service, not during `tsc` CLI builds. For CI, use `@typescript-eslint/no-unused-vars` with the `renders-uses-vars` rule.

## Limitations

- **Dynamic rendering** — Component registries and computed JSX (`componentMap[type]`) can't be statically analyzed. Use `@renders!` to skip return validation while still declaring the render type.
- **`React.lazy`** — Lazy-loaded components can't be statically followed. Use `@renders!` to declare the render type.
- **Higher-order components** — Arbitrary HOC patterns can't be followed. Use `@renders!` on the wrapped component, or add the wrapper to [`additionalComponentWrappers`](#additionalcomponentwrappers) if it follows the same pattern as `forwardRef`/`memo`.
- **Class components** — Only function components are supported.

## Agent Skills

This plugin provides agent skills for AI coding assistants (Claude Code, Cursor, Copilot, and [others](https://skills.sh/)):

```bash
npx skills add HorusGoul/eslint-plugin-react-render-types
```

- **react-render-types-setup** — Install, configure, and troubleshoot the plugin
- **react-render-types-composition** — Patterns for `@renders` annotations, transparent wrappers, render chains, and slot props

## License

MIT
